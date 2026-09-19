import { useEffect, useState } from "react";
import {
  collection,
  doc,
  getDocs,
  updateDoc
} from "firebase/firestore";
import { db } from "../../firebase/Firebase";

function PharmacyApplications() {
  const [applications, setApplications] =
    useState([]);

  const [filter, setFilter] =
    useState("all");

  const [loading, setLoading] =
    useState(true);

  const [processingId, setProcessingId] =
    useState("");

  const [error, setError] =
    useState("");

  const loadApplications = async () => {
    try {
      setLoading(true);
      setError("");

      const snapshot = await getDocs(
        collection(db, "pharmacies")
      );

      const data = snapshot.docs.map(
        (item) => ({
          id: item.id,
          ...item.data()
        })
      );

      data.sort((a, b) => {
        const aTime =
          a.createdAt?.seconds || 0;

        const bTime =
          b.createdAt?.seconds || 0;

        return bTime - aTime;
      });

      setApplications(data);
    } catch (err) {
      console.error(err);

      setError(
        err.message ||
        "Unable to load pharmacy applications."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadApplications();
  }, []);

  const updateApplicationStatus = async (
    application,
    status
  ) => {
    try {
      setProcessingId(application.id);
      setError("");

      if (
        status !== "approved" &&
        status !== "rejected"
      ) {
        return;
      }

      const pharmacyRef = doc(
        db,
        "pharmacies",
        application.id
      );

      await updateDoc(pharmacyRef, {
        status
      });

      if (application.ownerId) {
        const userRef = doc(
          db,
          "users",
          application.ownerId
        );

        await updateDoc(userRef, {
          status
        });
      }

      setApplications((previous) =>
        previous.map((item) =>
          item.id === application.id
            ? {
                ...item,
                status
              }
            : item
        )
      );
    } catch (err) {
      console.error(err);

      setError(
        err.message ||
        "Unable to update application."
      );
    } finally {
      setProcessingId("");
    }
  };

  const filteredApplications =
    applications.filter((application) => {
      if (filter === "all") {
        return true;
      }

      return (
        application.status === filter
      );
    });

  const pendingCount =
    applications.filter(
      (item) =>
        item.status === "pending"
    ).length;

  const approvedCount =
    applications.filter(
      (item) =>
        item.status === "approved"
    ).length;

  const rejectedCount =
    applications.filter(
      (item) =>
        item.status === "rejected"
    ).length;

  if (loading) {
    return (
      <div className="admin-loading">
        <div className="loading-spinner"></div>

        <h3>
          Loading pharmacy applications...
        </h3>
      </div>
    );
  }

  return (
    <div className="admin-page">

      <div className="admin-page-container">

        <div className="admin-hero">

          <div className="admin-hero-content">

            <span className="section-badge">
              PHARMACY PARTNERS
            </span>

            <h1>
              Pharmacy Applications
            </h1>

            <p>
              Review pharmacy partner
              applications and verify their
              submitted information before
              approval.
            </p>

          </div>

        </div>

        {error && (
          <div className="form-error">
            {error}
          </div>
        )}

        <div className="admin-dashboard-stats">

          <div className="admin-stat-card">

            <div className="admin-stat-icon">
              🏥
            </div>

            <div>
              <span>
                Total Applications
              </span>

              <strong>
                {applications.length}
              </strong>
            </div>

          </div>

          <div className="admin-stat-card">

            <div className="admin-stat-icon">
              ⏳
            </div>

            <div>
              <span>
                Pending
              </span>

              <strong>
                {pendingCount}
              </strong>
            </div>

          </div>

          <div className="admin-stat-card">

            <div className="admin-stat-icon">
              ✓
            </div>

            <div>
              <span>
                Approved
              </span>

              <strong>
                {approvedCount}
              </strong>
            </div>

          </div>

          <div className="admin-stat-card">

            <div className="admin-stat-icon">
              ✕
            </div>

            <div>
              <span>
                Rejected
              </span>

              <strong>
                {rejectedCount}
              </strong>
            </div>

          </div>

        </div>

        <div className="admin-form-container">

          <div className="admin-form-card">

            <div className="admin-form-header">

              <div className="admin-form-icon">
                🏥
              </div>

              <div>
                <h2>
                  Registered Pharmacies
                </h2>

                <p>
                  Review submitted pharmacy
                  details and licence documents.
                </p>
              </div>

            </div>

            <div className="application-filters">

              <button
                type="button"
                className={
                  filter === "all"
                    ? "application-filter active"
                    : "application-filter"
                }
                onClick={() =>
                  setFilter("all")
                }
              >
                All
              </button>

              <button
                type="button"
                className={
                  filter === "pending"
                    ? "application-filter active"
                    : "application-filter"
                }
                onClick={() =>
                  setFilter("pending")
                }
              >
                Pending
              </button>

              <button
                type="button"
                className={
                  filter === "approved"
                    ? "application-filter active"
                    : "application-filter"
                }
                onClick={() =>
                  setFilter("approved")
                }
              >
                Approved
              </button>

              <button
                type="button"
                className={
                  filter === "rejected"
                    ? "application-filter active"
                    : "application-filter"
                }
                onClick={() =>
                  setFilter("rejected")
                }
              >
                Rejected
              </button>

            </div>

            {filteredApplications.length ===
            0 ? (
              <div className="application-empty">

                <div>
                  🏥
                </div>

                <h3>
                  No applications found
                </h3>

                <p>
                  There are no pharmacy
                  applications in this category.
                </p>

              </div>
            ) : (
              <div className="application-list">

                {filteredApplications.map(
                  (application) => (

                    <div
                      className="application-card"
                      key={application.id}
                    >

                      <div className="application-card-header">

                        <div>

                          <span className="application-label">
                            PHARMACY
                          </span>

                          <h3>
                            {application.name ||
                              "Unnamed Pharmacy"}
                          </h3>

                        </div>

                        <span
                          className={`application-status ${application.status || "pending"}`}
                        >
                          {application.status ||
                            "pending"}
                        </span>

                      </div>

                      <div className="application-details">

                        <div>
                          <span>
                            Owner
                          </span>

                          <strong>
                            {application.ownerName ||
                              "Not provided"}
                          </strong>
                        </div>

                        <div>
                          <span>
                            Email
                          </span>

                          <strong>
                            {application.email ||
                              "Not provided"}
                          </strong>
                        </div>

                        <div>
                          <span>
                            Phone
                          </span>

                          <strong>
                            {application.phone ||
                              "Not provided"}
                          </strong>
                        </div>

                        <div>
                          <span>
                            Licence Number
                          </span>

                          <strong>
                            {application.licenceNumber ||
                              "Not provided"}
                          </strong>
                        </div>

                        <div>
                          <span>
                            City
                          </span>

                          <strong>
                            {application.city ||
                              "Not provided"}
                          </strong>
                        </div>

                        <div>
                          <span>
                            State
                          </span>

                          <strong>
                            {application.state ||
                              "Not provided"}
                          </strong>
                        </div>

                        <div className="application-address">

                          <span>
                            Address
                          </span>

                          <strong>
                            {application.address ||
                              "Not provided"}
                          </strong>

                        </div>

                      </div>

                      <div className="application-document">

                        <div>

                          <span>
                            Licence Document
                          </span>

                          <strong>
                            {application.licenceFileName ||
                              "Document not available"}
                          </strong>

                        </div>

                        {application.licenceFileUrl && (
                          <a
                            href={
                              application.licenceFileUrl
                            }
                            target="_blank"
                            rel="noreferrer"
                            className="application-document-btn"
                          >
                            View Licence
                          </a>
                        )}

                      </div>

                      <div className="application-actions">

                        {application.status !==
                          "approved" && (
                          <button
                            type="button"
                            className="application-approve-btn"
                            disabled={
                              processingId ===
                              application.id
                            }
                            onClick={() =>
                              updateApplicationStatus(
                                application,
                                "approved"
                              )
                            }
                          >
                            {processingId ===
                            application.id
                              ? "Processing..."
                              : "Approve"}
                          </button>
                        )}

                        {application.status !==
                          "rejected" && (
                          <button
                            type="button"
                            className="application-reject-btn"
                            disabled={
                              processingId ===
                              application.id
                            }
                            onClick={() =>
                              updateApplicationStatus(
                                application,
                                "rejected"
                              )
                            }
                          >
                            Reject
                          </button>
                        )}

                      </div>

                    </div>

                  )
                )}

              </div>
            )}

          </div>

        </div>

      </div>

    </div>
  );
}

export default PharmacyApplications;