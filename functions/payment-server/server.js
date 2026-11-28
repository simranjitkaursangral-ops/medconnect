
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import Razorpay from "razorpay";
import crypto from "crypto";
import fs from "fs";

import {
  initializeApp,
  cert,
  getApps
} from "firebase-admin/app";

import {
  getFirestore
} from "firebase-admin/firestore";

import {
  getAuth
} from "firebase-admin/auth";

dotenv.config();

const app = express();

app.use(cors({
  origin: "http://localhost:5173"
}));

app.use(express.json());


// ========================================
// FIREBASE ADMIN INITIALIZATION
// ========================================

const serviceAccount = JSON.parse(
  fs.readFileSync(
    "./serviceAccountKey.json",
    "utf8"
  )
);

const firebaseApp = getApps().length
  ? getApps()[0]
  : initializeApp({
      credential: cert(serviceAccount)
    });

const db = getFirestore(firebaseApp);
const firebaseAuth = getAuth(firebaseApp);


// ========================================
// RAZORPAY INITIALIZATION
// ========================================

if (
  !process.env.RAZORPAY_KEY_ID ||
  !process.env.RAZORPAY_KEY_SECRET
) {
  throw new Error(
    "Razorpay credentials are missing from .env file."
  );
}

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});


// ========================================
// BASIC ROUTES
// ========================================

app.get("/", (req, res) => {
  res.send("MedConnect Payment Server Running");
});

app.get("/health", (req, res) => {
  res.json({
    success: true,
    message: "Payment server is healthy."
  });
});

app.get("/firebase-test", async (req, res) => {
  try {
    await db.collection("medicineRequests")
      .limit(1)
      .get();

    res.json({
      success: true,
      message: "Firebase connection successful."
    });

  } catch (error) {
    console.error("FIREBASE TEST ERROR:", error);

    res.status(500).json({
      success: false,
      message: "Firebase connection failed."
    });
  }
});


// ========================================
// FIREBASE AUTHENTICATION MIDDLEWARE
// ========================================

const verifyFirebaseToken = async (
  req,
  res,
  next
) => {
  try {
    const authHeader = req.headers.authorization;

    if (
      !authHeader ||
      !authHeader.startsWith("Bearer ")
    ) {
      return res.status(401).json({
        success: false,
        message: "Authentication token missing."
      });
    }

    const token = authHeader.split(" ")[1];

    const decodedToken =
      await firebaseAuth.verifyIdToken(token);

    req.user = decodedToken;

    next();

  } catch (error) {
    console.error("AUTH ERROR:", error);

    return res.status(401).json({
      success: false,
      message: "Invalid or expired authentication token."
    });
  }
};


// ========================================
// CREATE RAZORPAY ORDER
// ========================================

app.post(
  "/create-order",
  verifyFirebaseToken,
  async (req, res) => {
    try {
      const {
        requestId,
        selectedResponseId,
        selectedPharmacyId
      } = req.body;

      const uid = req.user.uid;

      if (
        !requestId ||
        !selectedResponseId ||
        !selectedPharmacyId
      ) {
        return res.status(400).json({
          success: false,
          message: "Required payment details are missing."
        });
      }


      // GET MEDICINE REQUEST

      const requestRef = db
        .collection("medicineRequests")
        .doc(requestId);

      const requestSnapshot =
        await requestRef.get();

      if (!requestSnapshot.exists) {
        return res.status(404).json({
          success: false,
          message: "Medicine request not found."
        });
      }

      const requestData = requestSnapshot.data();


      // VERIFY REQUEST OWNER

      if (requestData.userId !== uid) {
        return res.status(403).json({
          success: false,
          message: "You are not authorized for this request."
        });
      }


      // VERIFY SELECTED PHARMACY

      if (
        requestData.selectedResponseId !==
          selectedResponseId ||
        requestData.selectedPharmacyId !==
          selectedPharmacyId
      ) {
        return res.status(400).json({
          success: false,
          message: "Selected pharmacy does not match the request."
        });
      }


      // PREVENT DUPLICATE PAYMENT

      if (requestData.paymentStatus === "Paid") {
        return res.status(400).json({
          success: false,
          message: "This request has already been paid."
        });
      }


      // GET PHARMACY RESPONSE

      const responseRef = db
        .collection("pharmacyResponses")
        .doc(selectedResponseId);

      const responseSnapshot =
        await responseRef.get();

      if (!responseSnapshot.exists) {
        return res.status(404).json({
          success: false,
          message: "Pharmacy response not found."
        });
      }

      const responseData = responseSnapshot.data();


      // VERIFY RESPONSE DETAILS

      if (
        responseData.requestId !== requestId ||
        responseData.userId !== uid ||
        responseData.pharmacyId !== selectedPharmacyId ||
        responseData.availability !== "Available"
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid pharmacy response."
        });
      }


      // VERIFY QUANTITY AND PRICE

      const quantity = Number(requestData.quantity);

      const unitPrice = Number(responseData.price);

      const availableQuantity =
        Number(responseData.availableQuantity);

      if (
        !Number.isInteger(quantity) ||
        quantity <= 0
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid medicine quantity."
        });
      }

      if (
        !Number.isFinite(unitPrice) ||
        unitPrice <= 0
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid medicine price."
        });
      }

      if (
        !Number.isFinite(availableQuantity) ||
        availableQuantity < quantity
      ) {
        return res.status(400).json({
          success: false,
          message: "Required medicine quantity is not available."
        });
      }


      // CALCULATE TOTAL AMOUNT

      const totalAmount =
        Number((unitPrice * quantity).toFixed(2));

      const amountInPaise =
        Math.round(totalAmount * 100);


      // CREATE RAZORPAY ORDER

      const order = await razorpay.orders.create({
        amount: amountInPaise,
        currency: "INR",
        receipt: `medconnect_${requestId}`,
        notes: {
          requestId,
          userId: uid,
          pharmacyId: selectedPharmacyId
        }
      });


      // SAVE PAYMENT RECORD IN FIRESTORE

      const paymentRef = db
        .collection("payments")
        .doc();

      await paymentRef.set({
        requestId,
        userId: uid,
        pharmacyId: selectedPharmacyId,
        responseId: selectedResponseId,

        unitPrice,
        quantity,
        totalAmount,

        currency: "INR",

        razorpayOrderId: order.id,

        status: "Created",

        createdAt: new Date()
      });


      // SEND ORDER DETAILS TO FRONTEND

      return res.json({
        success: true,

        orderId: order.id,

        amount: order.amount,

        currency: order.currency,

        keyId: process.env.RAZORPAY_KEY_ID,

        totalAmount,

        paymentId: paymentRef.id
      });

    } catch (error) {
      console.error("CREATE ORDER ERROR:", error);

      return res.status(500).json({
        success: false,
        message: "Unable to create payment order."
      });
    }
  }
);


// ========================================
// VERIFY RAZORPAY PAYMENT
// ========================================

app.post(
  "/verify-payment",
  verifyFirebaseToken,
  async (req, res) => {
    try {
      const {
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature
      } = req.body;

      const uid = req.user.uid;


      // CHECK REQUIRED DETAILS

      if (
        !razorpay_order_id ||
        !razorpay_payment_id ||
        !razorpay_signature
      ) {
        return res.status(400).json({
          success: false,
          message: "Payment verification details are missing."
        });
      }


      // FIND PAYMENT RECORD

      const paymentSnapshot = await db
        .collection("payments")
        .where(
          "razorpayOrderId",
          "==",
          razorpay_order_id
        )
        .limit(1)
        .get();

      if (paymentSnapshot.empty) {
        return res.status(404).json({
          success: false,
          message: "Payment record not found."
        });
      }

      const paymentDoc =
        paymentSnapshot.docs[0];

      const paymentData =
        paymentDoc.data();


      // VERIFY PAYMENT OWNER

      if (paymentData.userId !== uid) {
        return res.status(403).json({
          success: false,
          message: "Unauthorized payment verification."
        });
      }


      // HANDLE ALREADY VERIFIED PAYMENT

      if (paymentData.status === "Paid") {
        return res.json({
          success: true,
          message: "Payment already verified."
        });
      }


      // VERIFY RAZORPAY SIGNATURE

      const expectedSignature = crypto
        .createHmac(
          "sha256",
          process.env.RAZORPAY_KEY_SECRET
        )
        .update(
          `${razorpay_order_id}|${razorpay_payment_id}`
        )
        .digest("hex");


      const expectedBuffer = Buffer.from(
        expectedSignature,
        "hex"
      );

      const receivedBuffer = Buffer.from(
        razorpay_signature,
        "hex"
      );

      if (
        expectedBuffer.length !== receivedBuffer.length ||
        !crypto.timingSafeEqual(
          expectedBuffer,
          receivedBuffer
        )
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid payment signature."
        });
      }


      // FETCH PAYMENT FROM RAZORPAY

      const razorpayPayment =
        await razorpay.payments.fetch(
          razorpay_payment_id
        );


      // VERIFY ORDER ID AND PAYMENT STATUS

      if (
        razorpayPayment.order_id !==
          razorpay_order_id ||
        razorpayPayment.status !== "captured"
      ) {
        return res.status(400).json({
          success: false,
          message: "Payment is not captured yet."
        });
      }


      // VERIFY PAYMENT AMOUNT

      const expectedAmount = Math.round(
        Number(paymentData.totalAmount) * 100
      );

      if (
        Number(razorpayPayment.amount) !==
        expectedAmount
      ) {
        return res.status(400).json({
          success: false,
          message: "Payment amount mismatch."
        });
      }


      // FIRESTORE REFERENCES

      const paymentRef = db
        .collection("payments")
        .doc(paymentDoc.id);

      const requestRef = db
        .collection("medicineRequests")
        .doc(paymentData.requestId);


      // UPDATE PAYMENT AND REQUEST ATOMICALLY

      await db.runTransaction(async (transaction) => {

        const latestPayment =
          await transaction.get(paymentRef);

        const latestRequest =
          await transaction.get(requestRef);

        if (!latestPayment.exists) {
          throw new Error(
            "Payment record does not exist."
          );
        }

        if (!latestRequest.exists) {
          throw new Error(
            "Medicine request does not exist."
          );
        }

        const latestPaymentData =
          latestPayment.data();

        const latestRequestData =
          latestRequest.data();


        // CHECK PAYMENT AGAIN

        if (latestPaymentData.status === "Paid") {
          return;
        }

        if (
          latestPaymentData.userId !== uid ||
          latestPaymentData.razorpayOrderId !==
            razorpay_order_id
        ) {
          throw new Error(
            "Payment ownership verification failed."
          );
        }

        if (
          latestRequestData.userId !== uid
        ) {
          throw new Error(
            "Request ownership verification failed."
          );
        }


        // UPDATE PAYMENT DOCUMENT

        transaction.update(paymentRef, {
          status: "Paid",

          razorpayPaymentId:
            razorpay_payment_id,

          verifiedAt: new Date()
        });


        // UPDATE MEDICINE REQUEST

        transaction.update(requestRef, {
          paymentStatus: "Paid",

          paymentId: paymentDoc.id,

          razorpayPaymentId:
            razorpay_payment_id,

          paidAt: new Date(),

          updatedAt: new Date()
        });

      });


      return res.json({
        success: true,
        message: "Payment verified successfully!"
      });

    } catch (error) {
      console.error(
        "PAYMENT VERIFICATION ERROR:",
        error
      );

      return res.status(500).json({
        success: false,
        message: "Unable to verify payment."
      });
    }
  }
);


// ========================================
// START SERVER
// ========================================

const PORT = process.env.PORT || 5001;

app.listen(PORT, () => {
  console.log(
    `MedConnect Payment Server running on port ${PORT}`
  );
});
