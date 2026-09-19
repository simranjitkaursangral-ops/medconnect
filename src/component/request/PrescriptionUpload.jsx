import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  collection,
  addDoc,
  getDocs,
  serverTimestamp
} from "firebase/firestore";

import { auth, db } from "../../firebase/firebase";

import {
  CLOUDINARY_CLOUD_NAME,
  CLOUDINARY_UPLOAD_PRESET
} from "../../config/cloudinary";

function PrescriptionUpload() {
  const [pharmacies, setPharmacies] = useState([]);

  const [formData, setFormData] = useState({
    pharmacyId: "",
    medicineName: "",
    notes: "",
    file: null
  });

  const [loadingPharmacies, setLoadingPharmacies] =
    useState(true);

  const [loading, setLoading] = useState(false);

  const [uploadProgress, setUploadProgress] =
    useState(0);

  const [error, setError] = useState("");

  const [success, setSuccess] = useState(false);

  const [submittedPharmacy, setSubmittedPharmacy] =
    useState("");

  useEffect(() => {
    loadPharmacies();
  }, []);

  const loadPharmacies = async () => {
    try {
      setLoadingPharmacies(true);
      setError("");

      const snapshot = await getDocs(
        collection(db, "pharmacies")
      );

      const pharmacyData = snapshot.docs
        .map((item) => ({
          id: item.id,
          ...item.data()
        }))
        .filter(
          (pharmacy) =>
            String(pharmacy.status || "")
              .trim()
              .toLowerCase() === "approved"
        );

      setPharmacies(pharmacyData);
    } catch (err) {
      console.log(
        "PHARMACY LOAD ERROR:",
        err
      );

      setError(
        err.message ||
        "Unable to load approved pharmacies."
      );
    } finally {
      setLoadingPharmacies(false);
    }
  };

  const compressImage = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (event) => {
        const image = new Image();

        image.onload = () => {
          const maxWidth = 1400;
          const maxHeight = 1400;

          let width = image.width;
          let height = image.height;

          if (
            width > maxWidth ||
            height > maxHeight
          ) {
            const ratio = Math.min(
              maxWidth / width,
              maxHeight / height
            );

            width = Math.round(
              width * ratio
            );

            height = Math.round(
              height * ratio
            );
          }

          const canvas =
            document.createElement("canvas");

          canvas.width = width;
          canvas.height = height;

          const context =
            canvas.getContext("2d");

          context.drawImage(
            image,
            0,
            0,
            width,
            height
          );

          canvas.toBlob(
            (blob) => {
              if (!blob) {
                reject(
                  new Error(
                    "Image compression failed."
                  )
                );
                return;
              }

              const compressedFile =
                new File(
                  [blob],
                  "prescription.jpg",
                  {
                    type: "image/jpeg",
                    lastModified:
                      Date.now()
                  }
                );

              resolve(
                compressedFile
              );
            },
            "image/jpeg",
            0.65
          );
        };

        image.onerror = () => {
          reject(
            new Error(
              "Unable to process image."
            )
          );
        };

        image.src =
          event.target.result;
      };

      reader.onerror = () => {
        reject(
          new Error(
            "Unable to read image."
          )
        );
      };

      reader.readAsDataURL(file);
    });
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });

    setError("");
  };

  const handleFileChange = async (e) => {
    const file =
      e.target.files[0];

    if (!file) {
      return;
    }

    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "application/pdf"
    ];

    if (
      !allowedTypes.includes(
        file.type
      )
    ) {
      setError(
        "Only JPG, PNG and PDF files are allowed."
      );

      e.target.value = "";
      return;
    }

    if (
      file.size >
      5 * 1024 * 1024
    ) {
      setError(
        "File size must be less than 5 MB."
      );

      e.target.value = "";
      return;
    }

    try {
      setError("");

      let optimizedFile = file;

      if (
        file.type === "image/jpeg" ||
        file.type === "image/png"
      ) {
        optimizedFile =
          await compressImage(file);
      }

      setFormData({
        ...formData,
        file: optimizedFile
      });

    } catch (err) {
      console.log(
        "IMAGE PROCESSING ERROR:",
        err
      );

      setError(
        "Unable to process the selected image."
      );

      e.target.value = "";
    }
  };

  const uploadToCloudinary = async (file) => {
    const cloudinaryUrl =
      `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/auto/upload`;

    const uploadData =
      new FormData();

    uploadData.append(
      "file",
      file
    );

    uploadData.append(
      "upload_preset",
      CLOUDINARY_UPLOAD_PRESET
    );

    uploadData.append(
      "folder",
      "medconnect/prescriptions"
    );

    setUploadProgress(10);

    const response =
      await fetch(
        cloudinaryUrl,
        {
          method: "POST",
          body: uploadData
        }
      );

    setUploadProgress(80);

    const data =
      await response.json();

    if (!response.ok) {
      console.log(
        "CLOUDINARY ERROR:",
        data
      );

      throw new Error(
        data.error?.message ||
        "Cloudinary upload failed."
      );
    }

    setUploadProgress(90);

    return data.secure_url;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const user =
      auth.currentUser;

    if (!user) {
      setError(
        "Please login before uploading a prescription."
      );
      return;
    }

    if (!formData.pharmacyId) {
      setError(
        "Please select a pharmacy."
      );
      return;
    }

    if (!formData.file) {
      setError(
        "Please select a prescription file."
      );
      return;
    }

    try {
      setLoading(true);
      setError("");
      setUploadProgress(0);

      const selectedPharmacy =
        pharmacies.find(
          (pharmacy) =>
            pharmacy.id ===
            formData.pharmacyId
        );

      if (!selectedPharmacy) {
        setError(
          "Selected pharmacy is not available."
        );
        return;
      }

      if (
        String(
          selectedPharmacy.status || ""
        )
          .trim()
          .toLowerCase() !==
        "approved"
      ) {
        setError(
          "You can only send prescriptions to approved pharmacies."
        );
        return;
      }

      const file =
        formData.file;

      const fileUrl =
        await uploadToCloudinary(
          file
        );

      setUploadProgress(95);

      await addDoc(
        collection(
          db,
          "prescriptions"
        ),
        {
          userId:
            user.uid,

          userName:
            localStorage.getItem(
              "userName"
            ) || "User",

          userEmail:
            localStorage.getItem(
              "userEmail"
            ) ||
            user.email ||
            "",

          pharmacyId:
            selectedPharmacy.id,

          pharmacyName:
            selectedPharmacy.name ||
            "",

          pharmacyAddress:
            selectedPharmacy.address ||
            "",

          medicineName:
            formData.medicineName.trim(),

          notes:
            formData.notes.trim(),

          fileName:
            file.name,

          fileType:
            file.type,

          fileUrl,

          status: "Pending",

          createdAt:
            serverTimestamp(),

          updatedAt:
            serverTimestamp()
        }
      );

      setUploadProgress(100);

      setSubmittedPharmacy(
        selectedPharmacy.name ||
        "the selected pharmacy"
      );

      setFormData({
        pharmacyId: "",
        medicineName: "",
        notes: "",
        file: null
      });

      const fileInput =
        document.getElementById(
          "prescription-file"
        );

      if (fileInput) {
        fileInput.value = "";
      }

      setSuccess(true);

    } catch (err) {
      console.log(
        "PRESCRIPTION ERROR:",
        err
      );

      setError(
        err.message ||
        "Unable to upload prescription."
      );
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <main className="prescription-page">

        <section className="prescription-success">

          <div className="prescription-success-icon">
            ✓
          </div>

          <span className="section-badge">
            PRESCRIPTION SUBMITTED
          </span>

          <h1>
            Prescription sent
            <span>
              {" "}successfully.
            </span>
          </h1>

          <p>
            Your prescription has been
            sent to{" "}
            <strong>
              {submittedPharmacy}
            </strong>
            . The pharmacist can now
            review your prescription.
          </p>

          <div className="prescription-success-actions">

            <Link
              to="/my-prescriptions"
              className="prescription-primary-btn"
            >
              View My Prescriptions
            </Link>

            <button
              type="button"
              className="prescription-secondary-btn"
              onClick={() => {
                setSuccess(false);
                setError("");
                setUploadProgress(0);
              }}
            >
              Upload Another
            </button>

          </div>

        </section>

      </main>
    );
  }

  return (
    <main className="prescription-page">

      <section className="prescription-container">

        <div className="prescription-info">

          <span className="section-badge">
            PRESCRIPTION UPLOAD
          </span>

          <h1>
            Send your prescription
            <span>
              {" "}to a pharmacy.
            </span>
          </h1>

          <p>
            Select an approved pharmacy,
            upload your prescription and
            let the pharmacist review your
            request.
          </p>

          <div className="prescription-benefits">

            <div>
              <span>✓</span>
              Choose an approved pharmacy
            </div>

            <div>
              <span>✓</span>
              Upload JPG, PNG or PDF
            </div>

            <div>
              <span>✓</span>
              Images are optimized automatically
            </div>

            <div>
              <span>✓</span>
              Track pharmacist response
            </div>

          </div>

        </div>

        <div className="prescription-card">

          <div className="prescription-card-header">

            <div className="prescription-icon">
              📄
            </div>

            <h2>
              Upload Prescription
            </h2>

            <p>
              Send your prescription securely
            </p>

          </div>

          <form
            className="prescription-form"
            onSubmit={handleSubmit}
          >

            <div className="form-group">

              <label>
                Select Pharmacy
              </label>

              <select
                name="pharmacyId"
                value={
                  formData.pharmacyId
                }
                onChange={handleChange}
                disabled={
                  loadingPharmacies ||
                  loading
                }
              >

                <option value="">
                  {loadingPharmacies
                    ? "Loading approved pharmacies..."
                    : pharmacies.length === 0
                    ? "No approved pharmacies available"
                    : "Select a pharmacy"}
                </option>

                {pharmacies.map(
                  (pharmacy) => (
                    <option
                      key={pharmacy.id}
                      value={pharmacy.id}
                    >
                      {pharmacy.name}
                      {pharmacy.city
                        ? ` - ${pharmacy.city}`
                        : ""}
                    </option>
                  )
                )}

              </select>

            </div>

            <div className="form-group">

              <label>
                Medicine Name
                <span>
                  Optional
                </span>
              </label>

              <input
                type="text"
                name="medicineName"
                placeholder="Enter medicine name"
                value={
                  formData.medicineName
                }
                onChange={handleChange}
                disabled={loading}
              />

            </div>

            <div className="form-group">

              <label>
                Prescription File
              </label>

              <input
                id="prescription-file"
                type="file"
                accept=".jpg,.jpeg,.png,.pdf"
                onChange={
                  handleFileChange
                }
                disabled={loading}
              />

              <small>
                JPG, PNG or PDF • Maximum
                5 MB • Images are optimized
                automatically
              </small>

            </div>

            {formData.file && (
              <div className="selected-file">
                <strong>
                  Selected:
                </strong>{" "}
                {formData.file.name}
                {" "}
                (
                {(
                  formData.file.size /
                  (1024 * 1024)
                ).toFixed(2)}
                {" "}MB)
              </div>
            )}

            <div className="form-group">

              <label>
                Notes
                <span>
                  Optional
                </span>
              </label>

              <textarea
                name="notes"
                rows="4"
                placeholder="Add any additional information..."
                value={
                  formData.notes
                }
                onChange={handleChange}
                disabled={loading}
              />

            </div>

            {loading && (
              <div className="upload-progress-box">

                <div className="upload-progress-header">

                  <span>
                    Uploading prescription...
                  </span>

                  <strong>
                    {uploadProgress}%
                  </strong>

                </div>

                <div className="upload-progress-bar">

                  <div
                    className="upload-progress-fill"
                    style={{
                      width: `${uploadProgress}%`
                    }}
                  ></div>

                </div>

                <small>
                  Please keep this page open
                  until the upload finishes.
                </small>

              </div>
            )}

            {error && (
              <div className="form-error">
                {error}
              </div>
            )}

            <button
              type="submit"
              className="prescription-submit"
              disabled={
                loading ||
                loadingPharmacies ||
                pharmacies.length === 0
              }
            >
              {loading
                ? `Uploading ${uploadProgress}%...`
                : "Submit Prescription"}
            </button>

          </form>

        </div>

      </section>

    </main>
  );
}

export default PrescriptionUpload;