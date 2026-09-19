import { useCallback, useEffect, useMemo, useState } from "react";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  updateDoc,
  where
} from "firebase/firestore";

import { db } from "../../firebase/Firebase";

function Prescriptions() {
  const [prescriptions, setPrescriptions] = useState([]);
  const [filter, setFilter] = useState("All");
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState("");
  const [error, setError] = useState("");

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
        "You are not authorized to manage prescriptions."
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

  const loadPrescriptions = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const pharmacy =
        await verifyPharmacy();

      const prescriptionQuery =
        query(
          collection(
            db,
            "prescriptions"
          ),
          where(
            "pharmacyId",
            "==",
            pharmacy.pharmacyId
          )
        );

      const prescriptionSnapshot =
        await getDocs(
          prescriptionQuery
        );

      const prescriptionData =
        prescriptionSnapshot.docs.map(
          (item) => ({
            id: item.id,
            ...item.data()
          })
        );

      prescriptionData.sort((a, b) => {
        const aTime =
          a.createdAt?.seconds || 0;

        const bTime =
          b.createdAt?.seconds || 0;

        return bTime - aTime;
      });

      setPrescriptions(
        prescriptionData
      );
    } catch (err) {
      console.error(
        "LOAD PRESCRIPTIONS ERROR:",
        err
      );

      setError(
        err.message ||
          "Unable to load prescriptions. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPrescriptions();
  }, [loadPrescriptions]);

  const handleStatusChange = async (
    id,
    status
  ) => {
    const allowedStatuses = [
      "Pending",
      "Reviewed",
      "Completed"
    ];

    if (
      !allowedStatuses.includes(
        status
      )
    ) {
      setError(
        "Invalid prescription status."
      );
      return;
    }

    const currentPrescription =
      prescriptions.find(
        (item) =>
          item.id === id
      );

    if (!currentPrescription) {
      setError(
        "Prescription not found."
      );
      return;
    }

    if (
      currentPrescription.status ===
      status
    ) {
      return;
    }

    try {
      setUpdatingId(id);
      setError("");

      const pharmacy =
        await verifyPharmacy();

      const prescriptionRef =
        doc(
          db,
          "prescriptions",
          id
        );

      const prescriptionSnapshot =
        await getDoc(
          prescriptionRef
        );

      if (
        !prescriptionSnapshot.exists()
      ) {
        setError(
          "Prescription not found."
        );
        return;
      }

      const prescriptionData =
        prescriptionSnapshot.data();

      if (
        prescriptionData.pharmacyId !==
        pharmacy.pharmacyId
      ) {
        setError(
          "You are not authorized to update this prescription."
        );
        return;
      }

      await updateDoc(
        prescriptionRef,
        {
          status,
          updatedAt:
            serverTimestamp()
        }
      );

      setPrescriptions((current) =>
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
        "UPDATE PRESCRIPTION ERROR:",
        err
      );

      setError(
        err.message ||
          "Unable to update prescription status."
      );
    } finally {
      setUpdatingId("");
    }
  };

  const filteredPrescriptions =
    useMemo(() => {
      if (filter === "All") {
        return prescriptions;
      }

      return prescriptions.filter(
        (item) =>
          item.status === filter
      );
    }, [
      prescriptions,
      filter
    ]);

  const statusCounts =
    useMemo(() => {
      return {
        All:
          prescriptions.length,

        Pending:
          prescriptions.filter(
            (item) =>
              item.status ===
              "Pending"
          ).length,

        Reviewed:
          prescriptions.filter(
            (item) =>
              item.status ===
              "Reviewed"
          ).length,

        Completed:
          prescriptions.filter(
            (item) =>
              item.status ===
              "Completed"
          ).length
      };
    }, [prescriptions]);

  const formatDate = (
    timestamp
  ) => {
    if (!timestamp) {
      return "Date unavailable";
    }

    try {
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
    } catch {
      return "Date unavailable";
    }
  };

  const formatTime = (
    timestamp
  ) => {
    if (!timestamp) {
      return "";
    }

    try {
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
    } catch {
      return "";
    }
  };

  const getStatusClass = (
    status
  ) => {
    if (
      status === "Reviewed"
    ) {
      return "reviewed";
    }

    if (
      status === "Completed"
    ) {
      return "completed";
    }

    return "pending";
  };

  const getInitial = (name) => {
    if (!name) {
      return "U";
    }

    return name
      .trim()
      .charAt(0)
      .toUpperCase();
  };

  if (loading) {
    return (
      <main className="prescriptions-page">

        <div className="prescriptions-loading">

          <div className="prescriptions-spinner"></div>

          <h3>
            Loading prescriptions...
          </h3>

          <p>
            Please wait while we load customer
            prescriptions.
          </p>

        </div>

      </main>
    );
  }

  return (
    <main className="prescriptions-page">

      <div className="prescriptions-container">

        <section className="prescriptions-hero">

          <div className="prescriptions-hero-content">

            <span className="prescriptions-badge">
              PRESCRIPTION MANAGEMENT
            </span>

            <h1>
              Customer Prescriptions
            </h1>

            <p>
              Review prescriptions submitted by
              customers and keep track of their
              processing status.
            </p>

          </div>

          <div className="prescriptions-hero-icon">
            📋
          </div>

        </section>

        <section className="prescriptions-card">

          <div className="prescriptions-header">

            <div>

              <span className="prescriptions-label">
                PHARMACY PRESCRIPTIONS
              </span>

              <h2>
                Prescription Requests
              </h2>

              <p>
                Review and manage prescriptions
                received by your pharmacy.
              </p>

            </div>

            <div className="prescriptions-total">

              <strong>
                {prescriptions.length}
              </strong>

              <span>
                Total
              </span>

            </div>

          </div>

          {error && (
            <div className="prescriptions-error">

              <span>
                ⚠️
              </span>

              <div>

                <strong>
                  Something went wrong
                </strong>

                <p>
                  {error}
                </p>

              </div>

              <button
                type="button"
                onClick={
                  loadPrescriptions
                }
              >
                Retry
              </button>

            </div>
          )}

          <div className="prescriptions-filters">

            {[
              "All",
              "Pending",
              "Reviewed",
              "Completed"
            ].map((item) => (

              <button
                key={item}
                type="button"
                className={
                  filter === item
                    ? "prescription-filter active"
                    : "prescription-filter"
                }
                onClick={() =>
                  setFilter(item)
                }
              >

                <span>
                  {item}
                </span>

                <strong>
                  {statusCounts[item]}
                </strong>

              </button>

            ))}

          </div>

          {filteredPrescriptions.length === 0 ? (

            <div className="prescriptions-empty">

              <div className="prescriptions-empty-icon">
                📄
              </div>

              <h3>
                No Prescriptions Found
              </h3>

              <p>
                {filter === "All"
                  ? "No customers have submitted prescriptions to your pharmacy yet."
                  : `There are no ${filter.toLowerCase()} prescriptions right now.`}
              </p>

              {filter !== "All" && (
                <button
                  type="button"
                  onClick={() =>
                    setFilter("All")
                  }
                >
                  View All Prescriptions
                </button>
              )}

            </div>

          ) : (

            <div className="prescriptions-list">

              {filteredPrescriptions.map(
                (prescription) => {

                  const status =
                    prescription.status ||
                    "Pending";

                  const isUpdating =
                    updatingId ===
                    prescription.id;

                  return (
                    <div
                      className="prescription-item"
                      key={
                        prescription.id
                      }
                    >

                      <div className="prescription-item-top">

                        <div className="prescription-customer">

                          <div className="prescription-avatar">

                            {getInitial(
                              prescription.userName
                            )}

                          </div>

                          <div>

                            <h3>
                              {prescription.userName ||
                                "Customer"}
                            </h3>

                            <p>
                              {prescription.userEmail ||
                                "Email unavailable"}
                            </p>

                          </div>

                        </div>

                        <span
                          className={`prescription-status ${getStatusClass(
                            status
                          )}`}
                        >
                          ● {status}
                        </span>

                      </div>

                      <div className="prescription-details-grid">

                        <div className="prescription-detail-box">

                          <span>
                            Medicine
                          </span>

                          <strong>
                            {prescription.medicineName ||
                              "Not specified"}
                          </strong>

                        </div>

                        <div className="prescription-detail-box">

                          <span>
                            Submitted
                          </span>

                          <strong>
                            {formatDate(
                              prescription.createdAt
                            )}
                          </strong>

                          <small>
                            {formatTime(
                              prescription.createdAt
                            )}
                          </small>

                        </div>

                        <div className="prescription-detail-box">

                          <span>
                            Prescription File
                          </span>

                          {prescription.fileUrl ? (

                            <a
                              href={
                                prescription.fileUrl
                              }
                              target="_blank"
                              rel="noreferrer"
                              className="prescription-view-btn"
                            >
                              👁 View Prescription
                            </a>

                          ) : (

                            <strong>
                              File unavailable
                            </strong>

                          )}

                        </div>

                        <div className="prescription-detail-box">

                          <span>
                            File Type
                          </span>

                          <strong>
                            {prescription.fileType ||
                              "Unknown"}
                          </strong>

                        </div>

                      </div>

                      {prescription.notes && (

                        <div className="prescription-notes">

                          <span>
                            Customer Notes
                          </span>

                          <p>
                            {prescription.notes}
                          </p>

                        </div>

                      )}

                      <div className="prescription-status-section">

                        <div>

                          <span>
                            Update Status
                          </span>

                          <p>
                            Keep the customer
                            updated by changing
                            the prescription status.
                          </p>

                        </div>

                        <div className="prescription-status-actions">

                          <button
                            type="button"
                            className={
                              status ===
                              "Pending"
                                ? "status-btn pending active"
                                : "status-btn pending"
                            }
                            onClick={() =>
                              handleStatusChange(
                                prescription.id,
                                "Pending"
                              )
                            }
                            disabled={
                              isUpdating
                            }
                          >
                            Pending
                          </button>

                          <button
                            type="button"
                            className={
                              status ===
                              "Reviewed"
                                ? "status-btn reviewed active"
                                : "status-btn reviewed"
                            }
                            onClick={() =>
                              handleStatusChange(
                                prescription.id,
                                "Reviewed"
                              )
                            }
                            disabled={
                              isUpdating
                            }
                          >
                            Reviewed
                          </button>

                          <button
                            type="button"
                            className={
                              status ===
                              "Completed"
                                ? "status-btn completed active"
                                : "status-btn completed"
                            }
                            onClick={() =>
                              handleStatusChange(
                                prescription.id,
                                "Completed"
                              )
                            }
                            disabled={
                              isUpdating
                            }
                          >
                            {isUpdating &&
                            status !==
                              "Completed"
                              ? "Updating..."
                              : "Completed"}
                          </button>

                        </div>

                      </div>

                    </div>
                  );
                }
              )}

            </div>

          )}

        </section>

      </div>

    </main>
  );
}

export default Prescriptions;