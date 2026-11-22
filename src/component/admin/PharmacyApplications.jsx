import { useEffect, useState } from "react";

import {
  collection,
  doc,
  getDocs,
  writeBatch,
  serverTimestamp
} from "firebase/firestore";

import { db } from "../../firebase/Firebase";

function PharmacyApplications() {
  const [applications, setApplications] = useState([]);
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState("");
  const [error, setError] = useState("");

  // LOAD PHARMACY APPLICATIONS

  const loadApplications = async () => {
    try {
      setLoading(true);
      setError("");

      const snapshot = await getDocs(
        collection(db, "pharmacies")
      );

      const data = snapshot.docs.map((item) => ({
        id: item.id,
        ...item.data()
      }));

      data.sort((a, b) => {
        const aTime = a.createdAt?.seconds || 0;
        const bTime = b.createdAt?.seconds || 0;

        return bTime - aTime;
      });

      setApplications(data);

    } catch (err) {
      console.error("LOAD APPLICATIONS ERROR:", err);

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

  // APPROVE OR REJECT APPLICATION

  const updateApplicationStatus = async (
    application,
    status
  ) => {
    if (
      status !== "approved" &&
      status !== "rejected"
    ) {
      return;
    }

    if (!application.ownerId) {
      setError(
        "Owner information is missing for this pharmacy."
      );
      return;
    }

    try {
      setProcessingId(application.id);
      setError("");

      const batch = writeBatch(db);

      // PHARMACY DOCUMENT

      const pharmacyRef = doc(
        db,
        "pharmacies",
        application.id
      );

      batch.update(pharmacyRef, {
        status,
        updatedAt: serverTimestamp()
      });

      // OWNER USER DOCUMENT

      const userRef = doc(
        db,
        "users",
        application.ownerId
      );

      batch.update(userRef, {
        status,
        updatedAt: serverTimestamp()
      });

      // COMMIT BOTH UPDATES TOGETHER

      await batch.commit();

      // UPDATE LOCAL STATE

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
      console.error(
        "UPDATE APPLICATION ERROR:",
        err
      );

      setError(
        err.message ||
        "Unable to update application."
      );

    } finally {
      setProcessingId("");
    }
  };

  // FILTER APPLICATIONS

  const filteredApplications = applications.filter(
    (application) => {
      if (filter === "all") return true;

      return application.status === filter;
    }
  );

  // STATISTICS

  const pendingCount = applications.filter(
    (item) => item.status === "pending"
  ).length;

  const approvedCount = applications.filter(
    (item) => item.status === "approved"
  ).length;

  const rejectedCount = applications.filter(
    (item) => item.status === "rejected"
  ).length;

  // LOADING

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

        {/* PAGE HEADER */}

        <div className="admin-hero">

          <div className="admin-hero-content">

            <span className="section-badge">
              PHARMACY PARTNERS
            </span>

            <h1>
              Pharmacy Applications
            </h1>

            <p>
              Review pharmacy partner applications
              and verify their submitted information
              before approval.
            </p>

          </div>

        </div>

        {/* ERROR MESSAGE */}

        {error && (
          <div className="form-error">
            {error}
          </div>
        )}

        {/* APPLICATION STATISTICS */}

        <div className="admin-dashboard-stats">

          <div className="admin-stat-card">

            <div className="admin-stat-icon">
              🏥
            </div>

            <div>
              <span>Total Applications</span>
              <strong>{applications.length}</strong>
            </div>

          </div>

          <div className="admin-stat-card">

            <div className="admin-stat-icon">
              ⏳
            </div>

            <div>
              <span>Pending</span>
              <strong>{pendingCount}</strong>
            </div>

          </div>

          <div className="admin-stat-card">

            <div className="admin-stat-icon">
              ✓
            </div>

            <div>
              <span>Approved</span>
              <strong>{approvedCount}</strong>
            </div>

          </div>

          <div className="admin-stat-card">

            <div className="admin-stat-icon">
              ✕
            </div>

            <div>
              <span>Rejected</span>
              <strong>{rejectedCount}</strong>
            </div>

          </div>

        </div>

        {/* APPLICATION LIST */}

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
                  Review submitted pharmacy details
                  and licence numbers.
                </p>
              </div>

            </div>

            {/* FILTER BUTTONS */}

            <div className="application-filters">

              {[
                "all",
                "pending",
                "approved",
                "rejected"
              ].map((item) => (

                <button
                  key={item}
                  type="button"
                  className={
                    filter === item
                      ? "application-filter active"
                      : "application-filter"
                  }
                  onClick={() => setFilter(item)}
                >
                  {item.charAt(0).toUpperCase() +
                    item.slice(1)}
                </button>

              ))}

            </div>

            {/* EMPTY STATE */}

            {filteredApplications.length === 0 ? (

              <div className="application-empty">

                <div>🏥</div>

                <h3>
                  No applications found
                </h3>

                <p>
                  There are no pharmacy applications
                  in this category.
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

                      {/* CARD HEADER */}

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
                          className={`application-status ${
                            application.status || "pending"
                          }`}
                        >
                          {application.status || "pending"}
                        </span>

                      </div>

                      {/* PHARMACY DETAILS */}

                      <div className="application-details">

                        <div>
                          <span>Owner</span>

                          <strong>
                            {application.ownerName ||
                              "Not provided"}
                          </strong>
                        </div>

                        <div>
                          <span>Email</span>

                          <strong>
                            {application.email ||
                              "Not provided"}
                          </strong>
                        </div>

                        <div>
                          <span>Phone</span>

                          <strong>
                            {application.phone ||
                              "Not provided"}
                          </strong>
                        </div>

                        <div>
                          <span>Licence Number</span>

                          <strong>
                            {application.licenceNumber ||
                              "Not provided"}
                          </strong>
                        </div>

                        <div>
                          <span>City</span>

                          <strong>
                            {application.city ||
                              "Not provided"}
                          </strong>
                        </div>

                        <div>
                          <span>State</span>

                          <strong>
                            {application.state ||
                              "Not provided"}
                          </strong>
                        </div>

                        <div className="application-address">

                          <span>Address</span>

                          <strong>
                            {application.address ||
                              "Not provided"}
                          </strong>

                        </div>

                      </div>

                      {/* LICENCE INFORMATION */}

                      <div className="application-document">

                        <div>

                          <span>
                            Pharmacy Licence Information
                          </span>

                          <strong>
                            {application.licenceNumber
                              ? "Licence number submitted"
                              : "Licence number not provided"}
                          </strong>

                        </div>

                      </div>

                      {/* ACTION BUTTONS */}

                      <div className="application-actions">

                        {application.status !== "approved" && (

                          <button
                            type="button"
                            className="application-approve-btn"
                            disabled={
                              processingId === application.id
                            }
                            onClick={() =>
                              updateApplicationStatus(
                                application,
                                "approved"
                              )
                            }
                          >
                            {processingId === application.id
                              ? "Processing..."
                              : "Approve"}
                          </button>

                        )}

                        {application.status !== "rejected" && (

                          <button
                            type="button"
                            className="application-reject-btn"
                            disabled={
                              processingId === application.id
                            }
                            onClick={() =>
                              updateApplicationStatus(
                                application,
                                "rejected"
                              )
                            }
                          >
                            {processingId === application.id
                              ? "Processing..."
                              : "Reject"}
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