import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  addDoc,
  collection,
  doc,
  getDoc,
  serverTimestamp
} from "firebase/firestore";

import { db } from "../../firebase/Firebase";

function AddMedicine() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    medicineName: "",
    dosage: "",
    category: "",
    quantity: "",
    price: "",
    description: ""
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

    if (
      !formData.medicineName.trim() ||
      !formData.dosage.trim() ||
      !formData.category.trim() ||
      formData.quantity === "" ||
      formData.price === ""
    ) {
      setError(
        "Please fill all required fields."
      );
      return;
    }

    const quantity = Number(
      formData.quantity
    );

    const price = Number(
      formData.price
    );

    if (!Number.isFinite(quantity)) {
      setError(
        "Please enter a valid quantity."
      );
      return;
    }

    if (quantity < 0) {
      setError(
        "Quantity cannot be negative."
      );
      return;
    }

    if (!Number.isFinite(price)) {
      setError(
        "Please enter a valid price."
      );
      return;
    }

    if (price < 0) {
      setError(
        "Price cannot be negative."
      );
      return;
    }

    try {
      setLoading(true);
      setError("");

      const uid =
        localStorage.getItem("uid");

      const userType =
        localStorage.getItem("userType");

      if (
        !uid ||
        userType !== "pharmacy"
      ) {
        setError(
          "Pharmacy session not found. Please login again."
        );
        return;
      }

      const userRef = doc(
        db,
        "users",
        uid
      );

      const userSnapshot =
        await getDoc(userRef);

      if (!userSnapshot.exists()) {
        setError(
          "Pharmacy profile not found."
        );
        return;
      }

      const userData =
        userSnapshot.data();

      if (
        userData.role !== "pharmacy" ||
        userData.status !== "approved"
      ) {
        setError(
          "Your pharmacy account is not approved to add medicines."
        );
        return;
      }

      if (!userData.pharmacyId) {
        setError(
          "Your pharmacy ID is missing."
        );
        return;
      }

      const pharmacyId =
        userData.pharmacyId;

      const pharmacyRef = doc(
        db,
        "pharmacies",
        pharmacyId
      );

      const pharmacySnapshot =
        await getDoc(pharmacyRef);

      if (!pharmacySnapshot.exists()) {
        setError(
          "Your pharmacy profile was not found."
        );
        return;
      }

      const pharmacyData =
        pharmacySnapshot.data();

      if (
        pharmacyData.ownerId !== uid
      ) {
        setError(
          "You are not authorized to manage this pharmacy."
        );
        return;
      }

      if (
        pharmacyData.status !==
        "approved"
      ) {
        setError(
          "Your pharmacy is not approved."
        );
        return;
      }

      await addDoc(
        collection(db, "medicines"),
        {
          pharmacyId,

          pharmacyName:
            pharmacyData.name || "",

          pharmacyAddress:
            pharmacyData.address || "",

          pharmacyCity:
            pharmacyData.city || "",

          pharmacyState:
            pharmacyData.state || "",

          pharmacyPhone:
            pharmacyData.phone || "",

          medicineName:
            formData.medicineName.trim(),

          dosage:
            formData.dosage.trim(),

          category:
            formData.category.trim(),

          quantity,

          price,

          availability:
            quantity > 0
              ? "Available"
              : "Out of Stock",

          description:
            formData.description.trim(),

          createdAt:
            serverTimestamp(),

          updatedAt:
            serverTimestamp()
        }
      );

      navigate(
        "/pharmacy-medicines"
      );
    } catch (err) {
      console.error(
        "ADD MEDICINE ERROR:",
        err
      );

      setError(
        err.message ||
          "Unable to add medicine."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="admin-page">

      <section className="admin-hero">

        <div className="admin-hero-content">

          <span className="section-badge">
            INVENTORY MANAGEMENT
          </span>

          <h1>
            Add Medicine
          </h1>

          <p>
            Add a medicine to your pharmacy
            inventory and make its availability
            visible to users.
          </p>

        </div>

      </section>

      <section className="admin-form-container">

        <div className="admin-form-card">

          <div className="admin-form-header">

            <div>

              <span className="page-badge">
                MEDICINE DETAILS
              </span>

              <h2>
                Add New Medicine
              </h2>

              <p>
                Enter the medicine and stock
                information below.
              </p>

            </div>

            <div className="admin-form-icon">
              💊
            </div>

          </div>

          <form
            className="admin-form"
            onSubmit={handleSubmit}
          >

            <div className="admin-form-grid">

              <div className="form-group">

                <label>
                  Medicine Name *
                </label>

                <input
                  type="text"
                  name="medicineName"
                  value={
                    formData.medicineName
                  }
                  onChange={handleChange}
                  placeholder="Example: Paracetamol"
                />

              </div>

              <div className="form-group">

                <label>
                  Dosage *
                </label>

                <input
                  type="text"
                  name="dosage"
                  value={
                    formData.dosage
                  }
                  onChange={handleChange}
                  placeholder="Example: 500mg"
                />

              </div>

              <div className="form-group">

                <label>
                  Category *
                </label>

                <input
                  type="text"
                  name="category"
                  value={
                    formData.category
                  }
                  onChange={handleChange}
                  placeholder="Example: Pain Relief"
                />

              </div>

              <div className="form-group">

                <label>
                  Quantity *
                </label>

                <input
                  type="number"
                  min="0"
                  name="quantity"
                  value={
                    formData.quantity
                  }
                  onChange={handleChange}
                  placeholder="Enter available stock"
                />

              </div>

              <div className="form-group">

                <label>
                  Price *
                </label>

                <input
                  type="number"
                  min="0"
                  step="0.01"
                  name="price"
                  value={
                    formData.price
                  }
                  onChange={handleChange}
                  placeholder="Enter price"
                />

              </div>

              <div className="form-group">

                <label>
                  Availability
                </label>

                <input
                  type="text"
                  value={
                    formData.quantity === ""
                      ? "Enter quantity"
                      : Number(
                          formData.quantity
                        ) > 0
                        ? "Available"
                        : "Out of Stock"
                  }
                  readOnly
                />

              </div>

              <div className="form-group admin-full-width">

                <label>
                  Description
                </label>

                <textarea
                  name="description"
                  value={
                    formData.description
                  }
                  onChange={handleChange}
                  placeholder="Enter medicine description"
                  rows="5"
                />

              </div>

            </div>

            {error && (
              <div className="form-error">
                {error}
              </div>
            )}

            <div className="admin-form-actions">

              <button
                type="button"
                className="admin-cancel-btn"
                onClick={() =>
                  navigate(
                    "/pharmacy-medicines"
                  )
                }
              >
                Cancel
              </button>

              <button
                type="submit"
                className="auth-submit admin-save-btn"
                disabled={loading}
              >
                {loading
                  ? "Adding Medicine..."
                  : "Add Medicine"}
              </button>

            </div>

          </form>

        </div>

      </section>

    </main>
  );
}

export default AddMedicine;