import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  createUserWithEmailAndPassword,
  signOut
} from "firebase/auth";
import {
  doc,
  setDoc,
  serverTimestamp
} from "firebase/firestore";

import { auth, db } from "../../firebase/Firebase";

function Register() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: ""
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });

    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const name =
      formData.name.trim();

    const email =
      formData.email.trim().toLowerCase();

    const phone =
      formData.phone.trim();

    if (
      !name ||
      !email ||
      !phone ||
      !formData.password ||
      !formData.confirmPassword
    ) {
      setError(
        "Please fill all fields."
      );
      return;
    }

    if (
      formData.password.length < 6
    ) {
      setError(
        "Password must be at least 6 characters."
      );
      return;
    }

    if (
      formData.password !==
      formData.confirmPassword
    ) {
      setError(
        "Passwords do not match."
      );
      return;
    }

    try {
      setLoading(true);
      setError("");

      const userCredential =
        await createUserWithEmailAndPassword(
          auth,
          email,
          formData.password
        );

      const user =
        userCredential.user;

      await setDoc(
        doc(
          db,
          "users",
          user.uid
        ),
        {
          uid: user.uid,
          name,
          email,
          phone,
          role: "user",
          status: "active",
          createdAt:
            serverTimestamp()
        }
      );

      await signOut(auth);

      localStorage.removeItem(
        "isLogin"
      );

      localStorage.removeItem(
        "uid"
      );

      localStorage.removeItem(
        "userType"
      );

      localStorage.removeItem(
        "userName"
      );

      localStorage.removeItem(
        "userEmail"
      );

      localStorage.removeItem(
        "pharmacyId"
      );

      localStorage.removeItem(
        "pharmacyStatus"
      );

      navigate("/login");

    } catch (err) {
      console.log(
        "REGISTER ERROR:",
        err
      );

      if (
        err.code ===
        "auth/email-already-in-use"
      ) {
        setError(
          "This email is already registered. Please login."
        );
      } else if (
        err.code ===
        "auth/invalid-email"
      ) {
        setError(
          "Please enter a valid email address."
        );
      } else if (
        err.code ===
        "auth/weak-password"
      ) {
        setError(
          "Password must be at least 6 characters."
        );
      } else {
        setError(
          err.message ||
          "Unable to create account."
        );
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="auth-page register-page">

      <section className="auth-container">

        <div className="auth-info">

          <span className="section-badge">
            JOIN MEDCONNECT
          </span>

          <h1>
            Find the medicine
            <span>
              {" "}you need.
            </span>
          </h1>

          <p>
            Create your MedConnect account
            and easily find medicines
            available at nearby pharmacies.
          </p>

          <div className="auth-benefits">

            <div>
              <span>✓</span>
              Find nearby pharmacies
            </div>

            <div>
              <span>✓</span>
              Check medicine availability
            </div>

            <div>
              <span>✓</span>
              Request medicines easily
            </div>

            <div>
              <span>✓</span>
              Upload prescriptions securely
            </div>

          </div>

        </div>

        <div className="auth-card">

          <div className="auth-card-header">

            <div className="auth-icon">
              💊
            </div>

            <h2>
              Create Account
            </h2>

            <p>
              Register as a MedConnect user
            </p>

          </div>

          <form
            className="auth-form"
            onSubmit={handleSubmit}
          >

            <div className="form-group">

              <label>
                Full Name
              </label>

              <input
                type="text"
                name="name"
                placeholder="Enter your name"
                value={
                  formData.name
                }
                onChange={handleChange}
                disabled={loading}
              />

            </div>

            <div className="form-group">

              <label>
                Email Address
              </label>

              <input
                type="email"
                name="email"
                placeholder="Enter your email"
                value={
                  formData.email
                }
                onChange={handleChange}
                disabled={loading}
              />

            </div>

            <div className="form-group">

              <label>
                Phone Number
              </label>

              <input
                type="tel"
                name="phone"
                placeholder="Enter your phone number"
                value={
                  formData.phone
                }
                onChange={handleChange}
                disabled={loading}
              />

            </div>

            <div className="form-group">

              <label>
                Password
              </label>

              <input
                type="password"
                name="password"
                placeholder="Create a password"
                value={
                  formData.password
                }
                onChange={handleChange}
                disabled={loading}
              />

            </div>

            <div className="form-group">

              <label>
                Confirm Password
              </label>

              <input
                type="password"
                name="confirmPassword"
                placeholder="Confirm your password"
                value={
                  formData.confirmPassword
                }
                onChange={handleChange}
                disabled={loading}
              />

            </div>

            {error && (
              <div className="form-error">
                {error}
              </div>
            )}

            <button
              type="submit"
              className="auth-submit"
              disabled={loading}
            >
              {loading
                ? "Creating Account..."
                : "Create Account"}
            </button>

          </form>

          <div className="auth-footer">

            <p>
              Already have an account?{" "}

              <Link to="/login">
                Login
              </Link>
            </p>

          </div>

        </div>

      </section>

    </main>
  );
}

export default Register;