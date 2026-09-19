import { useEffect, useState } from "react";
import {
  addDoc,
  collection,
  doc,
  getDoc,
  serverTimestamp
} from "firebase/firestore";
import { db } from "../../firebase/Firebase";
import { Link, useSearchParams } from "react-router-dom";

function RequestMedicine() {
  const [searchParams] = useSearchParams();

  const medicineFromUrl =
    searchParams.get("medicineName") || "";

  const pharmacyIdFromUrl =
    searchParams.get("pharmacyId") || "";

  const pharmacyNameFromUrl =
    searchParams.get("pharmacyName") || "";

  const [medicineName, setMedicineName] =
    useState(medicineFromUrl);

  const [quantity, setQuantity] =
    useState(1);

  const [dosage, setDosage] =
    useState("");

  const [location, setLocation] =
    useState("");

  const [message, setMessage] =
    useState("");

  const [pharmacy, setPharmacy] =
    useState(null);

  const [loading, setLoading] =
    useState(true);

  const [submitting, setSubmitting] =
    useState(false);

  const [success, setSuccess] =
    useState(false);

  const [submittedMedicine, setSubmittedMedicine] =
    useState("");

  const [submittedQuantity, setSubmittedQuantity] =
    useState(1);

  const [submittedPharmacy, setSubmittedPharmacy] =
    useState("");

  const [error, setError] =
    useState("");

  useEffect(() => {
    const loadPharmacy = async () => {
      try {
        setLoading(true);
        setError("");

        if (!pharmacyIdFromUrl) {
          setLoading(false);
          return;
        }

        const pharmacyRef = doc(
          db,
          "pharmacies",
          pharmacyIdFromUrl
        );

        const pharmacyDoc =
          await getDoc(pharmacyRef);

        if (!pharmacyDoc.exists()) {
          setError(
            "Selected pharmacy could not be found."
          );
          return;
        }

        const pharmacyData =
          pharmacyDoc.data();

        if (
          pharmacyData.status !==
          "approved"
        ) {
          setError(
            "This pharmacy is not currently approved. Please select another pharmacy."
          );
          return;
        }

        setPharmacy({
          id: pharmacyDoc.id,
          ...pharmacyData
        });
      } catch (err) {
        console.error(
          "PHARMACY LOAD ERROR:",
          err
        );

        setError(
          "Unable to load pharmacy information."
        );
      } finally {
        setLoading(false);
      }
    };

    loadPharmacy();
  }, [pharmacyIdFromUrl]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    setError("");
    setSuccess(false);

    const userId =
      localStorage.getItem("uid");

    const userName =
      localStorage.getItem("userName") ||
      "";

    const userEmail =
      localStorage.getItem("userEmail") ||
      "";

    if (!userId) {
      setError(
        "Please login before submitting a request."
      );
      return;
    }

    if (!medicineName.trim()) {
      setError(
        "Please enter the medicine name."
      );
      return;
    }

    if (!pharmacyIdFromUrl) {
      setError(
        "Please select a pharmacy first."
      );
      return;
    }

    if (!pharmacy) {
      setError(
        "Selected pharmacy is not available."
      );
      return;
    }

    if (
      pharmacy.status !==
      "approved"
    ) {
      setError(
        "You can only send requests to approved pharmacies."
      );
      return;
    }

    if (
      !quantity ||
      Number(quantity) < 1
    ) {
      setError(
        "Quantity must be at least 1."
      );
      return;
    }

    try {
      setSubmitting(true);

      const pharmacyRef = doc(
        db,
        "pharmacies",
        pharmacyIdFromUrl
      );

      const pharmacyDoc =
        await getDoc(pharmacyRef);

      if (!pharmacyDoc.exists()) {
        setError(
          "Selected pharmacy no longer exists."
        );
        return;
      }

      const pharmacyData =
        pharmacyDoc.data();

      if (
        pharmacyData.status !==
        "approved"
      ) {
        setError(
          "This pharmacy is no longer approved. Please select another pharmacy."
        );
        return;
      }

      const finalQuantity =
        Number(quantity);

      const finalMedicineName =
        medicineName.trim();

      const finalPharmacyName =
        pharmacyData.name ||
        pharmacyNameFromUrl ||
        "Pharmacy";

      await addDoc(
        collection(
          db,
          "medicineRequests"
        ),
        {
          userId,

          userName,

          userEmail,

          pharmacyId:
            pharmacyIdFromUrl,

          pharmacyName:
            finalPharmacyName,

          pharmacyAddress:
            pharmacyData.address ||
            "",

          pharmacyCity:
            pharmacyData.city ||
            "",

          pharmacyState:
            pharmacyData.state ||
            "",

          pharmacyPhone:
            pharmacyData.phone ||
            "",

          medicineName:
            finalMedicineName,

          quantity:
            finalQuantity,

          dosage:
            dosage.trim(),

          location:
            location.trim(),

          message:
            message.trim(),

          status:
            "Pending",

          createdAt:
            serverTimestamp(),

          updatedAt:
            serverTimestamp()
        }
      );

      setSubmittedMedicine(
        finalMedicineName
      );

      setSubmittedQuantity(
        finalQuantity
      );

      setSubmittedPharmacy(
        finalPharmacyName
      );

      setSuccess(true);

      setQuantity(1);
      setDosage("");
      setLocation("");
      setMessage("");
    } catch (err) {
      console.error(
        "REQUEST SUBMIT ERROR:",
        err
      );

      setError(
        err.message ||
          "Failed to submit your request. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="request-success-page">

        <div className="request-success-card">

          <div className="request-success-icon">
            ✓
          </div>

          <span className="success-label">
            REQUEST SUBMITTED
          </span>

          <h1>
            Your medicine request has been sent
          </h1>

          <p>
            Your request for{" "}
            <strong>
              {submittedMedicine}
            </strong>{" "}
            has been sent to{" "}
            <strong>
              {submittedPharmacy}
            </strong>
            .
          </p>

          <div className="request-success-info">

            <div>
              <span>
                Medicine
              </span>

              <strong>
                {submittedMedicine}
              </strong>
            </div>

            <div>
              <span>
                Quantity
              </span>

              <strong>
                {submittedQuantity}
              </strong>
            </div>

            <div>
              <span>
                Status
              </span>

              <strong>
                Pending
              </strong>
            </div>

          </div>

          <div className="request-success-actions">

            <Link
              to="/my-requests"
              className="primary-request-action"
            >
              View My Requests
            </Link>

            <Link
              to="/search"
              className="secondary-request-action"
            >
              Search Another Medicine
            </Link>

          </div>

        </div>

      </div>
    );
  }

  return (
    <div className="request-medicine-page">

      <div className="request-medicine-container">

        <Link
          to="/search"
          className="request-back-link"
        >
          ← Back to Medicine Search
        </Link>

        <div className="request-page-heading">

          <span className="results-label">
            MEDICINE REQUEST
          </span>

          <h1>
            Request a Medicine
          </h1>

          <p>
            Send a request directly to your
            selected pharmacy.
          </p>

        </div>

        <div className="request-layout">

          <div className="request-form-card">

            {error && (
              <div className="form-error">
                {error}
              </div>
            )}

            <form
              onSubmit={handleSubmit}
            >

              <div className="request-form-section">

                <h2>
                  Medicine Details
                </h2>

                <div className="request-form-grid">

                  <div className="form-group full-width">

                    <label>
                      Medicine Name *
                    </label>

                    <input
                      type="text"
                      value={medicineName}
                      onChange={(e) =>
                        setMedicineName(
                          e.target.value
                        )
                      }
                      placeholder="Enter medicine name"
                    />

                  </div>

                  <div className="form-group">

                    <label>
                      Quantity *
                    </label>

                    <input
                      type="number"
                      min="1"
                      value={quantity}
                      onChange={(e) =>
                        setQuantity(
                          e.target.value
                        )
                      }
                    />

                  </div>

                  <div className="form-group">

                    <label>
                      Dosage
                    </label>

                    <input
                      type="text"
                      value={dosage}
                      onChange={(e) =>
                        setDosage(
                          e.target.value
                        )
                      }
                      placeholder="e.g. 500 mg"
                    />

                  </div>

                </div>

              </div>

              <div className="request-form-section">

                <h2>
                  Delivery / Contact Information
                </h2>

                <div className="form-group">

                  <label>
                    Your Location
                  </label>

                  <input
                    type="text"
                    value={location}
                    onChange={(e) =>
                      setLocation(
                        e.target.value
                      )
                    }
                    placeholder="Enter your area or address"
                  />

                  <small>
                    Example: Sector 62, Noida
                  </small>

                </div>

                <div className="form-group request-message-group">

                  <label>
                    Additional Message
                  </label>

                  <textarea
                    value={message}
                    onChange={(e) =>
                      setMessage(
                        e.target.value
                      )
                    }
                    placeholder="Add any additional information for the pharmacist..."
                    rows="4"
                  />

                </div>

              </div>

              <button
                type="submit"
                className="submit-request-btn"
                disabled={
                  submitting ||
                  loading ||
                  !pharmacy
                }
              >
                {submitting
                  ? "Sending Request..."
                  : "Submit Medicine Request"}
              </button>

            </form>

          </div>

          <div className="request-side">

            <div className="selected-pharmacy-card">

              <span className="selected-pharmacy-label">
                SELECTED PHARMACY
              </span>

              {loading ? (

                <p>
                  Loading pharmacy...
                </p>

              ) : pharmacy ? (

                <>

                  <div className="selected-pharmacy-icon">
                    🏥
                  </div>

                  <h2>
                    {pharmacy.name}
                  </h2>

                  <p>
                    {pharmacy.address ||
                      "Address not provided"}
                  </p>

                  <span>
                    {pharmacy.city ||
                      ""}
                    {pharmacy.state
                      ? `, ${pharmacy.state}`
                      : ""}
                  </span>

                  {pharmacy.phone && (

                    <div className="selected-pharmacy-phone">
                      📞 {pharmacy.phone}
                    </div>

                  )}

                </>

              ) : (

                <div className="no-pharmacy-selected">

                  <div>
                    🏥
                  </div>

                  <h3>
                    No pharmacy selected
                  </h3>

                  <p>
                    Go back to medicine search
                    and select an approved
                    pharmacy.
                  </p>

                  <Link to="/search">
                    Find Pharmacy
                  </Link>

                </div>

              )}

            </div>

            <div className="request-process-card">

              <h3>
                What happens next?
              </h3>

              <div className="request-process-step">

                <span>
                  1
                </span>

                <p>
                  Your request is sent to the
                  selected pharmacy.
                </p>

              </div>

              <div className="request-process-step">

                <span>
                  2
                </span>

                <p>
                  The pharmacist reviews your
                  request and accepts or rejects it.
                </p>

              </div>

              <div className="request-process-step">

                <span>
                  3
                </span>

                <p>
                  Track the request status from
                  My Requests.
                </p>

              </div>

            </div>

          </div>

        </div>

      </div>

    </div>
  );
}

export default RequestMedicine;