import { useEffect, useState } from "react";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  updateDoc,
  where,
  serverTimestamp
} from "firebase/firestore";

import { db } from "../../firebase/Firebase";

function MedicineRequests() {
  const [requests, setRequests] = useState([]);
  const [filter, setFilter] = useState("All");

  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    loadRequests();
  }, []);

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
        "You are not authorized to manage medicine requests."
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

  const loadRequests = async () => {
    try {
      setLoading(true);
      setError("");

      const pharmacy =
        await verifyPharmacy();

      const requestQuery =
        query(
          collection(
            db,
            "medicineRequests"
          ),
          where(
            "pharmacyId",
            "==",
            pharmacy.pharmacyId
          )
        );

      const requestSnapshot =
        await getDocs(
          requestQuery
        );

      const requestData =
        requestSnapshot.docs.map(
          (item) => ({
            id: item.id,
            ...item.data()
          })
        );

      requestData.sort((a, b) => {
        const aTime =
          a.createdAt?.seconds || 0;

        const bTime =
          b.createdAt?.seconds || 0;

        return bTime - aTime;
      });

      setRequests(
        requestData
      );
    } catch (err) {
      console.error(
        "LOAD MEDICINE REQUESTS ERROR:",
        err
      );

      setError(
        err.message ||
          "Unable to load medicine requests."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (
    id,
    status
  ) => {
    const allowedStatuses = [
      "Pending",
      "Accepted",
      "Completed",
      "Rejected"
    ];

    if (
      !allowedStatuses.includes(
        status
      )
    ) {
      setError(
        "Invalid request status."
      );
      return;
    }

    try {
      setUpdatingId(id);
      setError("");

      const pharmacy =
        await verifyPharmacy();

      const requestRef =
        doc(
          db,
          "medicineRequests",
          id
        );

      const requestSnapshot =
        await getDoc(
          requestRef
        );

      if (
        !requestSnapshot.exists()
      ) {
        setError(
          "Medicine request not found."
        );
        return;
      }

      const requestData =
        requestSnapshot.data();

      if (
        requestData.pharmacyId !==
        pharmacy.pharmacyId
      ) {
        setError(
          "You are not authorized to update this request."
        );
        return;
      }

      await updateDoc(
        requestRef,
        {
          status,
          updatedAt:
            serverTimestamp()
        }
      );

      setRequests((current) =>
        current.map((item) =>
          item.id === id
            ? {
                ...item,
                status
              }
            : item
        )
      );
    } catch (err) {
      console.error(
        "UPDATE REQUEST ERROR:",
        err
      );

      setError(
        err.message ||
          "Unable to update request status."
      );
    } finally {
      setUpdatingId("");
    }
  };

  const filteredRequests =
    filter === "All"
      ? requests
      : requests.filter(
          (item) =>
            item.status === filter
        );

  const formatDate = (
    timestamp
  ) => {
    if (!timestamp) {
      return "Date unavailable";
    }

    const date =
      timestamp.toDate
        ? timestamp.toDate()
        : new Date(
            timestamp.seconds *
              1000
          );

    return date.toLocaleDateString(
      "en-IN",
      {
        day: "2-digit",
        month: "short",
        year: "numeric"
      }
    );
  };

  const formatTime = (
    timestamp
  ) => {
    if (!timestamp) {
      return "";
    }

    const date =
      timestamp.toDate
        ? timestamp.toDate()
        : new Date(
            timestamp.seconds *
              1000
          );

    return date.toLocaleTimeString(
      "en-IN",
      {
        hour: "2-digit",
        minute: "2-digit"
      }
    );
  };

  const getStatusClass = (
    status
  ) => {
    if (
      status === "Accepted"
    ) {
      return "available";
    }

    if (
      status === "Completed"
    ) {
      return "completed";
    }

    if (
      status === "Rejected"
    ) {
      return "rejected";
    }

    return "pending";
  };

  if (loading) {
    return (
      <main className="medicine-requests-page">

        <div className="medicine-requests-loading">

          <div className="medicine-requests-spinner"></div>

          <h3>
            Loading medicine requests...
          </h3>

          <p>
            Please wait while we load customer requests.
          </p>

        </div>

      </main>
    );
  }

  return (
    <main className="medicine-requests-page">

      <div className="medicine-requests-container">

        <section className="medicine-requests-hero">

          <div className="medicine-requests-hero-content">

            <span className="medicine-requests-badge">
              MEDICINE REQUEST MANAGEMENT
            </span>

            <h1>
              Medicine Requests
            </h1>

            <p>
              Review medicine requests received
              from customers and update their status.
            </p>

          </div>

          <div className="medicine-requests-hero-icon">
            📩
          </div>

        </section>

        <section className="medicine-requests-card">

          <div className="medicine-requests-header">

            <div>

              <span className="medicine-requests-label">
                PHARMACY REQUESTS
              </span>

              <h2>
                Customer Requests
              </h2>

              <p>
                Manage medicine requests sent to
                your pharmacy.
              </p>

            </div>

            <div className="medicine-requests-total">

              <strong>
                {requests.length}
              </strong>

              <span>
                Total
              </span>

            </div>

          </div>

          {error && (
            <div className="medicine-requests-error">
              {error}
            </div>
          )}

          <div className="medicine-requests-filters">

            {[
              "All",
              "Pending",
              "Accepted",
              "Completed",
              "Rejected"
            ].map((item) => (

              <button
                key={item}
                type="button"
                className={
                  filter === item
                    ? "medicine-request-filter active"
                    : "medicine-request-filter"
                }
                onClick={() =>
                  setFilter(item)
                }
              >

                {item}

                <span>
                  {item === "All"
                    ? requests.length
                    : requests.filter(
                        (request) =>
                          request.status ===
                          item
                      ).length}
                </span>

              </button>

            ))}

          </div>

          {filteredRequests.length === 0 ? (

            <div className="medicine-requests-empty">

              <div className="medicine-requests-empty-icon">
                📩
              </div>

              <h3>
                No Requests Found
              </h3>

              <p>
                There are no medicine requests
                in the selected category.
              </p>

            </div>

          ) : (

            <div className="medicine-requests-list">

              {filteredRequests.map(
                (request) => (

                  <div
                    className="medicine-request-item"
                    key={request.id}
                  >

                    <div className="medicine-request-top">

                      <div className="medicine-request-customer">

                        <div className="medicine-request-avatar">

                          {(
                            request.userName ||
                            "U"
                          )
                            .charAt(0)
                            .toUpperCase()}

                        </div>

                        <div>

                          <h3>
                            {request.userName ||
                              "Customer"}
                          </h3>

                          <p>
                            {request.userEmail ||
                              "Email unavailable"}
                          </p>

                        </div>

                      </div>

                      <span
                        className={`medicine-request-status ${getStatusClass(
                          request.status
                        )}`}
                      >
                        ●{" "}
                        {request.status ||
                          "Pending"}
                      </span>

                    </div>

                    <div className="medicine-request-details">

                      <div className="medicine-request-detail-box">

                        <span>
                          Medicine
                        </span>

                        <strong>
                          {request.medicineName ||
                            "Not specified"}
                        </strong>

                      </div>

                      <div className="medicine-request-detail-box">

                        <span>
                          Quantity
                        </span>

                        <strong>
                          {request.quantity ||
                            0}
                        </strong>

                      </div>

                      <div className="medicine-request-detail-box">

                        <span>
                          Dosage
                        </span>

                        <strong>
                          {request.dosage ||
                            "Not specified"}
                        </strong>

                      </div>

                      <div className="medicine-request-detail-box">

                        <span>
                          Requested
                        </span>

                        <strong>
                          {formatDate(
                            request.createdAt
                          )}
                        </strong>

                        <small>
                          {formatTime(
                            request.createdAt
                          )}
                        </small>

                      </div>

                    </div>

                    {request.location && (

                      <div className="medicine-request-location">

                        <span>
                          Customer Location
                        </span>

                        <p>
                          📍 {request.location}
                        </p>

                      </div>

                    )}

                    {request.message && (

                      <div className="medicine-request-message">

                        <span>
                          Customer Message
                        </span>

                        <p>
                          {request.message}
                        </p>

                      </div>

                    )}

                    <div className="medicine-request-status-section">

                      <div>

                        <span>
                          Update Status
                        </span>

                        <p>
                          Change the request
                          status for this customer.
                        </p>

                      </div>

                      <div className="medicine-request-status-actions">

                        <button
                          type="button"
                          className={
                            request.status ===
                            "Pending"
                              ? "request-status-btn pending active"
                              : "request-status-btn pending"
                          }
                          onClick={() =>
                            handleStatusChange(
                              request.id,
                              "Pending"
                            )
                          }
                          disabled={
                            updatingId ===
                            request.id
                          }
                        >
                          Pending
                        </button>

                        <button
                          type="button"
                          className={
                            request.status ===
                            "Accepted"
                              ? "request-status-btn available active"
                              : "request-status-btn available"
                          }
                          onClick={() =>
                            handleStatusChange(
                              request.id,
                              "Accepted"
                            )
                          }
                          disabled={
                            updatingId ===
                            request.id
                          }
                        >
                          Accepted
                        </button>

                        <button
                          type="button"
                          className={
                            request.status ===
                            "Completed"
                              ? "request-status-btn completed active"
                              : "request-status-btn completed"
                          }
                          onClick={() =>
                            handleStatusChange(
                              request.id,
                              "Completed"
                            )
                          }
                          disabled={
                            updatingId ===
                            request.id
                          }
                        >
                          Completed
                        </button>

                        <button
                          type="button"
                          className={
                            request.status ===
                            "Rejected"
                              ? "request-status-btn rejected active"
                              : "request-status-btn rejected"
                          }
                          onClick={() =>
                            handleStatusChange(
                              request.id,
                              "Rejected"
                            )
                          }
                          disabled={
                            updatingId ===
                            request.id
                          }
                        >
                          Rejected
                        </button>

                      </div>

                    </div>

                  </div>
                )
              )}

            </div>

          )}

        </section>

      </div>

    </main>
  );
}

export default MedicineRequests;