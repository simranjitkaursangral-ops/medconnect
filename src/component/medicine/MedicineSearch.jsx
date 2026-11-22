import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

function MedicineSearch() {
  const navigate = useNavigate();

  const [medicine, setMedicine] = useState("");
  const [location, setLocation] = useState("");
  const [selectedLocation, setSelectedLocation] = useState(null);

  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const [searchingLocation, setSearchingLocation] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);

  const [error, setError] = useState("");

  useEffect(() => {
    if (location.trim().length < 3 || selectedLocation) {
      setSuggestions([]);
      return;
    }

    const controller = new AbortController();

    const timer = setTimeout(async () => {
      try {
        setSearchingLocation(true);

        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&countrycodes=in&limit=5&q=${encodeURIComponent(location)}`,
          {
            signal: controller.signal
          }
        );

        if (!response.ok) {
          throw new Error("Location search failed");
        }

        const data = await response.json();

        const formatted = data.map((item) => {
          const address = item.address || {};

          return {
            id: item.place_id,
            displayName: item.display_name,
            name:
              address.suburb ||
              address.neighbourhood ||
              address.village ||
              address.town ||
              address.city ||
              address.county ||
              item.name ||
              location,
            city:
              address.city ||
              address.town ||
              address.village ||
              address.municipality ||
              address.county ||
              "",
            state: address.state || "",
            postcode: address.postcode || "",
            latitude: item.lat,
            longitude: item.lon
          };
        });

        setSuggestions(formatted);
        setShowSuggestions(true);
      } catch (err) {
        if (err.name !== "AbortError") {
          setSuggestions([]);
        }
      } finally {
        setSearchingLocation(false);
      }
    }, 600);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [location, selectedLocation]);

  const selectLocation = (item) => {
    setSelectedLocation(item);

    const display =
      item.name +
      (item.state ? ", " + item.state : "") +
      (item.postcode ? " - " + item.postcode : "");

    setLocation(display);
    setShowSuggestions(false);
    setSuggestions([]);
    setError("");
  };

  const handleCurrentLocation = () => {
    setError("");

    if (!navigator.geolocation) {
      setError("Your browser does not support location detection.");
      return;
    }

    setLocationLoading(true);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;

          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}&addressdetails=1`
          );

          if (!response.ok) {
            throw new Error("Location lookup failed");
          }

          const data = await response.json();
          const address = data.address || {};

          const city =
            address.city ||
            address.town ||
            address.village ||
            address.municipality ||
            address.county ||
            "";

          const name =
            address.suburb ||
            address.neighbourhood ||
            city ||
            address.postcode ||
            "Selected location";

          const item = {
            id: data.place_id,
            name,
            city,
            state: address.state || "",
            postcode: address.postcode || "",
            latitude,
            longitude,
            displayName: data.display_name
          };

          selectLocation(item);
        } catch (err) {
          setError("Could not identify your location. Please search manually.");
        } finally {
          setLocationLoading(false);
        }
      },
      (err) => {
        setLocationLoading(false);

        if (err.code === 1) {
          setError("Location permission denied. Please allow location access.");
        } else {
          setError("Unable to detect your location. Please try again.");
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 300000
      }
    );
  };

  const handleSearch = (e) => {
    e.preventDefault();

    if (!medicine.trim()) {
      setError("Please enter a medicine name.");
      return;
    }

    const params = new URLSearchParams();

    params.set("medicine", medicine.trim());

    if (selectedLocation) {
      if (selectedLocation.city) {
        params.set("city", selectedLocation.city);
      }

      if (selectedLocation.state) {
        params.set("state", selectedLocation.state);
      }

      if (selectedLocation.postcode) {
        params.set("postcode", selectedLocation.postcode);
      }
    } else if (location.trim()) {
      params.set("city", location.trim());
    }

    setError("");
    setShowSuggestions(false);

    navigate(`/results?${params.toString()}`);
  };

  return (
    <main className="mc-search-page">

      <div className="mc-search-wrapper">

        <section className="mc-search-hero">

          <div className="mc-hero-content">

            <span className="mc-eyebrow">
              <span className="mc-eyebrow-dot"></span>
              YOUR HEALTHCARE, MADE EASIER
            </span>

            <h1>
              Find your medicines
              <br />
              <span>without the search.</span>
            </h1>

            <p>
              Discover medicines available at nearby pharmacies.
              Compare prices, check stock and connect with pharmacy
              owners before visiting.
            </p>

            <div className="mc-hero-points">
              <span>✓ Check medicine availability</span>
              <span>✓ Compare pharmacy prices</span>
              <span>✓ Connect with nearby pharmacies</span>
            </div>

          </div>

          <div className="mc-search-panel">

            <div className="mc-panel-heading">

              <div>
                <span className="mc-panel-label">
                  MEDCONNECT SEARCH
                </span>

                <h2>What do you need today?</h2>

                <p>Choose your location and search medicines.</p>
              </div>

              <div className="mc-panel-symbol">✚</div>

            </div>

            <form onSubmit={handleSearch}>

              <div className="mc-form-group">

                <label htmlFor="mcLocation">
                  Your location
                </label>

                <div className="mc-location-input">

                  <span className="mc-input-icon">⌖</span>

                  <input
                    id="mcLocation"
                    type="text"
                    placeholder="Enter city, area or PIN code"
                    value={location}
                    autoComplete="off"
                    onFocus={() => {
                      if (suggestions.length) {
                        setShowSuggestions(true);
                      }
                    }}
                    onChange={(e) => {
                      setLocation(e.target.value);
                      setSelectedLocation(null);
                      setShowSuggestions(true);
                      setError("");
                    }}
                  />

                  {location && (
                    <button
                      type="button"
                      className="mc-location-clear"
                      onClick={() => {
                        setLocation("");
                        setSelectedLocation(null);
                        setSuggestions([]);
                        setShowSuggestions(false);
                      }}
                    >
                      ×
                    </button>
                  )}

                </div>

                {showSuggestions && location.trim().length >= 3 && (
                  <div className="mc-location-suggestions">

                    {searchingLocation ? (
                      <div className="mc-suggestion-message">
                        Searching locations...
                      </div>
                    ) : suggestions.length > 0 ? (
                      suggestions.map((item) => (
                        <button
                          type="button"
                          key={item.id}
                          className="mc-suggestion-item"
                          onClick={() => selectLocation(item)}
                        >
                          <span className="mc-suggestion-icon">⌖</span>

                          <span className="mc-suggestion-text">
                            <strong>{item.name}</strong>
                            <small>
                              {[
                                item.city,
                                item.state,
                                item.postcode
                              ].filter(Boolean).join(", ")}
                            </small>
                          </span>
                        </button>
                      ))
                    ) : (
                      <div className="mc-suggestion-message">
                        No matching locations found.
                      </div>
                    )}

                  </div>
                )}

                <button
                  type="button"
                  className="mc-current-location"
                  onClick={handleCurrentLocation}
                  disabled={locationLoading}
                >
                  <span>⌖</span>
                  {locationLoading
                    ? "Detecting your location..."
                    : "Use my current location"}
                </button>

                {selectedLocation && (
                  <div className="mc-selected-location">
                    <span>✓</span>
                    <div>
                      <strong>Location selected</strong>
                      <small>
                        {selectedLocation.displayName}
                      </small>
                    </div>
                  </div>
                )}

              </div>

              <div className="mc-form-group mc-medicine-group">

                <label htmlFor="mcMedicine">
                  Medicine name
                </label>

                <div className="mc-medicine-input">

                  <span>⌕</span>

                  <input
                    id="mcMedicine"
                    type="text"
                    placeholder="Search Paracetamol, Dolo 650..."
                    value={medicine}
                    onChange={(e) => {
                      setMedicine(e.target.value);
                      setError("");
                    }}
                  />

                  {medicine && (
                    <button
                      type="button"
                      onClick={() => setMedicine("")}
                    >
                      ×
                    </button>
                  )}

                </div>

              </div>

              {error && (
                <div className="mc-search-error">
                  {error}
                </div>
              )}

              <button
                type="submit"
                className="mc-search-submit"
              >
                <span>Search medicines</span>
                <span>→</span>
              </button>

            </form>

            <div className="mc-panel-footer">
              Find medicines from pharmacies near your location.
            </div>

          </div>

        </section>

        <section className="mc-benefits">

          <div className="mc-benefit">
            <span className="mc-benefit-icon">⌕</span>
            <div>
              <h3>Search medicines</h3>
              <p>Find medicines by name or brand.</p>
            </div>
          </div>

          <div className="mc-benefit">
            <span className="mc-benefit-icon">₹</span>
            <div>
              <h3>Compare prices</h3>
              <p>Compare prices across pharmacies.</p>
            </div>
          </div>

          <div className="mc-benefit">
            <span className="mc-benefit-icon">⌖</span>
            <div>
              <h3>Find nearby pharmacies</h3>
              <p>Discover local medicine availability.</p>
            </div>
          </div>

        </section>

        <section className="mc-how-section">

          <div className="mc-how-heading">

            <span className="mc-eyebrow">
              HOW MEDCONNECT WORKS
            </span>

            <h2>
              Healthcare search,
              <span> made simpler.</span>
            </h2>

            <p>
              Find the medicine you need in three simple steps.
            </p>

          </div>

          <div className="mc-how-grid">

            <div className="mc-how-card">
              <span className="mc-how-number">01</span>
              <div className="mc-how-icon">⌕</div>
              <h3>Search medicines</h3>
              <p>
                Enter your medicine name and choose your location.
              </p>
            </div>

            <div className="mc-how-card">
              <span className="mc-how-number">02</span>
              <div className="mc-how-icon">▤</div>
              <h3>Compare pharmacies</h3>
              <p>
                Explore medicine availability, prices and pharmacy details.
              </p>
            </div>

            <div className="mc-how-card">
              <span className="mc-how-number">03</span>
              <div className="mc-how-icon">↗</div>
              <h3>Connect and request</h3>
              <p>
                Contact a pharmacy or submit a medicine request.
              </p>
            </div>

          </div>

        </section>

        <section className="mc-request-banner">

          <div>
            <span className="mc-eyebrow">NEED SOMETHING ELSE?</span>

            <h2>Can't find your medicine?</h2>

            <p>
              Send a request to pharmacies and let them help you
              find the medicine you need.
            </p>
          </div>

          <button
            type="button"
            onClick={() => navigate("/request-medicine")}
          >
            Request a medicine <span>→</span>
          </button>

        </section>

      </div>

    </main>
  );
}

export default MedicineSearch;