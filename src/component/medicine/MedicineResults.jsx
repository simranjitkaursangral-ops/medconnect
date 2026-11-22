import { useEffect, useMemo, useState } from "react";

import {
  collection,
  onSnapshot
} from "firebase/firestore";

import {
  Link,
  useSearchParams
} from "react-router-dom";

import { db } from "../../firebase/Firebase";

function MedicineResults() {

  const [searchParams] = useSearchParams();

  const medicineQuery = searchParams.get("medicine") || "";
  const selectedState = searchParams.get("state") || "";
  const selectedCity = searchParams.get("city") || "";

  const [medicines, setMedicines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [sortBy, setSortBy] = useState("recommended");

  const [availabilityFilter, setAvailabilityFilter] =
    useState("all");

  const [currentTime, setCurrentTime] = useState(Date.now());


  // NORMALIZE TEXT

  const normalizeText = (value) => {

    return String(value || "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "");

  };


  // SMART MEDICINE SEARCH

  const matchesMedicine = (medicine, searchText) => {

    if (!searchText.trim()) return true;

    const searchableText = normalizeText([

      medicine.medicineName,
      medicine.dosage,
      medicine.category,
      medicine.brand,
      medicine.description

    ].join(" "));

    const searchWords = searchText
      .toLowerCase()
      .trim()
      .split(/\s+/);

    return searchWords.every((word) =>
      searchableText.includes(normalizeText(word))
    );

  };


  // LOCATION FILTER

  const matchesLocation = (medicine) => {

    const medicineCity = normalizeText(
      medicine.pharmacyCity
    );

    const medicineState = normalizeText(
      medicine.pharmacyState
    );

    const searchCity = normalizeText(selectedCity);
    const searchState = normalizeText(selectedState);

    if (searchCity && medicineCity !== searchCity) {
      return false;
    }

    if (searchState && medicineState !== searchState) {
      return false;
    }

    return true;

  };


  // UPDATE TIME EVERY MINUTE

  useEffect(() => {

    const timer = setInterval(() => {

      setCurrentTime(Date.now());

    }, 60000);

    return () => clearInterval(timer);

  }, []);


  // REAL-TIME MEDICINE DATA

  useEffect(() => {

    setLoading(true);
    setError("");

    const unsubscribe = onSnapshot(

      collection(db, "medicines"),

      (snapshot) => {

        try {

          const results = [];

          snapshot.docs.forEach((item) => {

            const medicine = item.data();

            // MEDICINE NAME FILTER

            if (
              !matchesMedicine(
                medicine,
                medicineQuery
              )
            ) {
              return;
            }


            // STATE AND CITY FILTER

            if (!matchesLocation(medicine)) {
              return;
            }


            // USE PHARMACY DETAILS SAVED IN MEDICINE DOCUMENT

            const pharmacy = {

              name: medicine.pharmacyName || "Pharmacy",

              address:
                medicine.pharmacyAddress ||
                "Address unavailable",

              city: medicine.pharmacyCity || "",

              state: medicine.pharmacyState || "",

              phone: medicine.pharmacyPhone || ""

            };


            results.push({

              id: item.id,

              ...medicine,

              pharmacy,

              distance: null

            });

          });


          setMedicines(results);

          setError("");

        } catch (err) {

          console.error(err);

          setError(
            "Unable to process medicine results."
          );

        } finally {

          setLoading(false);

        }

      },

      (err) => {

        console.error(err);

        setError(
          "Unable to load medicine inventory. Please try again."
        );

        setLoading(false);

      }

    );


    return () => unsubscribe();

  }, [
    medicineQuery,
    selectedState,
    selectedCity
  ]);


  // STOCK VERIFICATION

  const getStockVerification = (medicine) => {

    const quantity = Number(medicine.quantity || 0);

    if (
      quantity <= 0 ||
      medicine.availability === "Out of Stock" ||
      medicine.available === false
    ) {

      return {

        label: "Out of Stock",
        className: "stock-unavailable",
        updated: "Currently unavailable",
        verifiedTime: 0

      };

    }


    const timestamp =
      medicine.stockVerifiedAt ||
      medicine.stockUpdatedAt;


    if (!timestamp) {

      return {

        label: "Needs Confirmation",
        className: "stock-stale",
        updated: "Verification not available",
        verifiedTime: 0

      };

    }


    let stockDate;

    if (typeof timestamp.toDate === "function") {

      stockDate = timestamp.toDate();

    } else {

      stockDate = new Date(timestamp);

    }


    if (Number.isNaN(stockDate.getTime())) {

      return {

        label: "Needs Confirmation",
        className: "stock-stale",
        updated: "Verification date unavailable",
        verifiedTime: 0

      };

    }


    const hoursDifference =
      (currentTime - stockDate.getTime()) /
      (1000 * 60 * 60);


    const formattedDate = stockDate.toLocaleString(
      "en-IN",
      {
        dateStyle: "medium",
        timeStyle: "short"
      }
    );


    if (
      hoursDifference >= 0 &&
      hoursDifference <= 24
    ) {

      return {

        label: "Recently Verified",
        className: "stock-fresh",
        updated: formattedDate,
        verifiedTime: stockDate.getTime()

      };

    }


    return {

      label: "Needs Confirmation",
      className: "stock-stale",
      updated: formattedDate,
      verifiedTime: stockDate.getTime()

    };

  };


  // CHECK AVAILABILITY

  const isMedicineAvailable = (medicine) => {

    return (
      Number(medicine.quantity || 0) > 0 &&
      medicine.availability !== "Out of Stock" &&
      medicine.available !== false
    );

  };


  // PREPARE COMPARISON RESULTS

  const comparisonResults = useMemo(() => {

    let results = medicines.map((medicine) => ({

      ...medicine,

      stockStatus: getStockVerification(medicine),

      isAvailable: isMedicineAvailable(medicine)

    }));


    // AVAILABILITY FILTER

    if (availabilityFilter === "available") {

      results = results.filter(
        (item) => item.isAvailable
      );

    }


    if (availabilityFilter === "unavailable") {

      results = results.filter(
        (item) => !item.isAvailable
      );

    }


    // SORT RESULTS

    results.sort((a, b) => {

      if (sortBy === "price") {

        return (
          Number(a.price || 0) -
          Number(b.price || 0)
        );

      }


      if (sortBy === "nearest") {

        return 0;

      }


      if (sortBy === "freshness") {

        return (
          b.stockStatus.verifiedTime -
          a.stockStatus.verifiedTime
        );

      }


      // RECOMMENDED: AVAILABLE FIRST, THEN RECENTLY VERIFIED

      if (a.isAvailable !== b.isAvailable) {

        return Number(b.isAvailable) -
          Number(a.isAvailable);

      }

      return (
        b.stockStatus.verifiedTime -
        a.stockStatus.verifiedTime
      );

    });


    return results;

  }, [
    medicines,
    availabilityFilter,
    sortBy,
    currentTime
  ]);


  // SUMMARY COUNTS

  const availableCount = medicines.filter(
    (medicine) => isMedicineAvailable(medicine)
  ).length;

  const unavailableCount =
    medicines.length - availableCount;


  // LOCATION DISPLAY

  const locationText = [

    selectedCity,
    selectedState

  ].filter(Boolean).join(", ");


  return (

    <div className="medicine-results-page">

      <div className="medicine-results-container">


        {/* HEADER */}

        <div className="results-top">

          <div>

            <span className="results-label">
              MEDICINE SEARCH
            </span>

            <h1>
              Results for{" "}
              <span>"{medicineQuery}"</span>
            </h1>

            <p>
              Compare medicine prices, availability
              and pharmacy locations.
            </p>

          </div>


          <Link
            to="/search"
            className="change-search-btn"
          >
            New Search
          </Link>

        </div>


        {/* SELECTED LOCATION */}

        <div className="location-banner">

          <div className="location-banner-icon">
            📍
          </div>

          <div className="location-banner-content">

            <strong>
              {locationText
                ? `Showing results for ${locationText}`
                : "Showing results from all locations"}
            </strong>

            <span>
              {locationText
                ? "Pharmacies are filtered according to your selected location."
                : "Select a city and state on the search page to narrow your results."}
            </span>

          </div>

        </div>


        {error && (

          <div className="location-error">
            {error}
          </div>

        )}


        {loading ? (

          <div className="results-loading">

            <div className="loading-spinner"></div>

            <h3>Finding pharmacies...</h3>

            <p>
              Comparing available medicines
              across our pharmacy network.
            </p>

          </div>

        ) : medicines.length === 0 ? (

          <div className="no-results">

            <div className="no-results-icon">
              💊
            </div>

            <h2>No matching medicines found</h2>

            <p>

              We couldn't find{" "}
              <strong>"{medicineQuery}"</strong>

              {locationText
                ? ` in ${locationText}.`
                : " in the available pharmacy inventory."}

            </p>

            <Link
              to={`/request-medicine?medicineName=${encodeURIComponent(
                medicineQuery
              )}`}
              className="request-anywhere-btn"
            >
              Request This Medicine
            </Link>

          </div>

        ) : (

          <>


            {/* COMPARISON SUMMARY */}

            <div className="comparison-summary">

              <div className="comparison-summary-heading">

                <span className="results-label">
                  PHARMACY COMPARISON
                </span>

                <h2>
                  Compare your options
                </h2>

                <p>
                  Choose a pharmacy based on price
                  and stock confirmation.
                </p>

              </div>


              <div className="comparison-stat-grid">

                <div className="comparison-stat">

                  <span>Total Results</span>

                  <strong>
                    {medicines.length}
                  </strong>

                </div>


                <div className="comparison-stat">

                  <span>Available</span>

                  <strong className="comparison-green">
                    {availableCount}
                  </strong>

                </div>


                <div className="comparison-stat">

                  <span>Out of Stock</span>

                  <strong className="comparison-red">
                    {unavailableCount}
                  </strong>

                </div>

              </div>

            </div>


            {/* FILTER AND SORT */}

            <div className="comparison-toolbar">

              <div className="comparison-filter">

                <label htmlFor="availabilityFilter">
                  Availability
                </label>

                <select
                  id="availabilityFilter"
                  value={availabilityFilter}
                  onChange={(e) =>
                    setAvailabilityFilter(e.target.value)
                  }
                >

                  <option value="all">
                    All Medicines
                  </option>

                  <option value="available">
                    Available Only
                  </option>

                  <option value="unavailable">
                    Out of Stock
                  </option>

                </select>

              </div>


              <div className="comparison-filter">

                <label htmlFor="sortBy">
                  Sort Results
                </label>

                <select
                  id="sortBy"
                  value={sortBy}
                  onChange={(e) =>
                    setSortBy(e.target.value)
                  }
                >

                  <option value="recommended">
                    Recommended
                  </option>

                  <option value="price">
                    Lowest Price
                  </option>

                  <option value="nearest">
                    Nearest First
                  </option>

                  <option value="freshness">
                    Recently Verified
                  </option>

                </select>

              </div>

            </div>


            {/* FILTERED RESULTS */}

            {comparisonResults.length === 0 ? (

              <div className="comparison-empty">

                <h3>No matching pharmacies</h3>

                <p>
                  No results match your selected
                  availability filter.
                </p>

                <button
                  onClick={() => setAvailabilityFilter("all")}
                >
                  Show All Results
                </button>

              </div>

            ) : (

              <>

                <div className="results-summary">

                  <div>

                    <strong>
                      {comparisonResults.length}
                    </strong>{" "}

                    comparison result
                    {comparisonResults.length !== 1 ? "s" : ""}

                  </div>

                  <span>
                    Live inventory updates enabled.
                  </span>

                </div>


                {/* PHARMACY CARDS */}

                <div className="medicine-results-grid">

                  {comparisonResults.map((medicine) => {

                    const pharmacy = medicine.pharmacy;

                    const pharmacyName =
                      pharmacy.name ||
                      medicine.pharmacyName ||
                      "Pharmacy";

                    const pharmacyAddress =
                      pharmacy.address ||
                      medicine.pharmacyAddress ||
                      "Address unavailable";

                    const pharmacyCity =
                      pharmacy.city ||
                      medicine.pharmacyCity ||
                      "";

                    const pharmacyState =
                      pharmacy.state ||
                      medicine.pharmacyState ||
                      "";


                    return (

                      <div
                        className="medicine-result-card"
                        key={medicine.id}
                      >


                        {/* MEDICINE HEADER */}

                        <div className="medicine-card-top">

                          <div className="medicine-icon">
                            💊
                          </div>


                          <div className="medicine-main-info">

                            <h2>
                              {medicine.medicineName}
                            </h2>

                            <p>
                              {medicine.dosage ||
                                "Standard dosage"}
                            </p>

                          </div>


                          <span
                            className={
                              medicine.isAvailable
                                ? "availability available"
                                : "availability unavailable"
                            }
                          >

                            {medicine.isAvailable
                              ? "Available"
                              : "Out of Stock"}

                          </span>

                        </div>


                        {/* DETAILS */}

                        <div className="medicine-details">

                          <div className="medicine-detail">

                            <span>Category</span>

                            <strong>
                              {medicine.category || "General"}
                            </strong>

                          </div>


                          <div className="medicine-detail">

                            <span>Price</span>

                            <strong>
                              ₹{medicine.price || 0}
                            </strong>

                          </div>


                          <div className="medicine-detail">

                            <span>Stock</span>

                            <strong>
                              {medicine.quantity || 0}
                            </strong>

                          </div>


                          <div className="medicine-detail">

                            <span>Distance</span>

                            <strong>
                              Unavailable
                            </strong>

                          </div>

                        </div>


                        {/* STOCK VERIFICATION */}

                        <div className="customer-stock-verification">

                          <div className="customer-stock-heading">

                            <span className="customer-stock-title">
                              STOCK CONFIRMATION
                            </span>


                            <span
                              className={`customer-stock-badge ${medicine.stockStatus.className}`}
                            >

                              <span className="customer-stock-dot"></span>

                              {medicine.stockStatus.label}

                            </span>

                          </div>


                          <p>

                            {medicine.stockStatus.className ===
                            "stock-unavailable"

                              ? "This pharmacy currently has no available stock."

                              : `Last confirmed: ${medicine.stockStatus.updated}`}

                          </p>


                          {medicine.stockStatus.className ===
                            "stock-stale" && (

                            <span className="stock-confirmation-note">

                              Please confirm current availability
                              with the pharmacy.

                            </span>

                          )}

                        </div>


                        {/* PHARMACY */}

                        <div className="pharmacy-result">

                          <div className="pharmacy-result-icon">
                            🏥
                          </div>


                          <div className="pharmacy-result-info">

                            <h3>{pharmacyName}</h3>

                            <p>{pharmacyAddress}</p>

                            <span>

                              {pharmacyCity}

                              {pharmacyState
                                ? `, ${pharmacyState}`
                                : ""}

                            </span>

                          </div>

                        </div>


                        {/* ACTIONS */}

                        <div className="medicine-card-actions">

                          <Link
                            to={`/pharmacy/${medicine.pharmacyId}`}
                            className="view-pharmacy-btn"
                          >
                            View Pharmacy
                          </Link>


                          <Link
                            to={`/request-medicine?medicineName=${encodeURIComponent(
                              medicine.medicineName
                            )}&pharmacyId=${
                              medicine.pharmacyId
                            }&pharmacyName=${encodeURIComponent(
                              pharmacyName
                            )}`}
                            className={
                              medicine.isAvailable
                                ? "request-medicine-btn"
                                : "request-medicine-btn secondary"
                            }
                          >

                            {medicine.isAvailable
                              ? "Request Medicine"
                              : "Request When Available"}

                          </Link>

                        </div>

                      </div>

                    );

                  })}

                </div>

              </>

            )}

          </>

        )}

      </div>

    </div>

  );

}

export default MedicineResults;