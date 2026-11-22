import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import {
  signInWithEmailAndPassword,
  signOut
} from "firebase/auth";

import {
  doc,
  getDoc
} from "firebase/firestore";

import { auth, db } from "../../firebase/Firebase";

function Login() {
  const navigate = useNavigate();

  const [loginEmail, setLoginEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // CLEAR OLD SESSION DATA

  const clearSession = () => {
    localStorage.removeItem("isLogin");
    localStorage.removeItem("uid");
    localStorage.removeItem("userType");
    localStorage.removeItem("userName");
    localStorage.removeItem("userEmail");
    localStorage.removeItem("pharmacyId");
    localStorage.removeItem("pharmacyStatus");
  };

  // LOGIN FUNCTION

  const handleLogin = async (e) => {
    e.preventDefault();

    setError("");

    const email = loginEmail.trim().toLowerCase();

    if (!email || !password) {
      setError("Please enter email and password.");
      return;
    }

    try {
      setLoading(true);

      clearSession();

      console.log("========== LOGIN START ==========");

      console.log(
        "FIREBASE PROJECT:",
        auth.app.options.projectId
      );

      // FIREBASE AUTHENTICATION

      const userCredential =
        await signInWithEmailAndPassword(
          auth,
          email,
          password
        );

      const user = userCredential.user;

      console.log("AUTHENTICATION SUCCESS");
      console.log("LOGIN UID:", user.uid);

      // GET USER PROFILE

      const userRef = doc(
        db,
        "users",
        user.uid
      );

      const userSnapshot = await getDoc(userRef);

      if (!userSnapshot.exists()) {
        await signOut(auth);

        setError(
          "Your account profile was not found. Please contact MedConnect support."
        );

        return;
      }

      const userData = userSnapshot.data();

      console.log("USER DATA:", userData);

      // VALIDATE ROLE

      if (
        userData.role !== "user" &&
        userData.role !== "pharmacy" &&
        userData.role !== "admin"
      ) {
        await signOut(auth);

        setError(
          "Invalid account role. Please contact MedConnect support."
        );

        return;
      }

      // ADMIN LOGIN

      if (userData.role === "admin") {

        localStorage.setItem("isLogin", "true");
        localStorage.setItem("uid", user.uid);
        localStorage.setItem("userType", "admin");

        localStorage.setItem(
          "userName",
          userData.name || ""
        );

        localStorage.setItem(
          "userEmail",
          user.email || ""
        );

        console.log("ADMIN LOGIN SUCCESS");

        navigate("/admin-dashboard");

        return;
      }

      // PHARMACY LOGIN VALIDATION

      if (userData.role === "pharmacy") {

        // CHECK USER STATUS

        if (userData.status === "pending") {
          await signOut(auth);

          setError(
            "Your pharmacy application is still under review. You can login after your pharmacy has been approved."
          );

          return;
        }

        if (userData.status === "rejected") {
          await signOut(auth);

          setError(
            "Your pharmacy application was rejected. Please contact MedConnect support."
          );

          return;
        }

        if (userData.status === "suspended") {
          await signOut(auth);

          setError(
            "Your pharmacy account has been suspended. Please contact MedConnect support."
          );

          return;
        }

        if (userData.status !== "approved") {
          await signOut(auth);

          setError(
            "Your pharmacy account has not been approved."
          );

          return;
        }

        // CHECK PHARMACY ID

        if (!userData.pharmacyId) {
          await signOut(auth);

          setError(
            "Your pharmacy account is missing pharmacy information."
          );

          return;
        }

        // FETCH ACTUAL PHARMACY DOCUMENT

        const pharmacyRef = doc(
          db,
          "pharmacies",
          userData.pharmacyId
        );

        const pharmacySnapshot = await getDoc(
          pharmacyRef
        );

        if (!pharmacySnapshot.exists()) {
          await signOut(auth);

          setError(
            "Pharmacy information was not found. Please contact support."
          );

          return;
        }

        const pharmacyData = pharmacySnapshot.data();

        // VERIFY PHARMACY OWNER

        if (pharmacyData.ownerId !== user.uid) {
          await signOut(auth);

          setError(
            "You are not authorized to access this pharmacy."
          );

          return;
        }

        // VERIFY PHARMACY STATUS

        if (pharmacyData.status === "pending") {
          await signOut(auth);

          setError(
            "Your pharmacy application is still pending approval."
          );

          return;
        }

        if (pharmacyData.status === "rejected") {
          await signOut(auth);

          setError(
            "Your pharmacy application has been rejected."
          );

          return;
        }

        if (pharmacyData.status === "suspended") {
          await signOut(auth);

          setError(
            "Your pharmacy has been suspended by the administrator."
          );

          return;
        }

        if (pharmacyData.status !== "approved") {
          await signOut(auth);

          setError(
            "Your pharmacy is not currently approved."
          );

          return;
        }

        // PHARMACY LOGIN SUCCESS

        localStorage.setItem("isLogin", "true");
        localStorage.setItem("uid", user.uid);
        localStorage.setItem("userType", "pharmacy");

        localStorage.setItem(
          "userName",
          userData.name || ""
        );

        localStorage.setItem(
          "userEmail",
          user.email || ""
        );

        localStorage.setItem(
          "pharmacyId",
          userData.pharmacyId
        );

        localStorage.setItem(
          "pharmacyStatus",
          "approved"
        );

        console.log("VERIFIED PHARMACY LOGIN SUCCESS");

        navigate("/pharmacy-dashboard");

        return;
      }

      // NORMAL USER LOGIN

      if (userData.role === "user") {

        if (userData.status !== "active") {
          await signOut(auth);

          setError(
            "Your account is not currently active. Please contact support."
          );

          return;
        }

        localStorage.setItem("isLogin", "true");
        localStorage.setItem("uid", user.uid);
        localStorage.setItem("userType", "user");

        localStorage.setItem(
          "userName",
          userData.name || ""
        );

        localStorage.setItem(
          "userEmail",
          user.email || ""
        );

        console.log("NORMAL USER LOGIN SUCCESS");

        navigate("/");

        return;
      }

    } catch (err) {

      console.error("LOGIN ERROR:", err);

      console.error("ERROR CODE:", err.code);

      console.error("ERROR MESSAGE:", err.message);

      clearSession();

      if (
        err.code === "auth/invalid-credential"
      ) {
        setError("Invalid email or password.");

      } else if (
        err.code === "auth/user-not-found"
      ) {
        setError("No account found with this email.");

      } else if (
        err.code === "auth/wrong-password"
      ) {
        setError("Incorrect password.");

      } else if (
        err.code === "auth/too-many-requests"
      ) {
        setError(
          "Too many login attempts. Please try again later."
        );

      } else {
        setError(
          err.message ||
          "Login failed. Please try again."
        );
      }

    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="auth-page login-page">

      <div className="auth-container">

        {/* LEFT INFORMATION SECTION */}

        <div className="auth-info">

          <span className="section-badge">
            WELCOME TO MEDCONNECT
          </span>

          <h1>
            Find the medicine you need,
            <span> when you need it.</span>
          </h1>

          <p>
            Search medicines, discover nearby
            pharmacies, send medicine requests,
            and manage your prescriptions from
            one place.
          </p>

          <div className="auth-benefits">

            <div className="auth-benefit">
              <span>✓</span>

              <div>
                <strong>
                  Find Medicines
                </strong>

                <p>
                  Search medicines available near you.
                </p>
              </div>
            </div>

            <div className="auth-benefit">
              <span>✓</span>

              <div>
                <strong>
                  Nearby Pharmacies
                </strong>

                <p>
                  Discover pharmacies with
                  available stock.
                </p>
              </div>
            </div>

            <div className="auth-benefit">
              <span>✓</span>

              <div>
                <strong>
                  Easy Requests
                </strong>

                <p>
                  Request medicines directly
                  from pharmacies.
                </p>
              </div>
            </div>

          </div>

        </div>

        {/* LOGIN FORM */}

        <div className="auth-card">

          <div className="auth-card-header">

            <div className="auth-icon">
              🔐
            </div>

            <div>
              <h2>
                Welcome Back
              </h2>

              <p>
                Login to your MedConnect account
              </p>
            </div>

          </div>

          {error && (
            <div className="form-error">
              {error}
            </div>
          )}

          <form
            className="auth-form"
            onSubmit={handleLogin}
          >

            <div className="form-group">

              <label htmlFor="email">
                Email Address
              </label>

              <input
                id="email"
                type="email"
                placeholder="Enter your email"
                value={loginEmail}
                onChange={(e) =>
                  setLoginEmail(e.target.value)
                }
                autoComplete="email"
                disabled={loading}
              />

            </div>

            <div className="form-group">

              <label htmlFor="password">
                Password
              </label>

              <input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) =>
                  setPassword(e.target.value)
                }
                autoComplete="current-password"
                disabled={loading}
              />

            </div>

            <button
              type="submit"
              className="auth-submit"
              disabled={loading}
            >
              {loading
                ? "Logging in..."
                : "Login"}
            </button>

          </form>

          <div className="auth-footer">

            <p>
              Don't have an account?

              <Link to="/register">
                Create Account
              </Link>
            </p>

            <p>
              Are you a pharmacy owner?

              <Link to="/pharmacy-register">
                Partner with MedConnect
              </Link>
            </p>

          </div>

        </div>

      </div>

    </main>
  );
}

export default Login;