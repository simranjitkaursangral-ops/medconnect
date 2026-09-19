import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  doc,
  getDoc,
  updateDoc,
  serverTimestamp
} from "firebase/firestore";

import { db } from "../../firebase/Firebase";

function UpdateStock() {
  const navigate = useNavigate();
  const { id } = useParams();

  const [formData, setFormData] = useState({
    medicineName: "",
    dosage: "",
    category: "",
    quantity: "",
    price: "",
    description: ""
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    loadMedicine();
  }, [id]);

  const verifyPharmacy = async () => {
    const uid =
      localStorage.getItem("uid");

    const userType =
      localStorage.getItem("userType");

    if (
      !uid ||
      userType !== "pharmacy"
    ) {
      throw new Error(
        "Pharmacy session not found. Please login again."
      );
    }

    const userSnapshot =
      await getDoc(
        doc(db, "users", uid)
      );

    if (!userSnapshot.exists()) {
      throw new Error(
        "Pharmacy profile not found."
      );
    }

    const userData =
      userSnapshot.data();

    if (
      userData.role !== "pharmacy" ||
      userData.status !== "approved" ||
      !userData.pharmacyId
    ) {
      throw new Error(
        "You are not authorized to manage medicines."
      );
    }

    const pharmacySnapshot =
      await getDoc(
        doc(
          db,
          "pharmacies",
          userData.pharmacyId
        )
      );

    if (!pharmacySnapshot.exists()) {
      throw new Error(
        "Your pharmacy profile was not found."
      );
    }

    const pharmacyData =
      pharmacySnapshot.data();

    if (
      pharmacyData.ownerId !== uid
    ) {
      throw new Error(
        "You are not authorized to manage this pharmacy."
      );
    }

    if (
      pharmacyData.status !==
      "approved"
    ) {
      throw new Error(
        "Your pharmacy is not approved."
      );
    }

    return {
      uid,
      pharmacyId:
        userData.pharmacyId
    };
  };

  const loadMedicine = async () => {
    try {
      setLoading(true);
      setError("");

      const pharmacy =
        await verifyPharmacy();

      const medicineSnapshot =
        await getDoc(
          doc(db, "medicines", id)
        );

      if (!medicineSnapshot.exists()) {
        setError(
          "Medicine not found."
        );
        return;
      }

      const medicineData =
        medicineSnapshot.data();

      if (
        medicineData.pharmacyId !==
        pharmacy.pharmacyId
      ) {
        setError(
          "You are not authorized to update this medicine."
        );
        return;
      }

      setFormData({
        medicineName:
          medicineData.medicineName ||
          "",

        dosage:
          medicineData.dosage ||
          "",

        category:
          medicineData.category ||
          "",

        quantity:
          medicineData.quantity ??
          "",

        price:
          medicineData.price ??
          "",

        description:
          medicineData.description ||
          ""
      });
    } catch (err) {
      console.error(
        "LOAD MEDICINE ERROR:",
        err
      );

      setError(
        err.message ||
          "Unable to load medicine."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]:
        e.target.value
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

    const quantity =
      Number(formData.quantity);

    const price =
      Number(formData.price);

    if (
      !Number.isFinite(quantity)
    ) {
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
      setSaving(true);
      setError("");

      const pharmacy =
        await verifyPharmacy();

      const medicineRef =
        doc(
          db,
          "medicines",
          id
        );

      const medicineSnapshot =
        await getDoc(
          medicineRef
        );

      if (!medicineSnapshot.exists()) {
        setError(
          "Medicine not found."
        );
        return;
      }

      const medicineData =
        medicineSnapshot.data();

      if (
        medicineData.pharmacyId !==
        pharmacy.pharmacyId
      ) {
        setError(
          "You are not authorized to update this medicine."
        );
        return;
      }

      await updateDoc(
        medicineRef,
        {
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

          updatedAt:
            serverTimestamp()
        }
      );

      navigate(
        "/pharmacy-medicines"
      );
    } catch (err) {
      console.error(
        "UPDATE MEDICINE ERROR:",
        err
      );

      setError(
        err.message ||
          "Unable to update medicine."
      );
    } finally {
      setSaving(false);
    }
  };

  const availability =
    formData.quantity === ""
      ? "Enter quantity"
      : Number(formData.quantity) > 0
        ? "Available"
        : "Out of Stock";

  if (loading) {
    return (
      <main className="update-stock-page">

        <div className="update-stock-loading">

          <div className="update-stock-spinner"></div>

          <h3>
            Loading medicine...
          </h3>

          <p>
            Please wait while we load the
            medicine details.
          </p>

        </div>

      </main>
    );
  }

  return (
    <main className="update-stock-page">

      <div className="update-stock-container">

        <section className="update-stock-hero">

          <div className="update-stock-hero-content">

            <span className="update-stock-badge">
              INVENTORY MANAGEMENT
            </span>

            <h1>
              Update Medicine
            </h1>

            <p>
              Update medicine details, stock,
              price, and availability for your
              pharmacy.
            </p>

          </div>

          <div className="update-stock-hero-icon">
            ✏️
          </div>

        </section>

        <section className="update-stock-form-section">

          <div className="update-stock-card">

            <div className="update-stock-card-header">

              <div>

                <span className="update-stock-label">
                  MEDICINE DETAILS
                </span>

                <h2>
                  Update Medicine Information
                </h2>

                <p>
                  Make the required changes to
                  your medicine inventory.
                </p>

              </div>

              <div className="update-stock-icon">
                💊
              </div>

            </div>

            <form
              className="update-stock-form"
              onSubmit={handleSubmit}
            >

              <div className="update-stock-grid">

                <div className="update-stock-field">

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

                <div className="update-stock-field">

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

                <div className="update-stock-field">

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

                <div className="update-stock-field">

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
                    placeholder="Enter stock quantity"
                  />

                </div>

                <div className="update-stock-field">

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
                    placeholder="Enter medicine price"
                  />

                </div>

                <div className="update-stock-field">

                  <label>
                    Availability
                  </label>

                  <input
                    type="text"
                    value={availability}
                    readOnly
                    className={
                      availability ===
                      "Available"
                        ? "update-availability available"
                        : availability ===
                          "Out of Stock"
                          ? "update-availability out"
                          : "update-availability"
                    }
                  />

                </div>

                <div className="update-stock-field full-width">

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
                <div className="update-stock-error">
                  {error}
                </div>
              )}

              <div className="update-stock-actions">

                <button
                  type="button"
                  className="update-stock-cancel"
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
                  className="update-stock-submit"
                  disabled={saving}
                >
                  {saving
                    ? "Saving Changes..."
                    : "Save Changes"}
                </button>

              </div>

            </form>

          </div>

        </section>

      </div>

    </main>
  );
}

export default UpdateStock;