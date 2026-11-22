import { useState } from "react";
import { useNavigate } from "react-router-dom";

function MedicineSearch() {
  const navigate = useNavigate();

  const [medicine, setMedicine] = useState("");
  const [state, setState] = useState("");
  const [city, setCity] = useState("");
  const [error, setError] = useState("");

  const states = [
    "Andhra Pradesh",
    "Arunachal Pradesh",
    "Assam",
    "Bihar",
    "Chhattisgarh",
    "Goa",
    "Gujarat",
    "Haryana",
    "Himachal Pradesh",
    "Jharkhand",
    "Karnataka",
    "Kerala",
    "Madhya Pradesh",
    "Maharashtra",
    "Manipur",
    "Meghalaya",
    "Mizoram",
    "Nagaland",
    "Odisha",
    "Punjab",
    "Rajasthan",
    "Sikkim",
    "Tamil Nadu",
    "Telangana",
    "Tripura",
    "Uttar Pradesh",
    "Uttarakhand",
    "West Bengal",
    "Delhi",
    "Jammu and Kashmir",
    "Ladakh",
    "Puducherry",
    "Chandigarh"
  ];

  const handleSearch = (e) => {
    e.preventDefault();

    const searchText = medicine.trim();
    const cityText = city.trim();

    if (!searchText) {
      setError("Please enter a medicine name.");
      return;
    }

    setError("");

    const params = new URLSearchParams();

    params.set("medicine", searchText);

    if (state) {
      params.set("state", state);
    }

    if (cityText) {
      params.set("city", cityText);
    }

    navigate(`/results?${params.toString()}`);
  };

  return (
    <main className="medicine-search-page">
      <div className="medicine-search-container">

        <section className="medicine-search-main">

          <div className="medicine-search-heading">
            <span className="medicine-search-label">
              MEDICINE SEARCH
            </span>

            <h1>
              Find the medicine
              <br />
              <span>you're looking for.</span>
            </h1>

            <p>
              Search for a medicine and check which pharmacies
              have it in stock. Get the information you need
              before visiting a pharmacy.
            </p>
          </div>

          <form
            className="medicine-search-form"
            onSubmit={handleSearch}
          >
            <label htmlFor="medicineName">
              Medicine name
            </label>

            <div className="medicine-search-input-row">
              <div className="medicine-search-input">
                <span className="search-icon">⌕</span>

                <input
                  id="medicineName"
                  type="text"
                  placeholder="e.g. Paracetamol 650mg"
                  value={medicine}
                  onChange={(e) => {
                    setMedicine(e.target.value);
                    if (error) setError("");
                  }}
                />

                {medicine && (
                  <button
                    type="button"
                    className="medicine-clear-btn"
                    onClick={() => {
                      setMedicine("");
                      setError("");
                    }}
                    aria-label="Clear search"
                  >
                    ×
                  </button>
                )}
              </div>

              <button
                type="submit"
                className="medicine-search-btn"
              >
                Search
                <span>→</span>
              </button>
            </div>

            <div>
              <label htmlFor="medicineState">
                State <span>(Optional)</span>
              </label>

              <div className="medicine-search-input">
                <select
                  id="medicineState"
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                >
                  <option value="">All States</option>

                  {states.map((stateName) => (
                    <option key={stateName} value={stateName}>
                      {stateName}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label htmlFor="medicineCity">
                City <span>(Optional)</span>
              </label>

              <div className="medicine-search-input">
                <input
                  id="medicineCity"
                  type="text"
                  placeholder="e.g. Ludhiana"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                />
              </div>
            </div>

            {error && (
              <p className="medicine-search-error">{error}</p>
            )}

            <p className="medicine-search-hint">
              Enter a medicine name and optionally select your
              location to find nearby pharmacy listings.
            </p>
          </form>

          <div className="medicine-search-benefits">
            <div>
              <span>✓</span>
              Check medicine availability
            </div>

            <div>
              <span>✓</span>
              Compare pharmacy prices
            </div>

            <div>
              <span>✓</span>
              Contact pharmacies
            </div>
          </div>

        </section>

        <section className="medicine-search-about">

          <div className="search-about-left">
            <span className="medicine-search-label">
              HOW IT WORKS
            </span>

            <h2>
              A simpler way to find
              <br />
              your medicines.
            </h2>

            <p>
              No need to visit one pharmacy after another.
              Search online, check the available options,
              and contact the pharmacy that suits you.
            </p>
          </div>

          <div className="search-about-steps">

            <div className="search-about-step">
              <span className="step-number">01</span>
              <div>
                <h3>Search</h3>
                <p>Enter the name of the medicine you need.</p>
              </div>
            </div>

            <div className="search-about-step">
              <span className="step-number">02</span>
              <div>
                <h3>Explore pharmacies</h3>
                <p>Check matching medicines and their availability.</p>
              </div>
            </div>

            <div className="search-about-step">
              <span className="step-number">03</span>
              <div>
                <h3>Make your choice</h3>
                <p>Compare the details and contact a pharmacy.</p>
              </div>
            </div>

          </div>

        </section>

        <section className="medicine-search-request">

          <div>
            <span className="medicine-search-label">
              NEED HELP?
            </span>

            <h2>Couldn't find your medicine?</h2>

            <p>
              Send a medicine request to pharmacies and let them
              know what you're looking for.
            </p>
          </div>

          <button
            type="button"
            onClick={() => navigate("/request-medicine")}
          >
            Request a Medicine
            <span>→</span>
          </button>

        </section>

      </div>
    </main>
  );
}

export default MedicineSearch;