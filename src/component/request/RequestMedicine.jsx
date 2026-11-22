import { useEffect, useState } from "react";

import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
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

  const [approvedPharmacies, setApprovedPharmacies] =
    useState([]);


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


  // LOAD APPROVED PHARMACIES

  useEffect(() => {

    const loadPharmacies = async () => {

      try {

        setLoading(true);
        setError("");


        const pharmacyQuery = query(
          collection(db, "pharmacies"),
          where("status", "==", "approved")
        );


        const pharmacySnapshot =
          await getDocs(pharmacyQuery);


        const pharmacyData =
          pharmacySnapshot.docs

            .filter((item) => {

              const data = item.data();

              return (
                data.ownerId &&
                data.status === "approved"
              );

            })

            .map((item) => ({

              id: item.id,

              ...item.data()

            }));


        setApprovedPharmacies(
          pharmacyData
        );


        // LOAD SELECTED PHARMACY
        // ONLY FOR DISPLAY PURPOSES

        if (pharmacyIdFromUrl) {

          const selectedPharmacy =
            pharmacyData.find(
              (item) =>
                item.id === pharmacyIdFromUrl
            );


          if (selectedPharmacy) {

            setPharmacy(
              selectedPharmacy
            );

          } else {

            setPharmacy(null);

          }

        }


        if (pharmacyData.length === 0) {

          setError(
            "No approved pharmacies are currently available."
          );

        }

      } catch (err) {

        console.error(
          "PHARMACY LOAD ERROR:",
          err
        );

        setError(
          "Unable to load approved pharmacies."
        );

      } finally {

        setLoading(false);

      }

    };


    loadPharmacies();

  }, [pharmacyIdFromUrl]);


  // SUBMIT MEDICINE REQUEST

  const handleSubmit = async (e) => {

    e.preventDefault();

    setError("");
    setSuccess(false);


    const userId =
      localStorage.getItem("uid");

    const userName =
      localStorage.getItem("userName") || "";

    const userEmail =
      localStorage.getItem("userEmail") || "";


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


    if (
      !quantity ||
      !Number.isInteger(Number(quantity)) ||
      Number(quantity) < 1
    ) {

      setError(
        "Quantity must be at least 1."
      );

      return;

    }


    if (approvedPharmacies.length === 0) {

      setError(
        "No approved pharmacies are available right now."
      );

      return;

    }


    try {

      setSubmitting(true);


      // VERIFY USER

      const userRef = doc(
        db,
        "users",
        userId
      );


      const userSnapshot =
        await getDoc(userRef);


      if (!userSnapshot.exists()) {

        setError(
          "User profile not found. Please login again."
        );

        return;

      }


      const userData =
        userSnapshot.data();


      if (userData.role !== "user") {

        setError(
          "Only registered users can submit medicine requests."
        );

        return;

      }


      // FETCH APPROVED PHARMACIES AGAIN
      // TO AVOID USING OLD DATA

      const pharmacyQuery = query(
        collection(db, "pharmacies"),
        where("status", "==", "approved")
      );


      const pharmacySnapshot =
        await getDocs(pharmacyQuery);


      const currentPharmacies =
        pharmacySnapshot.docs

          .filter((item) => {

            const data = item.data();

            return (
              data.ownerId &&
              data.status === "approved"
            );

          })

          .map((item) => ({

            id: item.id,

            ...item.data()

          }));


      if (currentPharmacies.length === 0) {

        setError(
          "No approved pharmacies are available."
        );

        return;

      }


      // GET ALL PHARMACY IDS

      const targetPharmacyIds =
        currentPharmacies.map(
          (item) => item.id
        );


      const finalQuantity =
        Number(quantity);


      const finalMedicineName =
        medicineName.trim();


      // CREATE ONE REQUEST FOR MULTIPLE PHARMACIES

      await addDoc(

        collection(
          db,
          "medicineRequests"
        ),

        {

          userId,

          userName:
            userData.name ||
            userName ||
            "Customer",

          userEmail:
            userData.email ||
            userEmail ||
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


          // MULTIPLE PHARMACY SUPPORT

          targetPharmacyIds,

          broadcast: true,

          totalPharmacies:
            targetPharmacyIds.length,


          // LEGACY FIELDS
          // PRESERVED FOR OLD CODE COMPATIBILITY

          pharmacyId: "",

          pharmacyName: "",

          pharmacyAddress: "",

          pharmacyCity: "",

          pharmacyState: "",

          pharmacyPhone: "",


          status:
            "Pending",


          createdAt:
            serverTimestamp(),

          updatedAt:
            serverTimestamp()

        }

      );


      // SUCCESS INFORMATION

      setSubmittedMedicine(
        finalMedicineName
      );


      setSubmittedQuantity(
        finalQuantity
      );


      setSubmittedPharmacy(
        `${targetPharmacyIds.length} approved pharmacies`
      );


      setSuccess(true);


      // RESET FORM

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


  // SUCCESS SCREEN

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

            has been shared with{" "}

            <strong>
              {submittedPharmacy}
            </strong>.

            Pharmacies can now respond to your request.

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


  // MAIN PAGE

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
            Send one request to multiple approved
            pharmacies and compare their responses.
          </p>

        </div>


        <div className="request-layout">


          {/* REQUEST FORM */}

          <div className="request-form-card">


            {error && (

              <div className="form-error">
                {error}
              </div>

            )}


            <form onSubmit={handleSubmit}>


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
                        setMedicineName(e.target.value)
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
                      step="1"
                      value={quantity}
                      onChange={(e) =>
                        setQuantity(e.target.value)
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
                        setDosage(e.target.value)
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
                      setLocation(e.target.value)
                    }
                    placeholder="Enter your area or address"
                  />


                  <small>
                    Example: Model Town, Ludhiana
                  </small>

                </div>


                <div className="form-group request-message-group">

                  <label>
                    Additional Message
                  </label>


                  <textarea
                    value={message}
                    onChange={(e) =>
                      setMessage(e.target.value)
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
                  approvedPharmacies.length === 0
                }
              >

                {submitting

                  ? "Sending Request..."

                  : "Send Request to Pharmacies"}

              </button>


            </form>


          </div>


          {/* SIDE INFORMATION */}

          <div className="request-side">


            <div className="selected-pharmacy-card">


              <span className="selected-pharmacy-label">
                PHARMACY NETWORK
              </span>


              {loading ? (

                <p>
                  Loading approved pharmacies...
                </p>

              ) : approvedPharmacies.length > 0 ? (

                <>

                  <div className="selected-pharmacy-icon">
                    🏥
                  </div>


                  <h2>
                    Multiple Pharmacies
                  </h2>


                  <p>
                    Your request will be shared with
                    approved pharmacies.
                  </p>


                  <div className="selected-pharmacy-phone">

                    {approvedPharmacies.length} pharmacies available

                  </div>


                  {pharmacy && (

                    <p>
                      Initially selected: {pharmacy.name}
                    </p>

                  )}

                </>

              ) : (

                <div className="no-pharmacy-selected">

                  <div>
                    🏥
                  </div>


                  <h3>
                    No pharmacies available
                  </h3>


                  <p>
                    There are currently no approved pharmacies
                    available to receive your request.
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
                  Your request is shared with approved pharmacies.
                </p>

              </div>


              <div className="request-process-step">

                <span>
                  2
                </span>


                <p>
                  Pharmacies respond with availability and price.
                </p>

              </div>


              <div className="request-process-step">

                <span>
                  3
                </span>


                <p>
                  Compare pharmacy offers from My Requests.
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