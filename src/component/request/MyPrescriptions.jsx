import { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  query,
  where
} from "firebase/firestore";
import { db } from "../../firebase/Firebase";
import { Link } from "react-router-dom";

function MyPrescriptions() {
  const [prescriptions, setPrescriptions] =
    useState([]);

  const [filter, setFilter] =
    useState("All");

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  useEffect(() => {
    const loadPrescriptions =
      async () => {
        try {
          setLoading(true);
          setError("");

          const userId =
            localStorage.getItem("uid");

          if (!userId) {
            setError(
              "Please login to view your prescriptions."
            );
            return;
          }

          const prescriptionQuery =
            query(
              collection(
                db,
                "prescriptions"
              ),
              where(
                "userId",
                "==",
                userId
              )
            );

          const snapshot =
            await getDocs(
              prescriptionQuery
            );

          const data =
            snapshot.docs.map(
              (item) => ({
                id: item.id,
                ...item.data()
              })
            );

          data.sort((a, b) => {
            const dateA =
              a.createdAt?.toDate?.() ||
              new Date(0);

            const dateB =
              b.createdAt?.toDate?.() ||
              new Date(0);

            return dateB - dateA;
          });

          setPrescriptions(data);
        } catch (err) {
          console.error(
            "PRESCRIPTION LOAD ERROR:",
            err
          );

          setError(
            "Unable to load your prescriptions."
          );
        } finally {
          setLoading(false);
        }
      };

    loadPrescriptions();
  }, []);

  const filteredPrescriptions =
    filter === "All"
      ? prescriptions
      : prescriptions.filter(
          (item) =>
            item.status === filter
        );

  const pendingCount =
    prescriptions.filter(
      (item) =>
        item.status === "Pending"
    ).length;

  const reviewedCount =
    prescriptions.filter(
      (item) =>
        item.status === "Reviewed"
    ).length;

  const completedCount =
    prescriptions.filter(
      (item) =>
        item.status === "Completed"
    ).length;

  const formatDate = (
    timestamp
  ) => {
    if (!timestamp?.toDate) {
      return "Recently";
    }

    return timestamp
      .toDate()
      .toLocaleDateString(
        "en-IN",
        {
          day: "numeric",
          month: "short",
          year: "numeric"
        }
      );
  };

  const formatTime = (
    timestamp
  ) => {
    if (!timestamp?.toDate) {
      return "";
    }

    return timestamp
      .toDate()
      .toLocaleTimeString(
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
      status === "Reviewed"
    ) {
      return "prescription-status reviewed";
    }

    if (
      status === "Completed"
    ) {
      return "prescription-status completed";
    }

    if (
      status === "Rejected"
    ) {
      return "prescription-status rejected";
    }

    return "prescription-status pending";
  };

  const getFileType = (
    type,
    fileName
  ) => {
    if (
      type?.includes("pdf")
    ) {
      return "PDF";
    }

    if (
      type?.includes("image")
    ) {
      return "IMAGE";
    }

    if (
      fileName
        ?.toLowerCase()
        .endsWith(".pdf")
    ) {
      return "PDF";
    }

    if (
      fileName
        ?.toLowerCase()
        .endsWith(
          ".jpg"
        ) ||
      fileName
        ?.toLowerCase()
        .endsWith(
          ".jpeg"
        ) ||
      fileName
        ?.toLowerCase()
        .endsWith(
          ".png"
        )
    ) {
      return "IMAGE";
    }

    return "FILE";
  };

  const getTimelineStatus =
    (status) => {
      return {
        uploaded: true,
        reviewed:
          status === "Reviewed" ||
          status === "Completed",
        completed:
          status === "Completed"
      };
    };

  return (
    <div className="my-prescriptions-page">

      <div className="my-prescriptions-container">

        <div className="my-prescriptions-header">

          <div>

            <span className="results-label">
              PRESCRIPTION CENTER
            </span>

            <h1>
              My Prescriptions
            </h1>

            <p>
              Track prescriptions submitted
              to pharmacies and monitor
              their review status.
            </p>

          </div>

          <Link
            to="/prescription-upload"
            className="upload-prescription-btn"
          >
            + Upload Prescription
          </Link>

        </div>

        <div className="prescription-summary-grid">

          <div
            className={
              filter === "All"
                ? "prescription-summary-card active"
                : "prescription-summary-card"
            }
            onClick={() =>
              setFilter("All")
            }
          >

            <span className="prescription-summary-icon">
              📄
            </span>

            <div>
              <span>Total</span>
              <strong>
                {prescriptions.length}
              </strong>
            </div>

          </div>

          <div
            className={
              filter === "Pending"
                ? "prescription-summary-card active"
                : "prescription-summary-card"
            }
            onClick={() =>
              setFilter("Pending")
            }
          >

            <span className="prescription-summary-icon">
              ⏳
            </span>

            <div>
              <span>Pending</span>
              <strong>
                {pendingCount}
              </strong>
            </div>

          </div>

          <div
            className={
              filter === "Reviewed"
                ? "prescription-summary-card active"
                : "prescription-summary-card"
            }
            onClick={() =>
              setFilter("Reviewed")
            }
          >

            <span className="prescription-summary-icon">
              👁
            </span>

            <div>
              <span>Reviewed</span>
              <strong>
                {reviewedCount}
              </strong>
            </div>

          </div>

          <div
            className={
              filter === "Completed"
                ? "prescription-summary-card active"
                : "prescription-summary-card"
            }
            onClick={() =>
              setFilter("Completed")
            }
          >

            <span className="prescription-summary-icon">
              ✓
            </span>

            <div>
              <span>Completed</span>
              <strong>
                {completedCount}
              </strong>
            </div>

          </div>

        </div>

        <div className="prescription-filter-bar">

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
              {item}
            </button>

          ))}

        </div>

        {loading && (

          <div className="prescriptions-loading">

            <div className="loading-spinner"></div>

            <h3>
              Loading your prescriptions...
            </h3>

          </div>

        )}

        {!loading &&
          error && (

            <div className="prescriptions-error">

              <div>
                ⚠️
              </div>

              <h2>
                {error}
              </h2>

              <Link to="/login">
                Login
              </Link>

            </div>

          )}

        {!loading &&
          !error &&
          filteredPrescriptions.length === 0 && (

            <div className="prescriptions-empty">

              <div className="prescriptions-empty-icon">
                📋
              </div>

              <h2>
                {filter === "All"
                  ? "No prescriptions yet"
                  : `No ${filter.toLowerCase()} prescriptions`}
              </h2>

              <p>
                Upload your prescription
                and send it directly to
                a selected pharmacy.
              </p>

              <Link
                to="/prescription-upload"
                className="empty-upload-btn"
              >
                Upload Prescription
              </Link>

            </div>

          )}

        {!loading &&
          !error &&
          filteredPrescriptions.length > 0 && (

            <div className="prescriptions-list">

              {filteredPrescriptions.map(
                (prescription) => {

                  const status =
                    prescription.status ||
                    "Pending";

                  const timeline =
                    getTimelineStatus(
                      status
                    );

                  const fileType =
                    getFileType(
                      prescription.fileType,
                      prescription.fileName
                    );

                  return (

                    <div
                      className="user-prescription-card"
                      key={
                        prescription.id
                      }
                    >

                      <div className="prescription-card-top">

                        <div className="prescription-file-info">

                          <div className="prescription-file-icon">

                            {fileType ===
                            "PDF"
                              ? "📕"
                              : "🖼️"}

                          </div>

                          <div>

                            <h2>
                              {prescription.fileName ||
                                "Prescription"}
                            </h2>

                            <p>
                              {fileType}
                            </p>

                          </div>

                        </div>

                        <span
                          className={getStatusClass(
                            status
                          )}
                        >
                          {status}
                        </span>

                      </div>

                      <div className="prescription-info-grid">

                        <div>

                          <span>
                            Pharmacy
                          </span>

                          <strong>
                            {prescription.pharmacyName ||
                              "Pharmacy"}
                          </strong>

                        </div>

                        <div>

                          <span>
                            Medicine
                          </span>

                          <strong>
                            {prescription.medicineName ||
                              "Not specified"}
                          </strong>

                        </div>

                        <div>

                          <span>
                            Uploaded
                          </span>

                          <strong>
                            {formatDate(
                              prescription.createdAt
                            )}
                          </strong>

                        </div>

                        <div>

                          <span>
                            Time
                          </span>

                          <strong>
                            {formatTime(
                              prescription.createdAt
                            )}
                          </strong>

                        </div>

                      </div>

                      <div className="prescription-timeline">

                        <div
                          className={
                            timeline.uploaded
                              ? "prescription-timeline-step active"
                              : "prescription-timeline-step"
                          }
                        >

                          <div className="prescription-timeline-dot">
                            ✓
                          </div>

                          <span>
                            Uploaded
                          </span>

                        </div>

                        <div
                          className={
                            timeline.reviewed
                              ? "prescription-timeline-line active"
                              : "prescription-timeline-line"
                          }
                        ></div>

                        <div
                          className={
                            timeline.reviewed
                              ? "prescription-timeline-step active"
                              : "prescription-timeline-step"
                          }
                        >

                          <div className="prescription-timeline-dot">

                            {timeline.reviewed
                              ? "✓"
                              : "2"}

                          </div>

                          <span>
                            Reviewed
                          </span>

                        </div>

                        <div
                          className={
                            timeline.completed
                              ? "prescription-timeline-line active"
                              : "prescription-timeline-line"
                          }
                        ></div>

                        <div
                          className={
                            timeline.completed
                              ? "prescription-timeline-step active"
                              : "prescription-timeline-step"
                          }
                        >

                          <div className="prescription-timeline-dot">

                            {timeline.completed
                              ? "✓"
                              : "3"}

                          </div>

                          <span>
                            Completed
                          </span>

                        </div>

                      </div>

                      {prescription.notes && (

                        <div className="prescription-notes">

                          <span>
                            Your Notes
                          </span>

                          <p>
                            {prescription.notes}
                          </p>

                        </div>

                      )}

                      <div className="prescription-card-actions">

                        {prescription.fileUrl && (

                          <a
                            href={
                              prescription.fileUrl
                            }
                            target="_blank"
                            rel="noreferrer"
                            className="view-prescription-btn"
                          >
                            View Prescription
                          </a>

                        )}

                      </div>

                    </div>

                  );
                }
              )}

            </div>

          )}

      </div>

    </div>
  );
}

export default MyPrescriptions;