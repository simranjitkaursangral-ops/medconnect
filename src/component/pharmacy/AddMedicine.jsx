import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

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

  const CLOUDINARY_CLOUD_NAME = "jc5nbulp";
  const CLOUDINARY_UPLOAD_PRESET = "prescription";

  const [formData, setFormData] = useState({
    medicineName: "",
    dosage: "",
    category: "",
    uses: "",
    quantity: "",
    price: "",
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

  // UPLOAD IMAGE TO CLOUDINARY USING AXIOS
  const uploadImageToCloudinary = async (file, pharmacyId) => {
    const imageData = new FormData();

    imageData.append("file", file);
    imageData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
    imageData.append(
      "folder",
      `medconnect/medicines/${pharmacyId}`
    );

    const response = await axios.post(
      `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
      imageData
    );

    return {
      imageUrl: response.data.secure_url,
      imagePath: response.data.public_id
    };
  };

  // ADD MEDICINE
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (
      !formData.medicineName.trim() ||
      !formData.dosage.trim() ||
      !formData.category.trim() ||
      !formData.uses.trim() ||
      formData.quantity === "" ||
      formData.price === ""
    ) {
      setError("Please fill all required fields.");
      return;
    }

    const quantity = Number(formData.quantity);
    const price = Number(formData.price);

    if (!Number.isInteger(quantity) || quantity < 0) {
      setError("Please enter a valid quantity.");
      return;
    }

    if (!Number.isFinite(price) || price < 0) {
      setError("Please enter a valid price.");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const uid = localStorage.getItem("uid");
      const userType = localStorage.getItem("userType");

      if (!uid || userType !== "pharmacy") {
        setError("Please login with your pharmacy account.");
        return;
      }

      // GET USER DETAILS
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
        setError("Pharmacy account is not approved.");
        return;
      }

      if (!userData.pharmacyId) {
        setError("Pharmacy ID is missing.");
        return;
      }

      const pharmacyId = userData.pharmacyId;

      // GET PHARMACY DETAILS
      const pharmacyRef = doc(db, "pharmacies", pharmacyId);
      const pharmacySnapshot = await getDoc(pharmacyRef);

      if (!pharmacySnapshot.exists()) {
        setError("Pharmacy profile not found.");
        return;
      }

      const pharmacyData = pharmacySnapshot.data();

      if (
        pharmacyData.ownerId !== uid ||
        pharmacyData.status !== "approved"
      ) {
        setError("You are not authorized to manage this pharmacy.");
        return;
      }

      // CLOUDINARY IMAGE UPLOAD
      let imageUrl = "";
      let imagePath = "";

      if (medicineImage) {
        const imageResult = await uploadImageToCloudinary(
          medicineImage,
          pharmacyId
        );

        imageUrl = imageResult.imageUrl;
        imagePath = imageResult.imagePath;
      }

      // SAVE MEDICINE IN FIRESTORE
      await addDoc(collection(db, "medicines"), {
        pharmacyId,

        pharmacyName: pharmacyData.name || "",
        pharmacyAddress: pharmacyData.address || "",
        pharmacyCity: pharmacyData.city || "",
        pharmacyState: pharmacyData.state || "",
        pharmacyPhone: pharmacyData.phone || "",

        medicineName: formData.medicineName.trim(),
        dosage: formData.dosage.trim(),
        category: formData.category.trim(),
        uses: formData.uses.trim(),

        quantity,
        price,

        description: formData.description.trim(),

        imageUrl,
        imagePath,

        available: quantity > 0,

        availability:
          quantity > 0 ? "Available" : "Out of Stock",

        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),

        stockUpdatedAt: serverTimestamp(),
        stockVerifiedAt: serverTimestamp(),

        stockUpdateSource: "Pharmacy",
        stockVerificationStatus: "Fresh"
      });

      navigate("/pharmacy-medicines");

    } catch (err) {
      console.error("ADD MEDICINE ERROR:", err);

      console.error(
        "ERROR RESPONSE:",
        err.response?.data
      );

      setError(
        err.response?.data?.error?.message ||
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
            PHARMACY INVENTORY
          </span>

          <h1>Add Medicine</h1>

          <p>
            Add medicine details and update your pharmacy stock.
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

              <h2>Add New Medicine</h2>

              <p>
                Enter the basic information of your medicine.
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
                  required
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
                  placeholder="Example: 500 mg"
                  required
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
                  placeholder="Example: Fever"
                  required
                />

              </div>

              {/* QUANTITY */}

              <div className="form-group">

                <label>Available Quantity *</label>

                <input
                  type="number"
                  name="quantity"
                  min="0"
                  step="1"
                  value={formData.quantity}
                  onChange={handleChange}
                  placeholder="Enter quantity"
                  required
                />

              </div>

              {/* PRICE */}

              <div className="form-group">

                <label>Price (₹) *</label>

                <input
                  type="number"
                  name="price"
                  min="0"
                  step="0.01"
                  value={formData.price}
                  onChange={handleChange}
                  placeholder="Enter price"
                  required
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

              {/* USES */}

              <div className="form-group admin-full-width">

                <label>Uses *</label>

                <textarea
                  name="uses"
                  value={formData.uses}
                  onChange={handleChange}
                  placeholder="Example: Fever, headache, body pain"
                  rows="3"
                  required
                />

              </div>

              {/* DESCRIPTION */}

              <div className="form-group admin-full-width">

                <label>Description</label>

                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  placeholder="Enter medicine description"
                  rows="4"
                />

              </div>

            </div>

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