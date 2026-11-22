import { useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  addDoc,
  collection,
  doc,
  getDoc,
  serverTimestamp
} from "firebase/firestore";

import {
  ref,
  uploadBytes,
  getDownloadURL
} from "firebase/storage";

import { db, storage } from "../../firebase/Firebase";

function AddMedicine() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    medicineName: "",
    brand: "",
    manufacturer: "",
    dosage: "",
    dosageForm: "",
    packSize: "",
    category: "",
    composition: "",
    uses: "",
    quantity: "",
    mrp: "",
    price: "",
    expiryDate: "",
    prescriptionRequired: "No",
    storageInstructions: "",
    sideEffects: "",
    directionsForUse: "",
    description: ""
  });

  const [medicineImage, setMedicineImage] = useState(null);
  const [imagePreview, setImagePreview] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // HANDLE INPUT
  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value
    }));

    setError("");
  };

  // HANDLE IMAGE
  const handleImageChange = (e) => {
    const file = e.target.files[0];

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Please select a valid image.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("Image size should not exceed 5 MB.");
      return;
    }

    setMedicineImage(file);
    setImagePreview(URL.createObjectURL(file));

    setError("");
  };

  // ADD MEDICINE
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (
      !formData.medicineName.trim() ||
      !formData.dosage.trim() ||
      !formData.category.trim() ||
      formData.quantity === "" ||
      formData.price === ""
    ) {
      setError("Please fill all required fields.");
      return;
    }

    const quantity = Number(formData.quantity);
    const price = Number(formData.price);
    const mrp = formData.mrp === ""
      ? null
      : Number(formData.mrp);

    if (
      !Number.isInteger(quantity) ||
      quantity < 0
    ) {
      setError("Please enter a valid whole-number quantity.");
      return;
    }

    if (!Number.isFinite(price) || price < 0) {
      setError("Please enter a valid selling price.");
      return;
    }

    if (
      mrp !== null &&
      (!Number.isFinite(mrp) || mrp < 0)
    ) {
      setError("Please enter a valid MRP.");
      return;
    }

    if (mrp !== null && price > mrp) {
      setError("Selling price cannot be greater than MRP.");
      return;
    }

    if (formData.expiryDate) {
      const expiry = new Date(formData.expiryDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (expiry < today) {
        setError("Please enter a valid future expiry date.");
        return;
      }
    }

    try {
      setLoading(true);
      setError("");

      // GET LOGIN DETAILS
      const uid = localStorage.getItem("uid");
      const userType = localStorage.getItem("userType");

      if (!uid || userType !== "pharmacy") {
        setError("Pharmacy session not found. Please login again.");
        return;
      }

      // GET USER DOCUMENT
      const userRef = doc(db, "users", uid);
      const userSnapshot = await getDoc(userRef);

      if (!userSnapshot.exists()) {
        setError("Pharmacy profile not found.");
        return;
      }

      const userData = userSnapshot.data();

      if (
        userData.role !== "pharmacy" ||
        userData.status !== "approved"
      ) {
        setError("Only approved pharmacy owners can add medicines.");
        return;
      }

      if (!userData.pharmacyId) {
        setError("Your pharmacy ID is missing.");
        return;
      }

      const pharmacyId = userData.pharmacyId;

      // GET PHARMACY DOCUMENT
      const pharmacyRef = doc(db, "pharmacies", pharmacyId);
      const pharmacySnapshot = await getDoc(pharmacyRef);

      if (!pharmacySnapshot.exists()) {
        setError("Your pharmacy profile was not found.");
        return;
      }

      const pharmacyData = pharmacySnapshot.data();

      // CHECK OWNER AND APPROVAL
      if (pharmacyData.ownerId !== uid) {
        setError("You are not authorized to manage this pharmacy.");
        return;
      }

      if (pharmacyData.status !== "approved") {
        setError("Your pharmacy is not approved yet.");
        return;
      }

      // UPLOAD MEDICINE IMAGE
      let imageUrl = "";
      let imagePath = "";

      if (medicineImage) {
        const safeFileName = medicineImage.name.replace(
          /[^a-zA-Z0-9.-]/g,
          "_"
        );

        imagePath = `medicineImages/${pharmacyId}/${Date.now()}-${safeFileName}`;

        const imageRef = ref(storage, imagePath);

        await uploadBytes(imageRef, medicineImage);

        imageUrl = await getDownloadURL(imageRef);
      }

      // ADD MEDICINE TO FIRESTORE
      await addDoc(collection(db, "medicines"), {
        pharmacyId: pharmacyId,

        pharmacyName: pharmacyData.name || "",
        pharmacyAddress: pharmacyData.address || "",
        pharmacyCity: pharmacyData.city || "",
        pharmacyState: pharmacyData.state || "",
        pharmacyPhone: pharmacyData.phone || "",

        // BASIC MEDICINE DETAILS
        medicineName: formData.medicineName.trim(),
        brand: formData.brand.trim(),
        manufacturer: formData.manufacturer.trim(),
        dosage: formData.dosage.trim(),
        dosageForm: formData.dosageForm.trim(),
        packSize: formData.packSize.trim(),
        category: formData.category.trim(),

        // MEDICAL INFORMATION
        composition: formData.composition.trim(),
        uses: formData.uses.trim(),
        storageInstructions: formData.storageInstructions.trim(),
        sideEffects: formData.sideEffects.trim(),
        directionsForUse: formData.directionsForUse.trim(),

        // PRICING
        mrp: mrp,
        price: price,

        // STOCK
        quantity: quantity,

        available: quantity > 0,

        availability:
          quantity > 0
            ? "Available"
            : "Out of Stock",

        // EXPIRY AND PRESCRIPTION
        expiryDate: formData.expiryDate || "",
        prescriptionRequired:
          formData.prescriptionRequired === "Yes",

        // IMAGE
        imageUrl: imageUrl,
        imagePath: imagePath,

        // DESCRIPTION
        description: formData.description.trim(),

        // MEDICINE RECORD TIMESTAMPS
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),

        // STOCK VERIFICATION
        stockUpdatedAt: serverTimestamp(),
        stockVerifiedAt: serverTimestamp(),

        stockUpdateSource: "Pharmacy",
        stockVerificationStatus: "Fresh"
      });

      navigate("/pharmacy-medicines");

    } catch (err) {
      console.error("ADD MEDICINE ERROR:", err);

      setError(
        err.message || "Unable to add medicine."
      );

    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="admin-page">

      {/* HERO */}
      <section className="admin-hero">

        <div className="admin-hero-content">

          <span className="section-badge">
            INVENTORY MANAGEMENT
          </span>

          <h1>Add Medicine</h1>

          <p>
            Add medicine details, images and stock
            information to your pharmacy inventory.
          </p>

        </div>

      </section>

      {/* FORM */}
      <section className="admin-form-container">

        <div className="admin-form-card">

          <div className="admin-form-header">

            <div>

              <span className="page-badge">
                MEDICINE DETAILS
              </span>

              <h2>Add New Medicine</h2>

              <p>
                Provide complete medicine information
                to help customers make informed decisions.
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

            {/* MEDICINE IMAGE */}
            <div className="form-group admin-full-width">

              <label>Medicine Image</label>

              <input
                type="file"
                accept="image/*"
                onChange={handleImageChange}
              />

              <small>
                Upload a clear image of the medicine packaging.
                Maximum size: 5 MB.
              </small>

              {imagePreview && (
                <div className="medicine-image-preview">
                  <img
                    src={imagePreview}
                    alt="Medicine preview"
                  />
                </div>
              )}

            </div>

            <div className="admin-form-grid">

              {/* MEDICINE NAME */}
              <div className="form-group">

                <label>Medicine Name *</label>

                <input
                  type="text"
                  name="medicineName"
                  value={formData.medicineName}
                  onChange={handleChange}
                  placeholder="Example: Paracetamol"
                />

              </div>

              {/* BRAND */}
              <div className="form-group">

                <label>Brand Name</label>

                <input
                  type="text"
                  name="brand"
                  value={formData.brand}
                  onChange={handleChange}
                  placeholder="Example: Crocin"
                />

              </div>

              {/* MANUFACTURER */}
              <div className="form-group">

                <label>Manufacturer</label>

                <input
                  type="text"
                  name="manufacturer"
                  value={formData.manufacturer}
                  onChange={handleChange}
                  placeholder="Manufacturer name"
                />

              </div>

              {/* DOSAGE */}
              <div className="form-group">

                <label>Dosage *</label>

                <input
                  type="text"
                  name="dosage"
                  value={formData.dosage}
                  onChange={handleChange}
                  placeholder="Example: 500mg"
                />

              </div>

              {/* DOSAGE FORM */}
              <div className="form-group">

                <label>Dosage Form</label>

                <select
                  name="dosageForm"
                  value={formData.dosageForm}
                  onChange={handleChange}
                >
                  <option value="">Select dosage form</option>
                  <option value="Tablet">Tablet</option>
                  <option value="Capsule">Capsule</option>
                  <option value="Syrup">Syrup</option>
                  <option value="Injection">Injection</option>
                  <option value="Cream">Cream</option>
                  <option value="Ointment">Ointment</option>
                  <option value="Drops">Drops</option>
                  <option value="Other">Other</option>
                </select>

              </div>

              {/* PACK SIZE */}
              <div className="form-group">

                <label>Pack Size</label>

                <input
                  type="text"
                  name="packSize"
                  value={formData.packSize}
                  onChange={handleChange}
                  placeholder="Example: 10 tablets"
                />

              </div>

              {/* CATEGORY */}
              <div className="form-group">

                <label>Category *</label>

                <input
                  type="text"
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                  placeholder="Example: Pain Relief"
                />

              </div>

              {/* COMPOSITION */}
              <div className="form-group admin-full-width">

                <label>Composition / Active Ingredients</label>

                <textarea
                  name="composition"
                  value={formData.composition}
                  onChange={handleChange}
                  placeholder="Enter verified active ingredients"
                  rows="3"
                />

              </div>

              {/* USES */}
              <div className="form-group admin-full-width">

                <label>Uses</label>

                <textarea
                  name="uses"
                  value={formData.uses}
                  onChange={handleChange}
                  placeholder="Enter verified medicine information"
                  rows="3"
                />

              </div>

              {/* QUANTITY */}
              <div className="form-group">

                <label>Available Quantity *</label>

                <input
                  type="number"
                  min="0"
                  step="1"
                  name="quantity"
                  value={formData.quantity}
                  onChange={handleChange}
                  placeholder="Enter available stock"
                />

              </div>

              {/* MRP */}
              <div className="form-group">

                <label>MRP (₹)</label>

                <input
                  type="number"
                  min="0"
                  step="0.01"
                  name="mrp"
                  value={formData.mrp}
                  onChange={handleChange}
                  placeholder="Maximum retail price"
                />

              </div>

              {/* SELLING PRICE */}
              <div className="form-group">

                <label>Selling Price (₹) *</label>

                <input
                  type="number"
                  min="0"
                  step="0.01"
                  name="price"
                  value={formData.price}
                  onChange={handleChange}
                  placeholder="Enter selling price"
                />

              </div>

              {/* AVAILABILITY */}
              <div className="form-group">

                <label>Availability</label>

                <input
                  type="text"
                  value={
                    formData.quantity === ""
                      ? "Enter quantity"
                      : Number(formData.quantity) > 0
                        ? "Available"
                        : "Out of Stock"
                  }
                  readOnly
                />

              </div>

              {/* EXPIRY DATE */}
              <div className="form-group">

                <label>Expiry Date</label>

                <input
                  type="date"
                  name="expiryDate"
                  value={formData.expiryDate}
                  onChange={handleChange}
                />

              </div>

              {/* PRESCRIPTION */}
              <div className="form-group">

                <label>Prescription Required?</label>

                <select
                  name="prescriptionRequired"
                  value={formData.prescriptionRequired}
                  onChange={handleChange}
                >
                  <option value="No">No</option>
                  <option value="Yes">Yes</option>
                </select>

              </div>

              {/* STORAGE */}
              <div className="form-group admin-full-width">

                <label>Storage Instructions</label>

                <textarea
                  name="storageInstructions"
                  value={formData.storageInstructions}
                  onChange={handleChange}
                  placeholder="Enter verified storage instructions"
                  rows="3"
                />

              </div>

              {/* SIDE EFFECTS */}
              <div className="form-group admin-full-width">

                <label>Side Effects</label>

                <textarea
                  name="sideEffects"
                  value={formData.sideEffects}
                  onChange={handleChange}
                  placeholder="Enter verified side-effect information"
                  rows="3"
                />

              </div>

              {/* DIRECTIONS */}
              <div className="form-group admin-full-width">

                <label>Directions for Use</label>

                <textarea
                  name="directionsForUse"
                  value={formData.directionsForUse}
                  onChange={handleChange}
                  placeholder="Enter directions from approved product information"
                  rows="3"
                />

              </div>

              {/* DESCRIPTION */}
              <div className="form-group admin-full-width">

                <label>Additional Description</label>

                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  placeholder="Enter additional product information"
                  rows="4"
                />

              </div>

            </div>

            {/* STOCK VERIFICATION */}
            <div className="stock-verification-info">

              <span className="stock-verification-dot"></span>

              <div>

                <strong>Stock verification enabled</strong>

                <p>
                  Your stock update time will be recorded
                  so users can check how recently the
                  pharmacy confirmed its inventory.
                </p>

              </div>

            </div>

            {/* ERROR */}
            {error && (
              <div className="form-error">
                {error}
              </div>
            )}

            {/* BUTTONS */}
            <div className="admin-form-actions">

              <button
                type="button"
                className="admin-cancel-btn"
                onClick={() => navigate("/pharmacy-medicines")}
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