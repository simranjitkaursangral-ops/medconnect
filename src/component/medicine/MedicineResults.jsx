import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

import {
  collection,
  onSnapshot,
  query,
  where
} from "firebase/firestore";

import { db } from "../../firebase/Firebase";


function calculateDistance(lat1, lon1, lat2, lon2) {
  const earthRadius = 6371;

  const toRadians = (value) => (value * Math.PI) / 180;

  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return earthRadius * c;
}



// Free, browser-based smart matching. It compares the user's words with
// medicine details already saved in Firestore; it does not invent synonyms.
function normalizeSearchText(value) {
  return String(value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/(\d)(mg|mcg|ml|gm|g)\b/g, "$1 $2")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function getEditDistance(first, second) {
  const rows = first.length + 1;
  const columns = second.length + 1;
  const table = Array.from({ length: rows }, () =>
    Array(columns).fill(0)
  );

  for (let row = 0; row < rows; row += 1) table[row][0] = row;
  for (let column = 0; column < columns; column += 1) {
    table[0][column] = column;
  }

  for (let row = 1; row < rows; row += 1) {
    for (let column = 1; column < columns; column += 1) {
      const cost = first[row - 1] === second[column - 1] ? 0 : 1;

      table[row][column] = Math.min(
        table[row - 1][column] + 1,
        table[row][column - 1] + 1,
        table[row - 1][column - 1] + cost
      );
    }
  }

  return table[rows - 1][columns - 1];
}

function getMedicineSearchScore(medicine, searchText) {
  const queryText = normalizeSearchText(searchText);
  if (!queryText) return 1;

  const searchableFields = [
    medicine.medicineName,
    medicine.brand,
    medicine.manufacturer,
    medicine.composition,
    medicine.category,
    medicine.dosage,
    medicine.dosageForm,
    medicine.packSize,
    medicine.description,
    medicine.uses
  ];

  const searchableText = normalizeSearchText(
    searchableFields.filter(Boolean).join(" ")
  );

  if (!searchableText) return 0;
  if (searchableText.includes(queryText)) return 100;

  const ignoredWords = new Set([
    "a", "an", "the", "is", "are", "do", "does", "you", "have",
    "show", "me", "find", "need", "want", "please", "medicine",
    "medicines", "tablet", "tablets", "available", "availability",
    "near", "my"
  ]);

  const queryWords = queryText
    .split(" ")
    .filter((word) => word && !ignoredWords.has(word));

  if (queryWords.length === 0) return 0;

  const medicineWords = searchableText.split(" ").filter(Boolean);
  let totalScore = 0;

  for (const queryWord of queryWords) {
    let bestScore = 0;

    for (const medicineWord of medicineWords) {
      if (medicineWord === queryWord) {
        bestScore = 1;
        break;
      }

      if (
        medicineWord.startsWith(queryWord) ||
        queryWord.startsWith(medicineWord)
      ) {
        bestScore = Math.max(bestScore, 0.92);
        continue;
      }

      // Avoid speculative fuzzy matches for very short words/numbers.
      if (queryWord.length < 4 || medicineWord.length < 4) continue;
      if (Math.abs(queryWord.length - medicineWord.length) > 2) continue;

      const distance = getEditDistance(queryWord, medicineWord);
      const similarity =
        1 - distance / Math.max(queryWord.length, medicineWord.length);

      if (similarity >= 0.72) {
        bestScore = Math.max(bestScore, similarity);
      }
    }

    // Every meaningful search word must match to avoid unrelated results.
    if (bestScore === 0) return 0;
    totalScore += bestScore;
  }

  return (totalScore / queryWords.length) * 90;
}

function MedicineResults() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const medicineQuery = searchParams.get("medicine") || "";
  const cityQuery = searchParams.get("city") || "";
  const stateQuery = searchParams.get("state") || "";

  const [medicines, setMedicines] = useState([]);
  const [pharmacies, setPharmacies] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [sortBy, setSortBy] = useState("relevant");
  const [availabilityFilter, setAvailabilityFilter] = useState("all");

  const [userLocation, setUserLocation] = useState(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState("");

  useEffect(() => {
    let medicinesLoaded = false;
    let pharmaciesLoaded = false;

    const checkLoading = () => {
      if (medicinesLoaded && pharmaciesLoaded) {
        setLoading(false);
      }
    };

    const unsubscribeMedicines = onSnapshot(
      collection(db, "medicines"),
      (snapshot) => {
        const data = snapshot.docs.map((document) => ({
          id: document.id,
          ...document.data()
        }));

        setMedicines(data);
        medicinesLoaded = true;
        checkLoading();
      },
      (err) => {
        console.error("Medicine loading error:", err);
        setError("Unable to load medicine listings.");
        setLoading(false);
      }
    );

    // Fetch only approved pharmacies to match Firestore read permissions.
    const approvedPharmaciesQuery = query(
      collection(db, "pharmacies"),
      where("status", "==", "approved")
    );

    const unsubscribePharmacies = onSnapshot(
      approvedPharmaciesQuery,
      (snapshot) => {
        const data = snapshot.docs.map((document) => ({
          id: document.id,
          ...document.data()
        }));

        setPharmacies(data);
        pharmaciesLoaded = true;
        checkLoading();
      },
      (err) => {
        console.error("Pharmacy loading error:", err);
        setError("Unable to load approved pharmacy details.");
        setLoading(false);
      }
    );

    return () => {
      unsubscribeMedicines();
      unsubscribePharmacies();
    };
  }, []);

  const getCurrentLocation = () => {
    setLocationError("");

    if (!navigator.geolocation) {
      setLocationError(
        "Your browser does not support location detection."
      );
      return;
    }

    setLocationLoading(true);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        });

        setLocationLoading(false);
      },
      (err) => {
        console.error("Location error:", err);

        setLocationLoading(false);

        if (err.code === 1) {
          setLocationError(
            "Please allow location permission to calculate distances."
          );
        } else {
          setLocationError(
            "Unable to detect your location. Please try again."
          );
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  };

  const getPharmacy = (medicine) => {
    return pharmacies.find(
      (pharmacy) => pharmacy.id === medicine.pharmacyId
    );
  };

  const getPharmacyDetails = (medicine) => {
    const pharmacy = getPharmacy(medicine);

    return {
      ...pharmacy,

      name:
        pharmacy?.name ||
        medicine.pharmacyName ||
        "Registered Pharmacy",

      address:
        pharmacy?.address ||
        medicine.pharmacyAddress ||
        "",

      city:
        pharmacy?.city ||
        medicine.pharmacyCity ||
        "",

      state:
        pharmacy?.state ||
        medicine.pharmacyState ||
        "",

      phone:
        pharmacy?.phone ||
        medicine.pharmacyPhone ||
        "",

      latitude: pharmacy?.latitude,
      longitude: pharmacy?.longitude
    };
  };

  const isApproved = (medicine) => {
    const pharmacy = getPharmacy(medicine);

    if (!pharmacy) {
      return false;
    }

    return (
      String(pharmacy.status || "").toLowerCase() === "approved"
    );
  };

  const isAvailable = (medicine) => {
    return (
      Number(medicine.quantity) > 0 &&
      medicine.availability !== "Out of Stock"
    );
  };

  const getDistance = (medicine) => {
    if (!userLocation) return null;

    const pharmacy = getPharmacyDetails(medicine);

    const latitude = Number(pharmacy.latitude);
    const longitude = Number(pharmacy.longitude);

    if (
      !Number.isFinite(latitude) ||
      !Number.isFinite(longitude) ||
      pharmacy.latitude === undefined ||
      pharmacy.longitude === undefined ||
      pharmacy.latitude === "" ||
      pharmacy.longitude === ""
    ) {
      return null;
    }

    return calculateDistance(
      userLocation.latitude,
      userLocation.longitude,
      latitude,
      longitude
    );
  };

  const getDiscount = (medicine) => {
    const mrp = Number(medicine.mrp);
    const price = Number(medicine.price);

    if (
      !Number.isFinite(mrp) ||
      !Number.isFinite(price) ||
      mrp <= 0 ||
      price >= mrp
    ) {
      return 0;
    }

    return Math.round(((mrp - price) / mrp) * 100);
  };

  const getStockStatus = (medicine) => {
    if (!isAvailable(medicine)) {
      return "Out of Stock";
    }

    if (Number(medicine.quantity) <= 5) {
      return "Only few left";
    }

    return "Available";
  };

  const getStockFreshness = (medicine) => {
    if (medicine.stockVerificationStatus === "Fresh") {
      return "Recently verified stock";
    }

    if (medicine.stockVerifiedAt || medicine.stockUpdatedAt) {
      return "Stock information updated";
    }

    return "Stock verification not available";
  };

  const filteredMedicines = useMemo(() => {
    let result = medicines.filter(isApproved);

    const normalizedMedicine = medicineQuery.trim();
    const normalizedCity = cityQuery.trim().toLowerCase();
    const normalizedState = stateQuery.trim().toLowerCase();

    if (normalizedMedicine) {
      result = result
        .map((item) => ({
          ...item,
          _smartSearchScore: getMedicineSearchScore(item, normalizedMedicine)
        }))
        .filter((item) => item._smartSearchScore > 0);

      // Put the closest text matches first when the user selects Relevance.
      if (sortBy === "relevant") {
        result.sort(
          (first, second) =>
            second._smartSearchScore - first._smartSearchScore
        );
      }
    }

    if (normalizedCity) {
      result = result.filter((item) => {
        const pharmacy = getPharmacyDetails(item);

        return (
          String(pharmacy.city || "").trim().toLowerCase() ===
          normalizedCity
        );
      });
    }

    if (normalizedState) {
      result = result.filter((item) => {
        const pharmacy = getPharmacyDetails(item);

        return (
          String(pharmacy.state || "").trim().toLowerCase() ===
          normalizedState
        );
      });
    }

    if (availabilityFilter === "available") {
      result = result.filter(isAvailable);
    }

    if (availabilityFilter === "out") {
      result = result.filter((item) => !isAvailable(item));
    }

    if (sortBy === "price-low") {
      result.sort(
        (a, b) => Number(a.price || 0) - Number(b.price || 0)
      );
    }

    if (sortBy === "price-high") {
      result.sort(
        (a, b) => Number(b.price || 0) - Number(a.price || 0)
      );
    }

    if (sortBy === "available") {
      result.sort(
        (a, b) => Number(isAvailable(b)) - Number(isAvailable(a))
      );
    }

    if (sortBy === "nearest" && userLocation) {
      result.sort((a, b) => {
        const distanceA = getDistance(a);
        const distanceB = getDistance(b);

        if (distanceA === null) return 1;
        if (distanceB === null) return -1;

        return distanceA - distanceB;
      });
    }

    return result;
  }, [
    medicines,
    pharmacies,
    medicineQuery,
    cityQuery,
    stateQuery,
    availabilityFilter,
    sortBy,
    userLocation
  ]);

  const availableCount = filteredMedicines.filter(isAvailable).length;

  const handleRequest = (item) => {
    const pharmacy = getPharmacyDetails(item);

    const params = new URLSearchParams();

    params.set("medicine", item.medicineName || medicineQuery);

    if (item.dosage) {
      params.set("dosage", item.dosage);
    }

    if (item.pharmacyId) {
      params.set("pharmacyId", item.pharmacyId);
    }
    if (item.price) {
      params.set("price", item.price);
    }

    if (pharmacy.name) {
      params.set("pharmacyName", pharmacy.name);
    }

    navigate(`/request-medicine?${params.toString()}`);
  };

  const formatDistance = (distance) => {
    if (distance === null) {
      return "Distance unavailable";
    }

    if (distance < 1) {
      return `${Math.round(distance * 1000)} m away`;
    }

    return `${distance.toFixed(1)} km away`;
  };

  if (loading) {
    return (
      <main className="mr-page">
        <div className="mr-loading">
          <div className="mr-spinner"></div>
          <h3>Finding medicines near you...</h3>
          <p>Checking pharmacy availability.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="mr-page">
      <div className="mr-wrapper">

        <div className="mr-breadcrumb">
          <span onClick={() => navigate("/")}>Home</span>
          <span>/</span>
          <span onClick={() => navigate("/search")}>
            Medicine Search
          </span>
          <span>/</span>
          <strong>Results</strong>
        </div>

        <section className="mr-heading">
          <div>
            <span className="mr-eyebrow">
              MEDCONNECT MEDICINE FINDER
            </span>

            <h1>
              Search results for{" "}
              <span>{medicineQuery || "Medicines"}</span>
            </h1>

            <p>
              Compare medicine availability, prices and nearby pharmacies.
            </p>
          </div>

          <button
            className="mr-change-search"
            onClick={() => navigate("/search")}
          >
            ← Change search
          </button>
        </section>

        <section className="mr-location-bar">
          <div className="mr-location-symbol">⌖</div>

          <div>
            <small>SEARCH LOCATION</small>
            <strong>
              {[cityQuery, stateQuery].filter(Boolean).join(", ") ||
                "All locations"}
            </strong>
          </div>

          <button onClick={() => navigate("/search")}>
            Change location
          </button>
        </section>

        <section className="mr-distance-panel">
          <div>
            <strong>Find pharmacies closest to you</strong>
            <p>
              Use your current location to calculate the distance to each
              pharmacy.
            </p>
          </div>

          <button
            type="button"
            onClick={getCurrentLocation}
            disabled={locationLoading}
          >
            {locationLoading
              ? "Detecting..."
              : userLocation
                ? "Refresh location"
                : "⌖ Use my location"}
          </button>
        </section>

        {locationError && (
          <div className="mr-location-error">
            {locationError}
          </div>
        )}

        {error && (
          <div className="mr-error">
            {error}
          </div>
        )}

        <section className="mr-results-summary">
          <div>
            <h2>Available pharmacy listings</h2>
            <p>
              {filteredMedicines.length} matching listings found
            </p>
            <small style={{ color: "#64748b" }}>
              Smart matching checks medicine names, brands, composition and common spelling mistakes.
            </small>
          </div>

          <div className="mr-summary-available">
            <span className="mr-summary-dot"></span>
            {availableCount} available
          </div>
        </section>

        <section className="mr-filter-bar">
          <div className="mr-filter-left">
            <span>Filter:</span>

            <button
              className={
                availabilityFilter === "all" ? "active" : ""
              }
              onClick={() => setAvailabilityFilter("all")}
            >
              All
            </button>

            <button
              className={
                availabilityFilter === "available" ? "active" : ""
              }
              onClick={() => setAvailabilityFilter("available")}
            >
              Available
            </button>

            <button
              className={
                availabilityFilter === "out" ? "active" : ""
              }
              onClick={() => setAvailabilityFilter("out")}
            >
              Out of stock
            </button>
          </div>

          <div className="mr-sort">
            <label htmlFor="mrSort">Sort by</label>

            <select
              id="mrSort"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
            >
              <option value="relevant">Relevance</option>
              <option value="available">Availability</option>
              <option value="price-low">Price: Low to High</option>
              <option value="price-high">Price: High to Low</option>

              {userLocation && (
                <option value="nearest">Nearest First</option>
              )}
            </select>
          </div>
        </section>

        {filteredMedicines.length > 0 ? (
          <section className="mr-medicine-list">

            {filteredMedicines.map((item) => {
              const available = isAvailable(item);
              const pharmacy = getPharmacyDetails(item);
              const distance = getDistance(item);

              const discount = getDiscount(item);

              const imageUrl = item.imageUrl || item.image || "";

              return (
                <article className="mr-medicine-card" key={item.id}>

                  <div className="mr-medicine-image">
                    {imageUrl ? (
                      <img
                        src={imageUrl}
                        alt={item.medicineName || "Medicine"}
                        onError={(e) => {
                          e.currentTarget.style.display = "none";
                          e.currentTarget.nextSibling.style.display =
                            "flex";
                        }}
                      />
                    ) : null}

                    <div
                      className="mr-medicine-symbol"
                      style={{
                        display: imageUrl ? "none" : "flex"
                      }}
                    >
                      ✚
                    </div>

                    <span>MEDICINE</span>
                  </div>

                  <div className="mr-medicine-content">

                    <div className="mr-medicine-top">
                      <div>
                        <span className="mr-category">
                          {item.category || "Medicine"}
                        </span>

                        <h3>{item.medicineName}</h3>

                        {item.brand && (
                          <p className="mr-brand">
                            Brand: {item.brand}
                          </p>
                        )}

                        {item.dosage && (
                          <p className="mr-dosage">
                            {item.dosage}
                          </p>
                        )}

                        {(item.manufacturer || item.packSize) && (
                          <div className="mr-product-meta">
                            {item.manufacturer && (
                              <span>{item.manufacturer}</span>
                            )}

                            {item.packSize && (
                              <span>{item.packSize}</span>
                            )}

                            {item.dosageForm && (
                              <span>{item.dosageForm}</span>
                            )}
                          </div>
                        )}
                      </div>

                      <span
                        className={`mr-stock-badge ${
                          available ? "in-stock" : "out-stock"
                        }`}
                      >
                        <span></span>
                        {getStockStatus(item)}
                      </span>
                    </div>

                    {item.composition && (
                      <p className="mr-composition">
                        <strong>Composition:</strong>{" "}
                        {item.composition}
                      </p>
                    )}

                    {item.description && (
                      <p className="mr-description">
                        {item.description}
                      </p>
                    )}

                    <div className="mr-pharmacy-info">
                      <div className="mr-pharmacy-icon">✚</div>

                      <div className="mr-pharmacy-details">
                        <strong>{pharmacy.name}</strong>

                        <span>
                          {[
                            pharmacy.address,
                            pharmacy.city,
                            pharmacy.state
                          ]
                            .filter(Boolean)
                            .join(", ") || "Address not available"}
                        </span>

                        {pharmacy.phone && (
                          <span>Contact: {pharmacy.phone}</span>
                        )}

                        <span className="mr-distance-label">
                          ⌖ {formatDistance(distance)}
                        </span>
                      </div>
                    </div>

                    <div className="mr-stock-freshness">
                      <span className="mr-freshness-dot"></span>
                      {getStockFreshness(item)}
                    </div>

                    <div className="mr-card-bottom">

                      <div className="mr-price-section">
                        <small>SELLING PRICE</small>

                        <div className="mr-price-line">
                          <strong>
                            ₹{Number(item.price || 0).toFixed(2)}
                          </strong>

                          {discount > 0 && (
                            <span className="mr-discount">
                              {discount}% OFF
                            </span>
                          )}
                        </div>

                        {Number(item.mrp) > 0 && (
                          <span className="mr-mrp">
                            MRP: ₹{Number(item.mrp).toFixed(2)}
                          </span>
                        )}

                        <span>
                          {available
                            ? `${item.quantity} units in stock`
                            : "Currently unavailable"}
                        </span>
                      </div>

                      <div className="mr-card-actions">
                        <button
                          className="mr-view-pharmacy"
                          onClick={() =>
                            navigate(`/pharmacy/${item.pharmacyId}`)
                          }
                          disabled={!item.pharmacyId}
                        >
                          View Pharmacy
                        </button>

                        <button
                          className="mr-request-button"
                          onClick={() => handleRequest(item)}
                        >
                          Request Medicine →
                        </button>
                      </div>

                    </div>

                  </div>
                </article>
              );
            })}

          </section>
        ) : (
          <section className="mr-no-results">
            <div className="mr-no-results-icon">⌕</div>

            <h2>No matching medicines found</h2>

            <p>
              We couldn't find this medicine in the selected location.
              Try changing your location or search for another medicine.
            </p>

            <div className="mr-no-results-actions">
              <button onClick={() => navigate("/search")}>
                Search again
              </button>

              <button
                onClick={() =>
                  navigate(
                    `/request-medicine?medicine=${encodeURIComponent(
                      medicineQuery
                    )}`
                  )
                }
              >
                Request this medicine
              </button>
            </div>
          </section>
        )}

        <section className="mr-help-banner">
          <div>
            <h3>Still unable to find your medicine?</h3>
            <p>
              Send a medicine request and let pharmacies respond to you.
            </p>
          </div>

          <button
            onClick={() =>
              navigate(
                `/request-medicine?medicine=${encodeURIComponent(
                  medicineQuery
                )}`
              )
            }
          >
            Request a medicine →
          </button>
        </section>

      </div>
    </main>
  );
}

export default MedicineResults;