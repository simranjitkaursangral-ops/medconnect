const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");

const { initializeApp } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");

const cloudinary = require("cloudinary").v2;
const crypto = require("crypto");

initializeApp();

const db = getFirestore();

const CLOUDINARY_API_KEY = defineSecret("CLOUDINARY_API_KEY");
const CLOUDINARY_API_SECRET = defineSecret("CLOUDINARY_API_SECRET");

const CLOUDINARY_CLOUD_NAME = "jc5nbulp";

// Configure Cloudinary securely
function configureCloudinary() {
  cloudinary.config({
    cloud_name: CLOUDINARY_CLOUD_NAME,
    api_key: CLOUDINARY_API_KEY.value(),
    api_secret: CLOUDINARY_API_SECRET.value()
  });
}

// ==========================================
// 1. SECURE PRESCRIPTION UPLOAD SIGNATURE
// ==========================================

exports.createPrescriptionUploadSignature = onCall(
  {
    secrets: [
      CLOUDINARY_API_KEY,
      CLOUDINARY_API_SECRET
    ],
    region: "asia-south1",
    maxInstances: 5
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError(
        "unauthenticated",
        "Please log in first."
      );
    }

    const contentType = String(
      request.data?.contentType || ""
    );

    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "application/pdf"
    ];

    if (!allowedTypes.includes(contentType)) {
      throw new HttpsError(
        "invalid-argument",
        "Only JPG, PNG and PDF files are allowed."
      );
    }

    const uid = request.auth.uid;

    const timestamp = Math.floor(Date.now() / 1000);

    const folder = `medconnect/prescriptions/${uid}`;

    const publicId = `${timestamp}-${crypto.randomUUID()}`;

    const paramsToSign = {
      folder,
      public_id: publicId,
      timestamp,
      type: "authenticated"
    };

    const signature = cloudinary.utils.api_sign_request(
      paramsToSign,
      CLOUDINARY_API_SECRET.value()
    );

    return {
      cloudName: CLOUDINARY_CLOUD_NAME,
      apiKey: CLOUDINARY_API_KEY.value(),
      timestamp,
      signature,
      folder,
      publicId,
      resourceType: "auto"
    };
  }
);

// ==========================================
// 2. SECURE PRESCRIPTION DOWNLOAD
// ==========================================

exports.getPrescriptionDownloadUrl = onCall(
  {
    secrets: [
      CLOUDINARY_API_KEY,
      CLOUDINARY_API_SECRET
    ],
    region: "asia-south1",
    maxInstances: 5
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError(
        "unauthenticated",
        "Please log in first."
      );
    }

    const prescriptionId = String(
      request.data?.prescriptionId || ""
    ).trim();

    if (!prescriptionId) {
      throw new HttpsError(
        "invalid-argument",
        "Prescription ID is required."
      );
    }

    // Find prescription
    const prescriptionRef = db
      .collection("prescriptions")
      .doc(prescriptionId);

    const prescriptionSnap = await prescriptionRef.get();

    if (!prescriptionSnap.exists) {
      throw new HttpsError(
        "not-found",
        "Prescription not found."
      );
    }

    const prescription = prescriptionSnap.data();

    const uid = request.auth.uid;

    // Check whether the user owns this prescription
    let authorized = prescription.userId === uid;

    // Otherwise verify the pharmacy owner
    if (!authorized && prescription.pharmacyId) {
      const userSnap = await db
        .collection("users")
        .doc(uid)
        .get();

      const userData = userSnap.exists
        ? userSnap.data()
        : null;

      if (
        userData &&
        userData.role === "pharmacy" &&
        userData.status === "approved" &&
        userData.pharmacyId === prescription.pharmacyId
      ) {
        const pharmacySnap = await db
          .collection("pharmacies")
          .doc(prescription.pharmacyId)
          .get();

        const pharmacyData = pharmacySnap.exists
          ? pharmacySnap.data()
          : null;

        authorized = Boolean(
          pharmacyData &&
          pharmacyData.ownerId === uid &&
          pharmacyData.status === "approved"
        );
      }
    }

    if (!authorized) {
      throw new HttpsError(
        "permission-denied",
        "You are not authorized to view this prescription."
      );
    }

    // Get secure Cloudinary file details
    const publicId = prescription.filePublicId;
    const format = prescription.fileFormat;
    const resourceType = prescription.fileResourceType;

    if (
      !publicId ||
      !format ||
      !["image", "raw", "video"].includes(resourceType)
    ) {
      throw new HttpsError(
        "failed-precondition",
        "This prescription does not have secure Cloudinary file details."
      );
    }

    configureCloudinary();

    // Generate a link valid for five minutes
    const expiresAt =
      Math.floor(Date.now() / 1000) + 5 * 60;

    const url = cloudinary.utils.private_download_url(
      publicId,
      format,
      {
        resource_type: resourceType,
        type: "authenticated",
        expires_at: expiresAt,
        attachment: false
      }
    );

    return {
      url,
      expiresAt
    };
  }
);