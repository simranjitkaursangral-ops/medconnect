import { useEffect, useState } from "react";
import {
  collection,
  doc,
  getDocs,
  updateDoc
} from "firebase/firestore";
import { db } from "../../firebase/Firebase";
import { Link } from "react-router-dom";

function Pharmacies() {
  const [pharmacies, setPharmacies] = useState([]);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState("");
  const [error, setError] = useState("");

  const loadPharmacies = async () => {
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

      setPharmacies(data);
    } catch (err) {
      console.error(
        "LOAD PHARMACIES ERROR:",
        err
      );

      setError(
        err.message ||
        "Unable to load pharmacies."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPharmacies();
  }, []);

  const changePharmacyStatus = async (
    pharmacy,
    status
  ) => {
    try {
      setProcessingId(pharmacy.id);
      setError("");

      await updateDoc(
        doc(
          db,
          "pharmacies",
          pharmacy.id
        ),
        {
          status
        }
      );

      if (pharmacy.ownerId) {
        await updateDoc(
          doc(
            db,
            "users",
            pharmacy.ownerId
          ),
          {
            status
          }
        );
      }

      setPharmacies((previous) =>
        previous.map((item) =>
          item.id === pharmacy.id
            ? {
                ...item,
                status
              }
            : item
        )
      );

    } catch (err) {
      console.error(
        "UPDATE PHARMACY STATUS ERROR:",
        err
      );

      setError(
        err.message ||
        "Unable to update pharmacy status."
      );
    } finally {
      setProcessingId("");
    }
  };

  const handleApprove = async (pharmacy) => {
    const confirmed = window.confirm(
      `Are you sure you want to approve ${pharmacy.name}?`
    );

    if (!confirmed) {
      return;
    }

    await changePharmacyStatus(
      pharmacy,
      "approved"
    );
  };

  const handleReject = async (pharmacy) => {
    const confirmed = window.confirm(
      `Are you sure you want to reject ${pharmacy.name}?`
    );

    if (!confirmed) {
      return;
    }

    await changePharmacyStatus(
      pharmacy,
      "rejected"
    );
  };

  const handleSuspend = async (pharmacy) => {
    const confirmed = window.confirm(
      `Are you sure you want to suspend ${pharmacy.name}? The pharmacy will lose access to its account.`
    );

    if (!confirmed) {
      return;
    }

    await changePharmacyStatus(
      pharmacy,
      "suspended"
    );
  };

  const handleReactivate = async (pharmacy) => {
    const confirmed = window.confirm(
      `Are you sure you want to reactivate ${pharmacy.name}?`
    );

    if (!confirmed) {
      return;
    }

    await changePharmacyStatus(
      pharmacy,
      "approved"
    );
  };

  const filteredPharmacies =
    pharmacies.filter((pharmacy) => {

      const matchesFilter =
        filter === "all" ||
        pharmacy.status === filter;

      const searchValue =
        search.trim().toLowerCase();

      const matchesSearch =
        !searchValue ||
        (
          pharmacy.name || ""
        )
          .toLowerCase()
          .includes(searchValue) ||
        (
          pharmacy.ownerName || ""
        )
          .toLowerCase()
          .includes(searchValue) ||
        (
          pharmacy.email || ""
        )
          .toLowerCase()
          .includes(searchValue) ||
        (
          pharmacy.phone || ""
        )
          .toLowerCase()
          .includes(searchValue) ||
        (
          pharmacy.licenceNumber || ""
        )
          .toLowerCase()
          .includes(searchValue);

      return (
        matchesFilter &&
        matchesSearch
      );
    });

  const totalCount =
    pharmacies.length;

  const pendingCount =
    pharmacies.filter(
      (item) =>
        item.status === "pending"
    ).length;

  const approvedCount =
    pharmacies.filter(
      (item) =>
        item.status === "approved"
    ).length;

  const suspendedCount =
    pharmacies.filter(
      (item) =>
        item.status === "suspended"
    ).length;

  const rejectedCount =
    pharmacies.filter(
      (item) =>
        item.status === "rejected"
    ).length;

  if (loading) {
    return (
      <div className="admin-loading">

        <div className="loading-spinner"></div>

        <h3>
          Loading pharmacies...
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
              PLATFORM MANAGEMENT
            </span>

            <h1>
              Pharmacy Management
            </h1>

            <p>
              Monitor registered pharmacies
              and manage their platform
              access and status.
            </p>

          </div>

          <Link
            to="/admin-dashboard"
            className="admin-dashboard-action"
          >
            Dashboard
          </Link>

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
                Total Pharmacies
              </span>

              <strong>
                {totalCount}
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
              ⚠️
            </div>

            <div>
              <span>
                Suspended
              </span>

              <strong>
                {suspendedCount}
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
                  Review and manage pharmacy
                  partners on the MedConnect
                  platform.
                </p>

              </div>

            </div>

            <div className="admin-user-toolbar">

              <div className="admin-user-search">

                <input
                  type="text"
                  placeholder="Search pharmacy, owner, email, phone or licence..."
                  value={search}
                  onChange={(e) =>
                    setSearch(e.target.value)
                  }
                />

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
                All ({totalCount})
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
                Pending ({pendingCount})
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
                Approved ({approvedCount})
              </button>

              <button
                type="button"
                className={
                  filter === "suspended"
                    ? "application-filter active"
                    : "application-filter"
                }
                onClick={() =>
                  setFilter("suspended")
                }
              >
                Suspended ({suspendedCount})
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
                Rejected ({rejectedCount})
              </button>

            </div>

            {filteredPharmacies.length === 0 ? (

              <div className="application-empty">

                <div>
                  🏥
                </div>

                <h3>
                  No pharmacies found
                </h3>

                <p>
                  Try changing the search
                  or selected filter.
                </p>

              </div>

            ) : (

              <div className="application-list">

                {filteredPharmacies.map(
                  (pharmacy) => (

                    <div
                      className="application-card"
                      key={pharmacy.id}
                    >

                      <div className="application-card-header">

                        <div>

                          <span className="application-label">
                            PHARMACY PARTNER
                          </span>

                          <h3>
                            {pharmacy.name ||
                              "Unnamed Pharmacy"}
                          </h3>

                        </div>

                        <span
                          className={`application-status ${
                            pharmacy.status ||
                            "pending"
                          }`}
                        >
                          {pharmacy.status ||
                            "pending"}
                        </span>

                      </div>

                      <div className="application-details">

                        <div>

                          <span>
                            Owner
                          </span>

                          <strong>
                            {pharmacy.ownerName ||
                              "Not provided"}
                          </strong>

                        </div>

                        <div>

                          <span>
                            Email
                          </span>

                          <strong>
                            {pharmacy.email ||
                              "Not provided"}
                          </strong>

                        </div>

                        <div>

                          <span>
                            Phone
                          </span>

                          <strong>
                            {pharmacy.phone ||
                              "Not provided"}
                          </strong>

                        </div>

                        <div>

                          <span>
                            Licence Number
                          </span>

                          <strong>
                            {pharmacy.licenceNumber ||
                              "Not provided"}
                          </strong>

                        </div>

                        <div>

                          <span>
                            City
                          </span>

                          <strong>
                            {pharmacy.city ||
                              "Not provided"}
                          </strong>

                        </div>

                        <div>

                          <span>
                            State
                          </span>

                          <strong>
                            {pharmacy.state ||
                              "Not provided"}
                          </strong>

                        </div>

                        <div className="application-address">

                          <span>
                            Address
                          </span>

                          <strong>
                            {pharmacy.address ||
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
                            {pharmacy.licenceFileName ||
                              "Not available"}
                          </strong>

                        </div>

                        {pharmacy.licenceFileUrl && (
                          <a
                            href={
                              pharmacy.licenceFileUrl
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

                        {pharmacy.status ===
                          "pending" && (
                          <>
                            <button
                              type="button"
                              className="application-approve-btn"
                              disabled={
                                processingId ===
                                pharmacy.id
                              }
                              onClick={() =>
                                handleApprove(
                                  pharmacy
                                )
                              }
                            >
                              {processingId ===
                              pharmacy.id
                                ? "Processing..."
                                : "Approve"}
                            </button>

                            <button
                              type="button"
                              className="application-reject-btn"
                              disabled={
                                processingId ===
                                pharmacy.id
                              }
                              onClick={() =>
                                handleReject(
                                  pharmacy
                                )
                              }
                            >
                              {processingId ===
                              pharmacy.id
                                ? "Processing..."
                                : "Reject"}
                            </button>
                          </>
                        )}

                        {pharmacy.status ===
                          "approved" && (
                          <button
                            type="button"
                            className="application-reject-btn"
                            disabled={
                              processingId ===
                              pharmacy.id
                            }
                            onClick={() =>
                              handleSuspend(
                                pharmacy
                              )
                            }
                          >
                            {processingId ===
                            pharmacy.id
                              ? "Processing..."
                              : "Suspend"}
                          </button>
                        )}

                        {pharmacy.status ===
                          "suspended" && (
                          <button
                            type="button"
                            className="application-approve-btn"
                            disabled={
                              processingId ===
                              pharmacy.id
                            }
                            onClick={() =>
                              handleReactivate(
                                pharmacy
                              )
                            }
                          >
                            {processingId ===
                            pharmacy.id
                              ? "Processing..."
                              : "Reactivate"}
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

export default Pharmacies;