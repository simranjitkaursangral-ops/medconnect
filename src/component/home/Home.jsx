import { Link } from "react-router-dom";

function Home() {
  return (
    <main className="mc-home">

      {/* HERO SECTION */}
      <section className="mc-hero">
        <div className="mc-hero-container">

          <div className="mc-hero-content">

            <span className="mc-eyebrow">
              HEALTHCARE, MADE SIMPLER
            </span>

            <h1>
              The right medicine.
              <br />
              <span>Without the search.</span>
            </h1>

            <p>
              Finding essential medicines shouldn't be difficult.
              Search for medicines, check their availability and
              connect with pharmacies through MedConnect.
            </p>

            <div className="mc-hero-buttons">

              <Link to="/search" className="mc-primary-btn">
                Find your medicine <span>→</span>
              </Link>

              <Link
                to="/prescription-upload"
                className="mc-secondary-btn"
              >
                Upload prescription ↗
              </Link>

            </div>

            <div className="mc-hero-caption">
              A convenient way to manage your medicine needs.
            </div>

          </div>

          {/* SIMPLE TYPOGRAPHIC VISUAL */}
          <div className="mc-hero-visual">

            <div className="mc-visual-circle">
              <span>Rx</span>
            </div>

            <div className="mc-visual-text">
              <span>MEDCONNECT</span>
              <h2>
                Better access.
                <br />
                Better care.
              </h2>
              <p>
                Making medicine access
                simpler and more convenient.
              </p>
            </div>

            <div className="mc-visual-decoration"></div>

          </div>

        </div>
      </section>


      {/* HIGHLIGHT STRIP */}
      <section className="mc-highlight-strip">

        <div className="mc-highlight-item">
          <span>01</span>
          <p>Search medicines</p>
        </div>

        <div className="mc-highlight-item">
          <span>02</span>
          <p>Check availability</p>
        </div>

        <div className="mc-highlight-item">
          <span>03</span>
          <p>Get assistance</p>
        </div>

      </section>


      {/* SERVICES */}
      <section className="mc-services">

        <div className="mc-services-heading">

          <div>
            <span className="mc-section-label">
              WHAT WE OFFER
            </span>

            <h2>
              Healthcare access,
              <br />
              <span>made convenient.</span>
            </h2>
          </div>

          <p>
            Everything you need to make your medicine search
            easier, all through one simple platform.
          </p>

        </div>


        <div className="mc-service-grid">

          <Link to="/search" className="mc-service-card">

            <span className="mc-card-number">01</span>

            <div>
              <h3>Medicine Search</h3>
              <p>
                Search for medicines and check their
                availability at registered pharmacies.
              </p>
            </div>

            <span className="mc-card-arrow">↗</span>

          </Link>


          <Link to="/request-medicine" className="mc-service-card">

            <span className="mc-card-number">02</span>

            <div>
              <h3>Medicine Requests</h3>
              <p>
                Request medicines when the product
                you need is currently unavailable.
              </p>
            </div>

            <span className="mc-card-arrow">↗</span>

          </Link>


          <Link
            to="/prescription-upload"
            className="mc-service-card"
          >

            <span className="mc-card-number">03</span>

            <div>
              <h3>Prescription Support</h3>
              <p>
                Share your prescription with a pharmacy
                for review and further assistance.
              </p>
            </div>

            <span className="mc-card-arrow">↗</span>

          </Link>


          <div className="mc-service-card mc-service-static">

            <span className="mc-card-number">04</span>

            <div>
              <h3>Pharmacy Connection</h3>
              <p>
                Connect with registered pharmacy partners
                for your medicine requirements.
              </p>
            </div>

            <span className="mc-card-arrow">+</span>

          </div>

        </div>

      </section>


      {/* HOW IT WORKS */}
      <section className="mc-process">

        <div className="mc-process-intro">

          <span className="mc-section-label">
            HOW IT WORKS
          </span>

          <h2>
            Simple steps.
            <br />
            <span>Less hassle.</span>
          </h2>

          <p>
            MedConnect makes it easier to find medicines
            and get connected with pharmacies.
          </p>

          <Link to="/search" className="mc-process-link">
            Start searching →
          </Link>

        </div>


        <div className="mc-steps">

          <div className="mc-step">
            <span>01</span>
            <h3>Search</h3>
            <p>Enter the medicine name.</p>
          </div>

          <div className="mc-step">
            <span>02</span>
            <h3>Check</h3>
            <p>Explore available medicines.</p>
          </div>

          <div className="mc-step">
            <span>03</span>
            <h3>Connect</h3>
            <p>Choose a pharmacy.</p>
          </div>

          <div className="mc-step">
            <span>04</span>
            <h3>Get Support</h3>
            <p>Follow up on your request.</p>
          </div>

        </div>

      </section>


      {/* FINAL CTA */}
      <section className="mc-final-section">

        <div className="mc-final-content">

          <span>YOUR HEALTH MATTERS</span>

          <h2>
            Finding medicines
            <br />
            can be simpler.
          </h2>

          <p>
            Start your search with MedConnect
            and make your medicine journey easier.
          </p>

          <Link to="/search" className="mc-final-button">
            Explore medicines <span>→</span>
          </Link>

        </div>

        <div className="mc-final-side">
          <span>MC.</span>
          <p>Care that connects.</p>
        </div>

      </section>

    </main>
  );
}

export default Home;