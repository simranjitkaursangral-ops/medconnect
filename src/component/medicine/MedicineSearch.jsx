import { useState } from "react";
import { useNavigate } from "react-router-dom";

function MedicineSearch() {
  const navigate = useNavigate();

  const [medicine, setMedicine] =
    useState("");

  const [error, setError] =
    useState("");

  const handleSearch = (e) => {
    e.preventDefault();

    const searchText =
      medicine.trim();

    if (!searchText) {
      setError(
        "Please enter a medicine name to search."
      );
      return;
    }

    setError("");

    navigate(
      `/results?medicine=${encodeURIComponent(
        searchText
      )}`
    );
  };

  const handleChange = (e) => {
    setMedicine(e.target.value);

    if (error) {
      setError("");
    }
  };

  return (
    <main className="medicine-search-page">

      <div className="medicine-search-container">

        <section className="medicine-search-hero">

          <div className="medicine-search-content">

            <span className="medicine-search-badge">
              💊 MEDICINE AVAILABILITY FINDER
            </span>

            <h1>
              Find the medicine
              <br />
              <span>
                you need nearby.
              </span>
            </h1>

            <p>
              Search for a medicine and discover
              pharmacies where it is available.
              Compare stock, price, distance, and
              pharmacy details in one place.
            </p>

            <form
              className="medicine-search-form"
              onSubmit={handleSearch}
            >

              <div className="medicine-search-input-wrapper">

                <span className="medicine-search-icon">
                  🔍
                </span>

                <input
                  type="text"
                  placeholder="Enter medicine name..."
                  value={medicine}
                  onChange={handleChange}
                />

                {medicine && (
                  <button
                    type="button"
                    className="medicine-clear-btn"
                    onClick={() => {
                      setMedicine("");
                      setError("");
                    }}
                  >
                    ✕
                  </button>
                )}

              </div>

              <button
                type="submit"
                className="medicine-search-btn"
              >
                Search Medicine
              </button>

            </form>

            {error && (
              <div className="form-error">
                {error}
              </div>
            )}

            <div className="medicine-search-trust">

              <div>
                <span>✓</span>
                Verified pharmacies
              </div>

              <div>
                <span>✓</span>
                Check availability
              </div>

              <div>
                <span>✓</span>
                Find nearby
              </div>

            </div>

          </div>

          <div className="medicine-search-visual">

            <div className="search-visual-card">

              <div className="search-visual-header">

                <div>
                  <span>
                    MEDICINE SEARCH
                  </span>

                  <strong>
                    Find nearby availability
                  </strong>
                </div>

                <div className="search-live">
                  ● Live
                </div>

              </div>

              <div className="visual-search-bar">

                <span>
                  🔍
                </span>

                <span>
                  Paracetamol 500mg
                </span>

              </div>

              <div className="visual-result">

                <div className="visual-medicine-icon">
                  💊
                </div>

                <div className="visual-medicine-info">

                  <strong>
                    Paracetamol 500mg
                  </strong>

                  <span>
                    Tablet • Pain Relief
                  </span>

                </div>

                <div className="visual-available">
                  Available
                </div>

              </div>

              <div className="visual-result">

                <div className="visual-pharmacy-icon">
                  🏥
                </div>

                <div className="visual-medicine-info">

                  <strong>
                    City Care Pharmacy
                  </strong>

                  <span>
                    0.8 km away • 25 in stock
                  </span>

                </div>

                <span className="visual-arrow">
                  →
                </span>

              </div>

              <div className="visual-result">

                <div className="visual-pharmacy-icon">
                  🏥
                </div>

                <div className="visual-medicine-info">

                  <strong>
                    HealthPlus Pharmacy
                  </strong>

                  <span>
                    1.4 km away • 12 in stock
                  </span>

                </div>

                <span className="visual-arrow">
                  →
                </span>

              </div>

            </div>

            <div className="search-floating-card search-floating-one">

              <span>
                📍
              </span>

              <div>
                <strong>
                  Nearby
                </strong>

                <small>
                  Pharmacies
                </small>
              </div>

            </div>

            <div className="search-floating-card search-floating-two">

              <span>
                ✓
              </span>

              <div>
                <strong>
                  Available
                </strong>

                <small>
                  Medicine Found
                </small>
              </div>

            </div>

          </div>

        </section>

        <section className="medicine-search-info">

          <div className="medicine-search-info-heading">

            <span>
              SIMPLE SEARCH
            </span>

            <h2>
              Find what you need in a few steps
            </h2>

            <p>
              MedConnect makes it easier to locate
              medicines without checking multiple
              pharmacies manually.
            </p>

          </div>

          <div className="medicine-search-steps">

            <div className="medicine-search-step">

              <div className="search-step-number">
                01
              </div>

              <div>
                <h3>
                  Enter Medicine
                </h3>

                <p>
                  Type the name of the medicine
                  you are looking for.
                </p>
              </div>

            </div>

            <div className="medicine-search-step">

              <div className="search-step-number">
                02
              </div>

              <div>
                <h3>
                  Check Results
                </h3>

                <p>
                  View pharmacies with matching
                  medicine inventory.
                </p>
              </div>

            </div>

            <div className="medicine-search-step">

              <div className="search-step-number">
                03
              </div>

              <div>
                <h3>
                  Compare
                </h3>

                <p>
                  Compare stock, price, and distance
                  from your location.
                </p>
              </div>

            </div>

            <div className="medicine-search-step">

              <div className="search-step-number">
                04
              </div>

              <div>
                <h3>
                  Request
                </h3>

                <p>
                  Send a medicine request directly
                  to your selected pharmacy.
                </p>
              </div>

            </div>

          </div>

        </section>

        <section className="medicine-search-help">

          <div>

            <span>
              CAN'T FIND YOUR MEDICINE?
            </span>

            <h2>
              Request it from a pharmacy.
            </h2>

            <p>
              If your medicine isn't currently
              available, you can send a request
              to a pharmacy.
            </p>

          </div>

          <button
            type="button"
            onClick={() =>
              navigate("/request-medicine")
            }
          >
            Request Medicine →
          </button>

        </section>

      </div>

    </main>
  );
}

export default MedicineSearch;