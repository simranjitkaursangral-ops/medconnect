import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";

import { auth } from "../../firebase/Firebase";

function Footer() {
  const [userType, setUserType] = useState(
    localStorage.getItem("userType") || ""
  );

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) {
        setUserType("");
        return;
      }

      setUserType(localStorage.getItem("userType") || "");
    });

    return () => unsubscribe();
  }, []);

  return (
    <footer className="footer">

      <div className="footer-container">

        <div className="footer-brand">

          <div className="footer-logo">
            <span>💊</span>
            <h2>MedConnect</h2>
          </div>

          <p>
            Find medicines available at nearby pharmacies
            quickly and easily.
          </p>

        </div>

        <div className="footer-links">

          <h3>Quick Links</h3>

          <Link to="/">Home</Link>

          <Link to="/search">
            Find Medicine
          </Link>

          <Link to="/request-medicine">
            Request Medicine
          </Link>

          <Link to="/prescription-upload">
            Prescription
          </Link>

        </div>

        <div className="footer-links">

          <h3>
            {userType === "admin"
              ? "Pharmacy Management"
              : "My Account"}
          </h3>

          {userType === "admin" ? (
            <>
              <Link to="/admin-dashboard">
                Dashboard
              </Link>

              <Link to="/admin-pharmacy">
                Pharmacy Profile
              </Link>

              <Link to="/admin-medicines">
                Manage Medicines
              </Link>

              <Link to="/admin-requests">
                Medicine Requests
              </Link>

              <Link to="/admin-prescriptions">
                Prescriptions
              </Link>
            </>
          ) : (
            <>
              <Link to="/profile">
                My Profile
              </Link>

              <Link to="/my-requests">
                My Requests
              </Link>

              <Link to="/my-prescriptions">
                My Prescriptions
              </Link>

              {!userType && (
                <Link to="/login">
                  Login
                </Link>
              )}
            </>
          )}

        </div>

        <div className="footer-contact">

          <h3>Need Help?</h3>

          <p>
            📧 support@medconnect.com
          </p>

          <p>
            📞 +91 98765 43210
          </p>

        </div>

      </div>

      <div className="footer-bottom">

        <p>
          © 2026 MedConnect. All rights reserved.
        </p>

      </div>

    </footer>
  );
}

export default Footer;