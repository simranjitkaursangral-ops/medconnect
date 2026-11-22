import { useEffect, useState } from "react";
import { createWorker } from "tesseract.js";
import { Link } from "react-router-dom";
import {
  collection,
  addDoc,
  getDocs,
  serverTimestamp
} from "firebase/firestore";

import { auth, db } from "../../firebase/Firebase";

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

  // AI-assisted prescription text recognition (runs in the browser).
  const [previewUrl, setPreviewUrl] = useState("");
  const [scanning, setScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [scanResult, setScanResult] = useState(null);
  const [scannedMedicines, setScannedMedicines] = useState([]);
  const [scanMessage, setScanMessage] = useState("");

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

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
    const { name, value } = e.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value
    }));

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

      setFormData((previous) => ({
        ...previous,
        file: optimizedFile
      }));

      setPreviewUrl(
        optimizedFile.type.startsWith("image/")
          ? URL.createObjectURL(optimizedFile)
          : ""
      );
      setScanResult(null);
      setScannedMedicines([]);
      setScanProgress(0);
      setScanMessage("");

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

  const normalizeMedicineText = (value) =>
    String(value || "")
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[^a-z0-9]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();

  // Match OCR words only against medicine names/brands already in MedConnect.
  // The scanner never invents a medicine name when no exact catalogue match exists.
  const matchPrescriptionMedicines = async (recognizedText) => {
    try {
      const snapshot = await getDocs(collection(db, "medicines"));
      const normalizedPrescription = ` ${normalizeMedicineText(recognizedText)} `;
      const matches = new Map();

      snapshot.docs.forEach((medicineDoc) => {
        const medicine = medicineDoc.data();
        const medicineName = String(medicine.medicineName || "").trim();
        const brand = String(medicine.brand || "").trim();
        const terms = [medicineName, brand].filter(Boolean);

        const matchedTerm = terms.find((term) => {
          const normalizedTerm = normalizeMedicineText(term);
          if (normalizedTerm.length < 3) return false;
          return normalizedPrescription.includes(` ${normalizedTerm} `);
        });

        if (!matchedTerm || !medicineName) return;

        const uniqueKey = normalizeMedicineText(
          `${medicineName} ${medicine.dosage || ""} ${medicine.dosageForm || ""}`
        );

        if (!matches.has(uniqueKey)) {
          matches.set(uniqueKey, {
            medicineId: medicineDoc.id,
            medicineName,
            brand,
            dosage: String(medicine.dosage || ""),
            dosageForm: String(medicine.dosageForm || ""),
            matchedTerm
          });
        }
      });

      return Array.from(matches.values());
    } catch (matchError) {
      console.warn("MEDICINE CATALOG MATCH ERROR:", matchError);
      return [];
    }
  };

  const handleScanPrescription = async () => {
    if (!formData.file) {
      setScanMessage("Upload a prescription image before scanning.");
      return;
    }

    if (!formData.file.type.startsWith("image/")) {
      setScanMessage(
        "Automatic text scanning currently supports JPG and PNG images. You can still upload a PDF and enter the medicine name manually."
      );
      return;
    }

    let worker;

    try {
      setScanning(true);
      setScanProgress(0);
      setScanMessage("Preparing the prescription scanner...");
      setScanResult(null);
      setScannedMedicines([]);
      setError("");

      worker = await createWorker("eng", 1, {
        logger: (message) => {
          if (message.status === "recognizing text") {
            setScanProgress(Math.round((message.progress || 0) * 100));
            setScanMessage("Reading prescription text...");
          }
        }
      });

      const recognition = await worker.recognize(formData.file);
      const recognizedText = String(recognition.data.text || "").trim();
      const confidence = Math.round(recognition.data.confidence || 0);

      if (!recognizedText) {
        setScanMessage(
          "No readable text was found. Try a brighter, clearer, straight photograph or enter the medicine name manually."
        );
        return;
      }

      const matches = await matchPrescriptionMedicines(recognizedText);

      setScanResult({
        text: recognizedText,
        confidence
      });
      setScannedMedicines(matches);
      setScanProgress(100);

      if (matches.length > 0) {
        const detectedNames = matches
          .map((medicine) => medicine.medicineName)
          .join(", ");

        setFormData((previous) => ({
          ...previous,
          medicineName: detectedNames
        }));

        setScanMessage(
          `${matches.length} possible catalogue match${matches.length === 1 ? "" : "es"} found. Please verify every medicine name against the original prescription.`
        );
      } else {
        setScanMessage(
          "Text was read, but no exact medicine-name match was found in the MedConnect catalogue. Review the extracted text and enter the prescribed medicine name manually."
        );
      }
    } catch (scanError) {
      console.error("PRESCRIPTION SCAN ERROR:", scanError);
      setScanMessage(
        "The scanner could not process this image. Please try a clearer JPG/PNG image or enter the medicine name manually."
      );
    } finally {
      if (worker) {
        try {
          await worker.terminate();
        } catch (terminateError) {
          console.warn("OCR WORKER CLEANUP ERROR:", terminateError);
        }
      }
      setScanning(false);
    }
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

          // OCR output is retained as structured, user-reviewable catalogue matches.
          // Raw OCR text stays in the browser and is not saved to Firestore.
          extractedMedicines: scannedMedicines.map((medicine) => ({
            medicineId: medicine.medicineId,
            medicineName: medicine.medicineName,
            brand: medicine.brand,
            dosage: medicine.dosage,
            dosageForm: medicine.dosageForm,
            matchedTerm: medicine.matchedTerm
          })),
          ocrConfidence: scanResult ? scanResult.confidence : null,
          ocrEngine: scanResult ? "Tesseract.js" : "",

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
      setPreviewUrl("");
      setScanResult(null);
      setScannedMedicines([]);
      setScanProgress(0);
      setScanMessage("");

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
            upload your prescription, scan printed medicine details,
            confirm the extracted names and let the pharmacist review
            your request.
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
              <span>✦</span>
              Scan printed text and match catalogue medicines
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

            {formData.file && (
              <section className="rx-ai-scanner" aria-label="AI-assisted prescription scanner">
                <div className="rx-ai-scanner-heading">
                  <div className="rx-ai-scanner-icon">✦</div>
                  <div>
                    <span className="rx-ai-eyebrow">SMART PRESCRIPTION SCAN</span>
                    <h3>Read prescription with AI assistance</h3>
                    <p>Extract printed text and match medicine names against the MedConnect catalogue.</p>
                  </div>
                </div>

                {previewUrl && (
                  <div className="rx-ai-preview-wrap">
                    <img src={previewUrl} alt="Selected prescription preview" className="rx-ai-preview-image" />
                  </div>
                )}

                <div className="rx-ai-scanner-actions">
                  <button
                    type="button"
                    className="rx-ai-scan-button"
                    onClick={handleScanPrescription}
                    disabled={scanning || loading || !formData.file.type.startsWith("image/")}
                  >
                    {scanning ? `Scanning prescription ${scanProgress}%` : "✦ Scan & identify medicines"}
                  </button>
                  {!formData.file.type.startsWith("image/") && (
                    <span className="rx-ai-inline-note">PDF upload is supported; automatic image scanning is not available for PDFs in this version.</span>
                  )}
                </div>

                {scanning && (
                  <div className="rx-ai-progress" role="progressbar" aria-valuenow={scanProgress} aria-valuemin="0" aria-valuemax="100">
                    <div className="rx-ai-progress-track">
                      <div className="rx-ai-progress-fill" style={{ width: `${scanProgress}%` }}></div>
                    </div>
                  </div>
                )}

                {scanMessage && (
                  <div className={`rx-ai-scan-message ${scanResult ? "success" : ""}`}>
                    {scanMessage}
                  </div>
                )}

                {scanResult && (
                  <div className="rx-ai-results">
                    <div className="rx-ai-results-top">
                      <strong>Scan results</strong>
                      <span>OCR text confidence: {scanResult.confidence}%</span>
                    </div>

                    {scannedMedicines.length > 0 ? (
                      <div className="rx-ai-detected-list">
                        {scannedMedicines.map((medicine) => (
                          <div className="rx-ai-detected-item" key={medicine.medicineId}>
                            <span className="rx-ai-detected-check">✓</span>
                            <div>
                              <strong>{medicine.medicineName}</strong>
                              {medicine.dosage && <small>{medicine.dosage}{medicine.dosageForm ? ` · ${medicine.dosageForm}` : ""}</small>}
                              {medicine.brand && <small>Brand: {medicine.brand}</small>}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="rx-ai-no-match">No exact catalogue matches were found. Please enter the medicine name yourself.</p>
                    )}

                    <details className="rx-ai-ocr-details">
                      <summary>Review extracted prescription text</summary>
                      <pre>{scanResult.text}</pre>
                    </details>
                    <p className="rx-ai-review-warning">Please compare the extracted names with the original prescription. OCR can misread handwriting, abbreviations, strengths and similar medicine names.</p>
                  </div>
                )}

                <p className="rx-ai-privacy-note">Text recognition runs in your browser. Your prescription file is uploaded to the selected pharmacy only when you submit this form.</p>
              </section>
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