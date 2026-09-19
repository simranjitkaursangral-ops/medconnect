import { Link } from "react-router-dom";

function Home() {
  return (
    <main className="home-page">

      <section className="home-hero">

        <div className="home-hero-container">

          <div className="home-hero-content">

            <span className="home-badge">
              💊 MEDICINE AVAILABILITY FINDER
            </span>

            <h1>
              Find the medicine
              <br />
              you need, <span>when you need it.</span>
            </h1>

            <p>
              Search for medicines available at nearby pharmacies,
              check availability, send requests, and upload
              prescriptions from one simple platform.
            </p>

            <div className="home-hero-buttons">

              <Link
                to="/search"
                className="home-primary-btn"
              >
                Find Medicine →
              </Link>

              <Link
                to="/prescription-upload"
                className="home-secondary-btn"
              >
                Upload Prescription
              </Link>

            </div>

            <div className="home-trust">

              <div className="home-trust-item">
                <span>✓</span>
                Verified pharmacies
              </div>

              <div className="home-trust-item">
                <span>✓</span>
                Real-time availability
              </div>

              <div className="home-trust-item">
                <span>✓</span>
                Easy medicine requests
              </div>

            </div>

          </div>

          <div className="home-hero-visual">

            <div className="home-card-main">

              <div className="home-card-top">
                <span>Medicine Search</span>
                <span className="home-live">
                  ● Live
                </span>
              </div>

              <div className="home-search-box">
                <span>🔍</span>
                <span>Search medicine...</span>
              </div>

              <div className="home-medicine-card">

                <div className="home-medicine-icon">
                  💊
                </div>

                <div className="home-medicine-info">
                  <strong>Paracetamol 500mg</strong>
                  <span>Tablet • Pain Relief</span>
                </div>

                <div className="home-available">
                  Available
                </div>

              </div>

              <div className="home-pharmacy-card">

                <div className="home-pharmacy-icon">
                  🏥
                </div>

                <div>
                  <strong>Nearby Pharmacy</strong>
                  <span>0.8 km away</span>
                </div>

                <span className="home-arrow">
                  →
                </span>

              </div>

            </div>

            <div className="home-floating-card home-floating-one">
              <span>📍</span>
              <div>
                <strong>Nearby</strong>
                <small>Pharmacies</small>
              </div>
            </div>

            <div className="home-floating-card home-floating-two">
              <span>✓</span>
              <div>
                <strong>Medicine</strong>
                <small>Available</small>
              </div>
            </div>

          </div>

        </div>

      </section>

      <section className="home-features">

        <div className="home-section-heading">

          <span>WHAT YOU CAN DO</span>

          <h2>
            Everything you need to find your medicine
          </h2>

          <p>
            MedConnect connects users with pharmacies and
            makes medicine availability easier to check.
          </p>

        </div>

        <div className="home-feature-grid">

          <div className="home-feature-card">
            <div className="home-feature-icon">🔍</div>
            <h3>Find Medicine</h3>
            <p>
              Search for a medicine and discover pharmacies
              where it is currently available.
            </p>
            <Link to="/search">Search Medicine →</Link>
          </div>

          <div className="home-feature-card">
            <div className="home-feature-icon">📍</div>
            <h3>Nearby Pharmacies</h3>
            <p>
              Find pharmacies near your location and
              compare their medicine availability.
            </p>
            <Link to="/search">Find Nearby →</Link>
          </div>

          <div className="home-feature-card">
            <div className="home-feature-icon">📋</div>
            <h3>Request Medicine</h3>
            <p>
              Can't find your medicine? Send a request
              directly to a selected pharmacy.
            </p>
            <Link to="/request-medicine">
              Make Request →
            </Link>
          </div>

          <div className="home-feature-card">
            <div className="home-feature-icon">📄</div>
            <h3>Upload Prescription</h3>
            <p>
              Upload your prescription and send it to a
              pharmacy for review.
            </p>
            <Link to="/prescription-upload">
              Upload Now →
            </Link>
          </div>

        </div>

      </section>

      <section className="home-how">

        <div className="home-section-heading">

          <span>HOW IT WORKS</span>

          <h2>
            Find your medicine in four simple steps
          </h2>

        </div>

        <div className="home-steps">

          <div className="home-step">
            <div className="home-step-number">01</div>
            <div>
              <h3>Search</h3>
              <p>
                Enter the name of the medicine you need.
              </p>
            </div>
          </div>

          <div className="home-step">
            <div className="home-step-number">02</div>
            <div>
              <h3>Compare</h3>
              <p>
                Check available pharmacies and stock.
              </p>
            </div>
          </div>

          <div className="home-step">
            <div className="home-step-number">03</div>
            <div>
              <h3>Locate</h3>
              <p>
                Find the pharmacy closest to you.
              </p>
            </div>
          </div>

          <div className="home-step">
            <div className="home-step-number">04</div>
            <div>
              <h3>Request</h3>
              <p>
                Request the medicine when it is unavailable.
              </p>
            </div>
          </div>

        </div>

      </section>

      <section className="home-cta">

        <div className="home-cta-content">

          <span>MEDCONNECT</span>

          <h2>
            Don't waste time searching everywhere.
          </h2>

          <p>
            Find available medicines and nearby pharmacies
            from one convenient platform.
          </p>

          <Link
            to="/search"
            className="home-cta-btn"
          >
            Search Medicine →
          </Link>

        </div>

      </section>

    </main>
  );
}

export default Home;