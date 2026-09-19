import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  onAuthStateChanged,
  signOut
} from "firebase/auth";
import {
  doc,
  getDoc
} from "firebase/firestore";

import { auth, db } from "../../firebase/Firebase";

function Header() {
  const navigate = useNavigate();

  const [isLogin, setIsLogin] = useState(false);
  const [userType, setUserType] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(
      auth,
      async (user) => {
        if (!user) {
          setIsLogin(false);
          setUserType("");
          return;
        }

        try {
          const userDoc = await getDoc(
            doc(db, "users", user.uid)
          );

          if (!userDoc.exists()) {
            setIsLogin(false);
            setUserType("");
            return;
          }

          const userData = userDoc.data();

          setIsLogin(true);
          setUserType(userData.role || "");

          localStorage.setItem(
            "isLogin",
            "true"
          );

          localStorage.setItem(
            "uid",
            user.uid
          );

          localStorage.setItem(
            "userType",
            userData.role || ""
          );

          localStorage.setItem(
            "userName",
            userData.name || ""
          );

          localStorage.setItem(
            "userEmail",
            userData.email ||
              user.email ||
              ""
          );

          if (userData.role === "pharmacy") {
            if (userData.pharmacyId) {
              localStorage.setItem(
                "pharmacyId",
                userData.pharmacyId
              );
            }

            if (userData.status) {
              localStorage.setItem(
                "pharmacyStatus",
                userData.status
              );
            }
          }
        } catch (error) {
          console.log(
            "HEADER USER ERROR:",
            error
          );
        }
      }
    );

    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);

      localStorage.clear();

      setIsLogin(false);
      setUserType("");
      setMenuOpen(false);

      navigate("/login");
    } catch (error) {
      console.log(
        "LOGOUT ERROR:",
        error
      );
    }
  };

  const closeMenu = () => {
    setMenuOpen(false);
  };

  const getHomeRoute = () => {
    if (userType === "admin") {
      return "/admin-dashboard";
    }

    if (userType === "pharmacy") {
      return "/pharmacy-dashboard";
    }

    return "/";
  };

  return (
    <header className="main-header">

      <div className="header-container">

        <Link
          to={getHomeRoute()}
          className="header-logo"
          onClick={closeMenu}
        >

          <div className="header-logo-icon">
            💊
          </div>

          <div className="header-logo-text">

            <strong>
              MedConnect
            </strong>

            <span>
              Medicine Availability Finder
            </span>

          </div>

        </Link>

        <button
          type="button"
          className="mobile-menu-btn"
          onClick={() =>
            setMenuOpen(!menuOpen)
          }
        >
          {menuOpen ? "✕" : "☰"}
        </button>

        <nav
          className={
            menuOpen
              ? "header-nav open"
              : "header-nav"
          }
        >

          {userType === "admin" ? (

            <>
              <Link
                to="/admin-dashboard"
                onClick={closeMenu}
              >
                Dashboard
              </Link>

              <Link
                to="/admin-pharmacy-applications"
                onClick={closeMenu}
              >
                Applications
              </Link>

              <Link
                to="/admin-pharmacies"
                onClick={closeMenu}
              >
                Pharmacies
              </Link>

              <Link
                to="/admin-users"
                onClick={closeMenu}
              >
                Users
              </Link>

              <button
                type="button"
                className="header-logout-btn"
                onClick={handleLogout}
              >
                Logout
              </button>
            </>

          ) : userType === "pharmacy" ? (

            <>
              <Link
                to="/pharmacy-dashboard"
                onClick={closeMenu}
              >
                Dashboard
              </Link>

              <Link
                to="/pharmacy-profile"
                onClick={closeMenu}
              >
                My Pharmacy
              </Link>

              <Link
                to="/pharmacy-medicines"
                onClick={closeMenu}
              >
                Medicines
              </Link>

              <Link
                to="/pharmacy-requests"
                onClick={closeMenu}
              >
                Requests
              </Link>

              <Link
                to="/pharmacy-prescriptions"
                onClick={closeMenu}
              >
                Prescriptions
              </Link>

              <button
                type="button"
                className="header-logout-btn"
                onClick={handleLogout}
              >
                Logout
              </button>
            </>

          ) : (

            <>

              <Link
                to="/"
                onClick={closeMenu}
              >
                Home
              </Link>

              <Link
                to="/search"
                onClick={closeMenu}
              >
                Find Medicine
              </Link>

              <Link
                to="/request-medicine"
                onClick={closeMenu}
              >
                Request Medicine
              </Link>

              <Link
                to="/prescription-upload"
                onClick={closeMenu}
              >
                Prescription
              </Link>

              {isLogin ? (

                <button
                  type="button"
                  className="header-logout-btn"
                  onClick={handleLogout}
                >
                  Logout
                </button>

              ) : (

                <div className="header-auth-actions">

                  <Link
                    to="/login"
                    className="header-login-btn"
                    onClick={closeMenu}
                  >
                    Login
                  </Link>

                  <Link
                    to="/register"
                    className="header-register-btn"
                    onClick={closeMenu}
                  >
                    Get Started
                  </Link>

                </div>

              )}

            </>

          )}

        </nav>

      </div>

    </header>
  );
}

export default Header;