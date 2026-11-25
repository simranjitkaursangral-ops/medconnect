import { useEffect, useState } from "react";
import {
  collection,
  doc,
  getDoc,
  getDocs
} from "firebase/firestore";
import {
  Link,
  useNavigate,
  useParams
} from "react-router-dom";

import { db } from "../../firebase/Firebase";

function PharmacyDetails() {
  const { pharmacyId } = useParams();
  const navigate = useNavigate();

  const [pharmacy, setPharmacy] = useState(null);
  const [medicines, setMedicines] = useState([]);
  const [searchText, setSearchText] = useState("");
  const [userLocation, setUserLocation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState("");
  const [error, setError] = useState("");

  const getDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371;

    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) ** 2;

    const c =
      2 *
      Math.atan2(
        Math.sqrt(a),
        Math.sqrt(1 - a)
      );

    return R * c;
  };

  const getUserLocation = () => {
    if (!navigator.geolocation) {
      setLocationError(
        "Location is not supported by your browser."
      );
      return;
    }

    setLocationLoading(true);
    setLocationError("");

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        });

        setLocationLoading(false);
      },
      () => {
        setLocationError(
          "Location permission was not enabled."
        );

        setLocationLoading(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  };

  useEffect(() => {
    getUserLocation();
  }, []);

  useEffect(() => {
    const loadPharmacy = async () => {
      try {
        setLoading(true);
        setError("");
        setPharmacy(null);
        setMedicines([]);

        if (!pharmacyId) {
          setError("Pharmacy not found.");
          return;
        }

        const pharmacyDoc = await getDoc(
          doc(db, "pharmacies", pharmacyId)
        );

        if (!pharmacyDoc.exists()) {
          setError("Pharmacy not found.");
          return;
        }

        const pharmacyData = {
          id: pharmacyDoc.id,
          ...pharmacyDoc.data()
        };

        // Handle different capitalization and spaces in status.
        const pharmacyStatus = String(
          pharmacyData.status || ""
        )
          .trim()
          .toLowerCase();

        if (pharmacyStatus !== "approved") {
          setError(
            "This pharmacy is not currently available on MedConnect."
          );
          return;
        }

        setPharmacy(pharmacyData);

        const medicineSnapshot = await getDocs(
          collection(db, "medicines")
        );

        const pharmacyMedicines = [];

        medicineSnapshot.forEach((medicineDoc) => {
          const medicine = medicineDoc.data();

          if (medicine.pharmacyId !== pharmacyId) {
            return;
          }

          pharmacyMedicines.push({
            id: medicineDoc.id,
            ...medicine
          });
        });

        pharmacyMedicines.sort((a, b) =>
          (a.medicineName || "").localeCompare(
            b.medicineName || ""
          )
        );

        setMedicines(pharmacyMedicines);
      } catch (err) {
        console.error("PHARMACY DETAILS ERROR:", err);

        setError(
          "Unable to load pharmacy details."
        );
      } finally {
        setLoading(false);
      }
    };

    loadPharmacy();
  }, [pharmacyId]);

  const getPharmacyDistance = () => {
    if (
      !userLocation ||
      !pharmacy ||
      pharmacy.latitude === undefined ||
      pharmacy.longitude === undefined
    ) {
      return null;
    }

    const latitude = Number(pharmacy.latitude);
    const longitude = Number(pharmacy.longitude);

    if (
      Number.isNaN(latitude) ||
      Number.isNaN(longitude)
    ) {
      return null;
    }

    return getDistance(
      userLocation.latitude,
      userLocation.longitude,
      latitude,
      longitude
    );
  };

  const handleOpenDirections = () => {
    if (!userLocation && navigator.geolocation) {
      getUserLocation();
    }

    const hasLatLong =
      pharmacy?.latitude !== undefined &&
      pharmacy?.latitude !== null &&
      pharmacy?.latitude !== "" &&
      pharmacy?.longitude !== undefined &&
      pharmacy?.longitude !== null &&
      pharmacy?.longitude !== "" &&
      !Number.isNaN(Number(pharmacy.latitude)) &&
      !Number.isNaN(Number(pharmacy.longitude));

    let destination = "";
    if (hasLatLong) {
      destination = `${Number(pharmacy.latitude)},${Number(pharmacy.longitude)}`;
    } else {
      const addressParts = [
        pharmacy?.name,
        pharmacy?.address,
        pharmacy?.city,
        pharmacy?.state
      ]
        .map((part) => String(part || "").trim())
        .filter(Boolean);

      destination = addressParts.join(", ");
    }

    if (!destination) {
      alert("Pharmacy location details are unavailable.");
      return;
    }

    let mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
      destination
    )}`;

    if (userLocation?.latitude && userLocation?.longitude) {
      mapsUrl += `&origin=${userLocation.latitude},${userLocation.longitude}`;
    }

    window.open(mapsUrl, "_blank", "noopener,noreferrer");
  };

  const filteredMedicines = medicines.filter(
    (medicine) =>
      (medicine.medicineName || "")
        .toLowerCase()
        .includes(searchText.trim().toLowerCase())
  );

  const availableCount = medicines.filter(
    (medicine) =>
      Number(medicine.quantity) > 0 &&
      medicine.availability !== "Out of Stock"
  ).length;

  if (loading) {
    return (
      <div className="pharmacy-details-loading">
        <div className="pharmacy-loading-spinner"></div>

        <h3>Loading pharmacy...</h3>

        <p>
          Please wait while we load
          pharmacy information and
          medicine availability.
        </p>
      </div>
    );
  }

  if (error || !pharmacy) {
    return (
      <div className="pharmacy-details-error">
        <div className="pharmacy-error-icon">
          🏥
        </div>

        <h2>Pharmacy not available</h2>

        <p>
          {error ||
            "The pharmacy you are looking for does not exist."}
        </p>

        <Link
          to="/search"
          className="back-search-btn"
        >
          Back to Search
        </Link>
      </div>
    );
  }

  const distance = getPharmacyDistance();

  return (
    <main className="pharmacy-details-page">
      <div className="pharmacy-details-container">

        <Link
          to="/results"
          className="pharmacy-back-link"
        >
          ← Back to Results
        </Link>

        <section className="pharmacy-details-hero">
          <div className="pharmacy-details-main">

            <div className="pharmacy-details-icon">
              🏥
            </div>

            <div className="pharmacy-details-title">

              <span className="pharmacy-verified">
                ✓ VERIFIED PHARMACY
              </span>

              <h1>
                {pharmacy.name || "Pharmacy"}
              </h1>

              <p>
                {pharmacy.address || "Address unavailable"}
              </p>

              <span className="pharmacy-city">
                {pharmacy.city || ""}
                {pharmacy.state
                  ? `, ${pharmacy.state}`
                  : ""}
              </span>

            </div>
          </div>

          <div className="pharmacy-hero-distance-card">
            <div
              className="pharmacy-distance-box clickable"
              onClick={handleOpenDirections}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  handleOpenDirections();
                }
              }}
              title="Click to open route and directions in Google Maps"
            >
              <span>📍</span>

              <div>
                <small>Distance from you</small>

                <strong>
                  {distance !== null
                    ? `${distance.toFixed(1)} km`
                    : userLocation
                    ? "Distance unavailable"
                    : "Location unavailable"}
                </strong>
              </div>
            </div>

            <button
              type="button"
              className="pharmacy-distance-open-btn"
              onClick={handleOpenDirections}
              title="Open directions and distance from your location to this pharmacy"
            >
              <span>🧭</span>
              <span>Open Distance in Maps ↗</span>
            </button>
          </div>
        </section>

        <div className="pharmacy-location-banner">

          <div className="pharmacy-location-icon">
            📍
          </div>

          <div className="pharmacy-location-text">

            <strong>
              {userLocation
                ? distance !== null
                  ? `Distance: ${distance.toFixed(1)} km from your location`
                  : "Distance calculated from your location"
                : "Location is not enabled"}
            </strong>

            <span>
              {userLocation
                ? "Click below to view the route, travel time, and live navigation in Google Maps."
                : "Enable your location or click to view directions to this pharmacy."}
            </span>

          </div>

          <div className="pharmacy-location-banner-actions">
            {!userLocation && (
              <button
                type="button"
                className="pharmacy-location-btn"
                onClick={getUserLocation}
                disabled={locationLoading}
              >
                {locationLoading
                  ? "Getting Location..."
                  : "Enable Location"}
              </button>
            )}

            <button
              type="button"
              className="pharmacy-directions-banner-btn"
              onClick={handleOpenDirections}
            >
              <span>🗺️</span>
              <span>Open Distance & Route ↗</span>
            </button>
          </div>
        </div>

        {locationError && (
          <div className="pharmacy-location-error">
            {locationError}
          </div>
        )}

        <section className="pharmacy-info-grid">

          <div className="pharmacy-info-card">
            <div className="pharmacy-info-icon">
              📞
            </div>

            <div>
              <span>PHONE</span>

              <strong>
                {pharmacy.phone || "Not available"}
              </strong>
            </div>
          </div>

          <div className="pharmacy-info-card">
            <div className="pharmacy-info-icon">
              📍
            </div>

            <div>
              <span>LOCATION</span>

              <strong>
                {pharmacy.city || "Not available"}
              </strong>

              <button
                type="button"
                className="pharmacy-info-directions-btn"
                onClick={handleOpenDirections}
              >
                Open Distance & Map ↗
              </button>
            </div>
          </div>

          <div className="pharmacy-info-card">
            <div className="pharmacy-info-icon">
              💊
            </div>

            <div>
              <span>TOTAL MEDICINES</span>

              <strong>{medicines.length}</strong>
            </div>
          </div>

          <div className="pharmacy-info-card">
            <div className="pharmacy-info-icon">
              ✓
            </div>

            <div>
              <span>AVAILABLE</span>

              <strong>{availableCount}</strong>
            </div>
          </div>

        </section>

        <section className="pharmacy-inventory">

          <div className="pharmacy-inventory-header">
            <div>

              <span className="pharmacy-section-label">
                MEDICINE INVENTORY
              </span>

              <h2>
                Medicines available at this pharmacy
              </h2>

              <p>
                Search the pharmacy inventory
                and check current stock and
                prices.
              </p>

            </div>

            <div className="pharmacy-medicine-count">
              {medicines.length} Medicines
            </div>
          </div>

          <div className="pharmacy-inventory-search">

            <span>🔍</span>

            <input
              type="text"
              placeholder="Search medicine in this pharmacy..."
              value={searchText}
              onChange={(e) =>
                setSearchText(e.target.value)
              }
            />

            {searchText && (
              <button
                type="button"
                onClick={() => setSearchText("")}
              >
                ✕
              </button>
            )}
          </div>

          {filteredMedicines.length === 0 ? (
            <div className="pharmacy-no-medicines">

              <div>💊</div>

              <h3>No medicines found</h3>

              <p>
                {searchText
                  ? `No medicine matching "${searchText}" was found.`
                  : "This pharmacy has no medicines listed yet."}
              </p>

            </div>
          ) : (
            <div className="pharmacy-medicine-grid">

              {filteredMedicines.map((medicine) => {
                const isAvailable =
                  Number(medicine.quantity) > 0 &&
                  medicine.availability !== "Out of Stock";

                return (
                  <div
                    className="pharmacy-medicine-card"
                    key={medicine.id}
                  >

                    <div className="pharmacy-medicine-top">

                      <div className="pharmacy-medicine-icon">
                        💊
                      </div>

                      <div className="pharmacy-medicine-name">

                        <h3>
                          {medicine.medicineName}
                        </h3>

                        <span>
                          {medicine.dosage || "Standard dosage"}
                        </span>

                      </div>

                      <span
                        className={
                          isAvailable
                            ? "pharmacy-availability available"
                            : "pharmacy-availability unavailable"
                        }
                      >
                        {isAvailable
                          ? "Available"
                          : "Out of Stock"}
                      </span>

                    </div>

                    <div className="pharmacy-medicine-details">

                      <div>
                        <span>Category</span>

                        <strong>
                          {medicine.category || "General"}
                        </strong>
                      </div>

                      <div>
                        <span>Price</span>

                        <strong>
                          ₹{medicine.price || 0}
                        </strong>
                      </div>

                      <div>
                        <span>Stock</span>

                        <strong>
                          {medicine.quantity || 0}
                        </strong>
                      </div>

                    </div>

                    <div className="pharmacy-medicine-actions">

                      <button
                        type="button"
                        className={
                          isAvailable
                            ? "pharmacy-request-btn"
                            : "pharmacy-request-btn secondary"
                        }
                        onClick={() =>
                          navigate(
                            `/request-medicine?medicineName=${encodeURIComponent(
                              medicine.medicineName
                            )}&pharmacyId=${pharmacyId}&pharmacyName=${encodeURIComponent(
                              pharmacy.name || ""
                            )}`
                          )
                        }
                      >
                        {isAvailable
                          ? "Request Medicine"
                          : "Request When Available"}
                      </button>

                    </div>
                  </div>
                );
              })}

            </div>
          )}

        </section>

        <section className="pharmacy-details-bottom">

          <div>
            <span>NEED THIS MEDICINE?</span>

            <h2>
              Send a request to this pharmacy.
            </h2>

            <p>
              Choose a medicine from the
              inventory or send a request
              directly to the pharmacy.
            </p>
          </div>

          <Link
            to={`/request-medicine?pharmacyId=${pharmacyId}&pharmacyName=${encodeURIComponent(
              pharmacy.name || ""
            )}`}
            className="pharmacy-request-main-btn"
          >
            Request Medicine →
          </Link>

        </section>

      </div>
    </main>
  );
}

export default PharmacyDetails;