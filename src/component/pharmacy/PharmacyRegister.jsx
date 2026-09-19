import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { createUserWithEmailAndPassword } from "firebase/auth";
import {
  collection,
  doc,
  setDoc,
  serverTimestamp
} from "firebase/firestore";

import { auth, db } from "../../firebase/Firebase";

function PharmacyRegister() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    ownerName: "",
    pharmacyName: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    state: "",
    country: "India",
    licenceNumber: "",
    password: "",
    confirmPassword: ""
  });

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });

    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const ownerName = formData.ownerName.trim();
    const pharmacyName = formData.pharmacyName.trim();
    const email = formData.email.trim().toLowerCase();
    const phone = formData.phone.trim();
    const address = formData.address.trim();
    const city = formData.city.trim();
    const state = formData.state.trim();
    const country = formData.country.trim();
    const licenceNumber = formData.licenceNumber.trim();

    if (
      !ownerName ||
      !pharmacyName ||
      !email ||
      !phone ||
      !address ||
      !city ||
      !state ||
      !country ||
      !licenceNumber ||
      !formData.password ||
      !formData.confirmPassword
    ) {
      setError("Please fill all fields.");
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (formData.password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    try {
      setLoading(true);
      setError("");
      setSuccess("");

      const userCredential =
        await createUserWithEmailAndPassword(
          auth,
          email,
          formData.password
        );

      const user = userCredential.user;

      const pharmacyRef = doc(
        collection(db, "pharmacies")
      );

      const pharmacyId = pharmacyRef.id;

      await setDoc(
        doc(db, "users", user.uid),
        {
          uid: user.uid,
          name: ownerName,
          email,
          phone,
          role: "pharmacy",
          pharmacyId,
          status: "pending",
          createdAt: serverTimestamp()
        }
      );

      await setDoc(
        pharmacyRef,
        {
          pharmacyId,
          ownerId: user.uid,
          ownerName,
          name: pharmacyName,
          email,
          phone,
          address,
          city,
          state,
          country,
          licenceNumber,
          status: "pending",
          createdAt: serverTimestamp()
        }
      );

      setSuccess(
        "Pharmacy application submitted successfully. Your application is pending admin approval."
      );

      setFormData({
        ownerName: "",
        pharmacyName: "",
        email: "",
        phone: "",
        address: "",
        city: "",
        state: "",
        country: "India",
        licenceNumber: "",
        password: "",
        confirmPassword: ""
      });

      setTimeout(() => {
        navigate("/login");
      }, 2500);

    } catch (err) {
      console.error(
        "PHARMACY REGISTER ERROR:",
        err
      );

      if (
        err.code === "auth/email-already-in-use"
      ) {
        setError(
          "This email is already registered."
        );
      } else if (
        err.code === "auth/invalid-email"
      ) {
        setError(
          "Please enter a valid email."
        );
      } else if (
        err.code === "auth/weak-password"
      ) {
        setError(
          "Password must be at least 6 characters."
        );
      } else if (
        err.code === "permission-denied"
      ) {
        setError(
          "Firebase permission denied."
        );
      } else {
        setError(
          err.message ||
          "Registration failed."
        );
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="pharmacy-register-page">

      <div className="pharmacy-register-container">

        <div className="pharmacy-register-header">

          <span className="section-badge">
            PHARMACY PARTNER
          </span>

          <h1>
            Register Your Pharmacy
          </h1>

          <p>
            Submit your pharmacy details for verification.
          </p>

        </div>

        <div className="pharmacy-register-card">

          {error && (
            <div className="form-error">
              {error}
            </div>
          )}

          {success && (
            <div className="form-success">
              {success}
            </div>
          )}

          <form
            className="pharmacy-register-form"
            onSubmit={handleSubmit}
          >

            <div className="form-group">
              <label>Owner Name</label>

              <input
                type="text"
                name="ownerName"
                value={formData.ownerName}
                onChange={handleChange}
                placeholder="Enter owner name"
              />
            </div>

            <div className="form-group">
              <label>Pharmacy Name</label>

              <input
                type="text"
                name="pharmacyName"
                value={formData.pharmacyName}
                onChange={handleChange}
                placeholder="Enter pharmacy name"
              />
            </div>

            <div className="form-group">
              <label>Email</label>

              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="Enter email"
              />
            </div>

            <div className="form-group">
              <label>Phone</label>

              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="Enter phone number"
              />
            </div>

            <div className="form-group">
              <label>Address</label>

              <textarea
                name="address"
                value={formData.address}
                onChange={handleChange}
                placeholder="Enter complete pharmacy address"
                rows="3"
              />
            </div>

            <div className="form-group">
              <label>City</label>

              <input
                type="text"
                name="city"
                value={formData.city}
                onChange={handleChange}
                placeholder="Enter city"
              />
            </div>

            <div className="form-group">
              <label>State</label>

              <input
                type="text"
                name="state"
                value={formData.state}
                onChange={handleChange}
                placeholder="Enter state"
              />
            </div>

            <div className="form-group">
              <label>Country</label>

              <input
                type="text"
                name="country"
                value={formData.country}
                onChange={handleChange}
                placeholder="Enter country"
              />
            </div>

            <div className="form-group">
              <label>Pharmacy Licence Number</label>

              <input
                type="text"
                name="licenceNumber"
                value={formData.licenceNumber}
                onChange={handleChange}
                placeholder="Enter licence number"
              />
            </div>

            <div className="form-group">
              <label>Password</label>

              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Create password"
              />
            </div>

            <div className="form-group">
              <label>Confirm Password</label>

              <input
                type="password"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder="Confirm password"
              />
            </div>

            <button
              type="submit"
              className="pharmacy-register-submit"
              disabled={loading}
            >
              {loading
                ? "Submitting Application..."
                : "Submit Pharmacy Application"}
            </button>

          </form>

          <div className="pharmacy-register-footer">

            <span>
              Already have an account?
            </span>

            <Link to="/login">
              Login
            </Link>

          </div>

        </div>

      </div>

    </div>
  );
}

export default PharmacyRegister;