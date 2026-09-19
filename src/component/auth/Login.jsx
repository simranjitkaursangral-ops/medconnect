import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  signInWithEmailAndPassword,
  signOut
} from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

import { auth, db } from "../../firebase/Firebase";


function Login() {
  const navigate = useNavigate();

  const [loginEmail, setLoginEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();

    setError("");

    const email = loginEmail.trim();

    if (!email || !password) {
      setError("Please enter email and password.");
      return;
    }

    try {
      setLoading(true);

      console.log("========== LOGIN START ==========");
      console.log(
        "🔥 FIREBASE PROJECT:",
        auth.app.options.projectId
      );
      console.log("🔥 LOGIN EMAIL:", email);

      const userCredential =
        await signInWithEmailAndPassword(
          auth,
          email,
          password
        );

      const user = userCredential.user;

      console.log("🔥 AUTHENTICATION SUCCESS");
      console.log("🔥 FIREBASE LOGIN UID:", user.uid);
      console.log(
        "🔥 FIREBASE LOGIN EMAIL:",
        user.email
      );

      const userRef = doc(
        db,
        "users",
        user.uid
      );

      const userSnapshot =
        await getDoc(userRef);

      console.log(
        "🔥 FIRESTORE PROFILE EXISTS:",
        userSnapshot.exists()
      );

      if (!userSnapshot.exists()) {
        await signOut(auth);

        setError(
          "Your account profile was not found. Please contact MedConnect support."
        );

        return;
      }

      const userData =
        userSnapshot.data();

      console.log(
        "🔥 FIRESTORE USER DATA:",
        userData
      );

      console.log(
        "🔥 FIRESTORE ROLE:",
        userData.role
      );

      console.log(
        "🔥 FIRESTORE STATUS:",
        userData.status
      );

      console.log(
        "🔥 FIRESTORE PHARMACY ID:",
        userData.pharmacyId
      );


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


      if (userData.role === "pharmacy") {

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

        if (userData.status !== "approved") {
          await signOut(auth);

          setError(
            "Your pharmacy account has not been approved yet."
          );

          return;
        }

        if (!userData.pharmacyId) {
          await signOut(auth);

          setError(
            "Your pharmacy account is missing pharmacy information."
          );

          return;
        }
      }


      if (userData.role === "admin") {

        console.log(
          "👑 PLATFORM ADMIN LOGIN"
        );

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
          "admin"
        );

        localStorage.setItem(
          "userName",
          userData.name || ""
        );

        localStorage.setItem(
          "userEmail",
          user.email || ""
        );

        navigate("/admin-dashboard");

        return;
      }


      if (userData.role === "pharmacy") {

        console.log(
          "🏥 VERIFIED PHARMACY LOGIN"
        );

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
          "pharmacy"
        );

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

        navigate("/pharmacy-dashboard");

        return;
      }


      if (userData.role === "user") {

        console.log(
          "👤 NORMAL USER LOGIN"
        );

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
          "user"
        );

        localStorage.setItem(
          "userName",
          userData.name || ""
        );

        localStorage.setItem(
          "userEmail",
          user.email || ""
        );

        navigate("/");

        return;
      }

    } catch (err) {

      console.error(
        "❌ LOGIN ERROR:",
        err
      );

      console.error(
        "❌ ERROR CODE:",
        err.code
      );

      console.error(
        "❌ ERROR MESSAGE:",
        err.message
      );

      if (
        err.code ===
        "auth/invalid-credential"
      ) {
        setError(
          "Invalid email or password."
        );
      } else if (
        err.code ===
        "auth/user-not-found"
      ) {
        setError(
          "No account found with this email."
        );
      } else if (
        err.code ===
        "auth/wrong-password"
      ) {
        setError(
          "Incorrect password."
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
                  setLoginEmail(
                    e.target.value
                  )
                }
                autoComplete="email"
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
                  setPassword(
                    e.target.value
                  )
                }
                autoComplete="current-password"
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