import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import {
  Link,
  useSearchParams
} from "react-router-dom";

import { db } from "../../firebase/Firebase";

function MedicineResults() {
  const [searchParams] =
    useSearchParams();

  const medicineQuery =
    searchParams.get("medicine") || "";

  const [medicines, setMedicines] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [locationLoading, setLocationLoading] =
    useState(false);

  const [userLocation, setUserLocation] =
    useState(null);

  const [locationError, setLocationError] =
    useState("");

  const [error, setError] =
    useState("");

  const getDistance = (
    lat1,
    lon1,
    lat2,
    lon2
  ) => {
    const R = 6371;

    const dLat =
      ((lat2 - lat1) * Math.PI) / 180;

    const dLon =
      ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(dLat / 2) *
        Math.sin(dLat / 2) +
      Math.cos(
        (lat1 * Math.PI) / 180
      ) *
        Math.cos(
          (lat2 * Math.PI) / 180
        ) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

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
          latitude:
            position.coords.latitude,
          longitude:
            position.coords.longitude
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
    const loadResults = async () => {
      try {
        setLoading(true);
        setError("");

        const medicineSnapshot =
          await getDocs(
            collection(
              db,
              "medicines"
            )
          );

        const pharmacySnapshot =
          await getDocs(
            collection(
              db,
              "pharmacies"
            )
          );

        const pharmacyMap = {};

        pharmacySnapshot.forEach(
          (item) => {
            const pharmacy =
              item.data();

            pharmacyMap[item.id] = {
              id: item.id,
              ...pharmacy
            };
          }
        );

        const searchText =
          medicineQuery
            .trim()
            .toLowerCase();

        const results = [];

        medicineSnapshot.forEach(
          (item) => {
            const medicine =
              item.data();

            const medicineName =
              medicine.medicineName
                ?.toLowerCase() || "";

            if (
              searchText &&
              !medicineName.includes(
                searchText
              )
            ) {
              return;
            }

            const pharmacy =
              pharmacyMap[
                medicine.pharmacyId
              ];

            if (!pharmacy) {
              return;
            }

            if (
              pharmacy.status !==
              "approved"
            ) {
              return;
            }

            const pharmacyLatitude =
              Number(
                pharmacy.latitude
              );

            const pharmacyLongitude =
              Number(
                pharmacy.longitude
              );

            let distance = null;

            if (
              userLocation &&
              !Number.isNaN(
                pharmacyLatitude
              ) &&
              !Number.isNaN(
                pharmacyLongitude
              )
            ) {
              distance =
                getDistance(
                  userLocation.latitude,
                  userLocation.longitude,
                  pharmacyLatitude,
                  pharmacyLongitude
                );
            }

            results.push({
              id: item.id,
              ...medicine,
              pharmacy,
              distance
            });
          }
        );

        results.sort(
          (a, b) => {
            if (
              a.distance !== null &&
              b.distance !== null
            ) {
              return (
                a.distance -
                b.distance
              );
            }

            if (
              a.distance !== null
            ) {
              return -1;
            }

            if (
              b.distance !== null
            ) {
              return 1;
            }

            return 0;
          }
        );

        setMedicines(results);
      } catch (err) {
        console.error(
          "MEDICINE RESULTS ERROR:",
          err
        );

        setError(
          "Unable to load medicine results. Please try again."
        );
      } finally {
        setLoading(false);
      }
    };

    loadResults();
  }, [
    medicineQuery,
    userLocation
  ]);

  return (
    <div className="medicine-results-page">

      <div className="medicine-results-container">

        <div className="results-top">

          <div>

            <span className="results-label">
              MEDICINE SEARCH
            </span>

            <h1>
              Results for{" "}
              <span>
                "{medicineQuery}"
              </span>
            </h1>

            <p>
              Compare medicine availability
              across approved pharmacies near
              you.
            </p>

          </div>

          <Link
            to="/search"
            className="change-search-btn"
          >
            New Search
          </Link>

        </div>

        <div className="location-banner">

          <div className="location-banner-icon">
            📍
          </div>

          <div className="location-banner-content">

            <strong>
              {userLocation
                ? "Showing pharmacies near your location"
                : "Location is not enabled"}
            </strong>

            <span>
              {userLocation
                ? "Results are sorted by distance."
                : "Enable location to see pharmacies nearest to you."}
            </span>

          </div>

          {!userLocation && (
            <button
              className="enable-location-btn"
              onClick={
                getUserLocation
              }
              disabled={
                locationLoading
              }
            >
              {locationLoading
                ? "Getting Location..."
                : "Enable Location"}
            </button>
          )}

        </div>

        {locationError && (
          <div className="location-error">
            {locationError}
          </div>
        )}

        {error && (
          <div className="location-error">
            {error}
          </div>
        )}

        {loading ? (

          <div className="results-loading">

            <div className="loading-spinner"></div>

            <h3>
              Finding pharmacies...
            </h3>

            <p>
              Searching available medicines
              in our approved pharmacy network.
            </p>

          </div>

        ) : medicines.length === 0 ? (

          <div className="no-results">

            <div className="no-results-icon">
              💊
            </div>

            <h2>
              Medicine not found
            </h2>

            <p>
              We couldn't find{" "}
              <strong>
                "{medicineQuery}"
              </strong>{" "}
              in the available pharmacy
              inventory.
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

            <div className="results-summary">

              <div>

                <strong>
                  {medicines.length}
                </strong>{" "}

                pharmacy result
                {medicines.length !==
                1
                  ? "s"
                  : ""}

              </div>

              <span>
                Availability may change
                throughout the day.
              </span>

            </div>

            <div className="medicine-results-grid">

              {medicines.map(
                (medicine) => {

                  const isAvailable =
                    Number(
                      medicine.quantity
                    ) > 0 &&
                    medicine.availability !==
                      "Out of Stock";

                  const pharmacy =
                    medicine.pharmacy;

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
                      key={
                        medicine.id
                      }
                    >

                      <div className="medicine-card-top">

                        <div className="medicine-icon">
                          💊
                        </div>

                        <div className="medicine-main-info">

                          <h2>
                            {
                              medicine.medicineName
                            }
                          </h2>

                          <p>
                            {medicine.dosage ||
                              "Standard dosage"}
                          </p>

                        </div>

                        <span
                          className={
                            isAvailable
                              ? "availability available"
                              : "availability unavailable"
                          }
                        >
                          {isAvailable
                            ? "Available"
                            : "Out of Stock"}
                        </span>

                      </div>

                      <div className="medicine-details">

                        <div className="medicine-detail">

                          <span>
                            Category
                          </span>

                          <strong>
                            {medicine.category ||
                              "General"}
                          </strong>

                        </div>

                        <div className="medicine-detail">

                          <span>
                            Price
                          </span>

                          <strong>
                            ₹
                            {medicine.price ||
                              0}
                          </strong>

                        </div>

                        <div className="medicine-detail">

                          <span>
                            Stock
                          </span>

                          <strong>
                            {medicine.quantity ||
                              0}
                          </strong>

                        </div>

                        <div className="medicine-detail">

                          <span>
                            Distance
                          </span>

                          <strong>
                            {medicine.distance !==
                            null
                              ? `${medicine.distance.toFixed(
                                  1
                                )} km`
                              : "Unavailable"}
                          </strong>

                        </div>

                      </div>

                      <div className="pharmacy-result">

                        <div className="pharmacy-result-icon">
                          🏥
                        </div>

                        <div className="pharmacy-result-info">

                          <h3>
                            {pharmacyName}
                          </h3>

                          <p>
                            {pharmacyAddress}
                          </p>

                          <span>
                            {pharmacyCity}

                            {pharmacyState
                              ? `, ${pharmacyState}`
                              : ""}
                          </span>

                        </div>

                      </div>

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
                            isAvailable
                              ? "request-medicine-btn"
                              : "request-medicine-btn secondary"
                          }
                        >
                          {isAvailable
                            ? "Request Medicine"
                            : "Request When Available"}
                        </Link>

                      </div>

                    </div>
                  );
                }
              )}

            </div>

          </>
        )}

      </div>

    </div>
  );
}

export default MedicineResults;