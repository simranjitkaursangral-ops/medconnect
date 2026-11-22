import { useEffect, useState } from "react";

import {
  collection,
  doc,
  getDocs,
  writeBatch,
  serverTimestamp
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

  // LOAD PHARMACIES

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
      console.error("LOAD PHARMACIES ERROR:", err);

      setError(
        err.message || "Unable to load pharmacies."
      );

    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPharmacies();
  }, []);

  // CHANGE PHARMACY STATUS

  const changePharmacyStatus = async (
    pharmacy,
    status
  ) => {
    if (!pharmacy.ownerId) {
      setError(
        "Owner information is missing for this pharmacy."
      );
      return;
    }

    try {
      setProcessingId(pharmacy.id);
      setError("");

      const batch = writeBatch(db);

      // PHARMACY DOCUMENT

      const pharmacyRef = doc(
        db,
        "pharmacies",
        pharmacy.id
      );

      batch.update(pharmacyRef, {
        status,
        updatedAt: serverTimestamp()
      });

      // OWNER USER DOCUMENT

      const userRef = doc(
        db,
        "users",
        pharmacy.ownerId
      );

      batch.update(userRef, {
        status,
        updatedAt: serverTimestamp()
      });

      // UPDATE BOTH DOCUMENTS TOGETHER

      await batch.commit();

      // UPDATE LOCAL STATE

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

  // APPROVE

  const handleApprove = async (pharmacy) => {
    const confirmed = window.confirm(
      `Are you sure you want to approve ${pharmacy.name}?`
    );

    if (!confirmed) return;

    await changePharmacyStatus(
      pharmacy,
      "approved"
    );
  };

  // REJECT

  const handleReject = async (pharmacy) => {
    const confirmed = window.confirm(
      `Are you sure you want to reject ${pharmacy.name}?`
    );

    if (!confirmed) return;

    await changePharmacyStatus(
      pharmacy,
      "rejected"
    );
  };

  // SUSPEND

  const handleSuspend = async (pharmacy) => {
    const confirmed = window.confirm(
      `Are you sure you want to suspend ${pharmacy.name}? The pharmacy will lose access to its account.`
    );

    if (!confirmed) return;

    await changePharmacyStatus(
      pharmacy,
      "suspended"
    );
  };

  // REACTIVATE

  const handleReactivate = async (pharmacy) => {
    const confirmed = window.confirm(
      `Are you sure you want to reactivate ${pharmacy.name}?`
    );

    if (!confirmed) return;

    await changePharmacyStatus(
      pharmacy,
      "approved"
    );
  };

  // SEARCH AND FILTER

  const filteredPharmacies = pharmacies.filter(
    (pharmacy) => {
      const matchesFilter =
        filter === "all" ||
        pharmacy.status === filter;

      const searchValue =
        search.trim().toLowerCase();

      const matchesSearch =
        !searchValue ||
        (pharmacy.name || "")
          .toLowerCase()
          .includes(searchValue) ||
        (pharmacy.ownerName || "")
          .toLowerCase()
          .includes(searchValue) ||
        (pharmacy.email || "")
          .toLowerCase()
          .includes(searchValue) ||
        (pharmacy.phone || "")
          .toLowerCase()
          .includes(searchValue) ||
        (pharmacy.licenceNumber || "")
          .toLowerCase()
          .includes(searchValue);

      return matchesFilter && matchesSearch;
    }
  );

  // STATISTICS

  const totalCount = pharmacies.length;

  const pendingCount = pharmacies.filter(
    (item) => item.status === "pending"
  ).length;

  const approvedCount = pharmacies.filter(
    (item) => item.status === "approved"
  ).length;

  const suspendedCount = pharmacies.filter(
    (item) => item.status === "suspended"
  ).length;

  const rejectedCount = pharmacies.filter(
    (item) => item.status === "rejected"
  ).length;

  // LOADING

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

        {/* HEADER */}

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

        {/* ERROR */}

        {error && (
          <div className="form-error">
            {error}
          </div>
        )}

        {/* STATISTICS */}

        <div className="admin-dashboard-stats">

          <div className="admin-stat-card">
            <div className="admin-stat-icon">🏥</div>

            <div>
              <span>Total Pharmacies</span>
              <strong>{totalCount}</strong>
            </div>
          </div>

          <div className="admin-stat-card">
            <div className="admin-stat-icon">⏳</div>

            <div>
              <span>Pending</span>
              <strong>{pendingCount}</strong>
            </div>
          </div>

          <div className="admin-stat-card">
            <div className="admin-stat-icon">✓</div>

            <div>
              <span>Approved</span>
              <strong>{approvedCount}</strong>
            </div>
          </div>

          <div className="admin-stat-card">
            <div className="admin-stat-icon">⚠️</div>

            <div>
              <span>Suspended</span>
              <strong>{suspendedCount}</strong>
            </div>
          </div>

          <div className="admin-stat-card">
            <div className="admin-stat-icon">✕</div>

            <div>
              <span>Rejected</span>
              <strong>{rejectedCount}</strong>
            </div>
          </div>

        </div>

        {/* PHARMACY MANAGEMENT */}

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

            {/* SEARCH */}

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

            {/* FILTERS */}

            <div className="application-filters">

              {[
                { value: "all", label: "All", count: totalCount },
                { value: "pending", label: "Pending", count: pendingCount },
                { value: "approved", label: "Approved", count: approvedCount },
                { value: "suspended", label: "Suspended", count: suspendedCount },
                { value: "rejected", label: "Rejected", count: rejectedCount }
              ].map((item) => (

                <button
                  key={item.value}
                  type="button"
                  className={
                    filter === item.value
                      ? "application-filter active"
                      : "application-filter"
                  }
                  onClick={() => setFilter(item.value)}
                >
                  {item.label} ({item.count})
                </button>

              ))}

            </div>

            {/* EMPTY STATE */}

            {filteredPharmacies.length === 0 ? (

              <div className="application-empty">

                <div>🏥</div>

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

                {filteredPharmacies.map((pharmacy) => (

                  <div
                    className="application-card"
                    key={pharmacy.id}
                  >

                    {/* CARD HEADER */}

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
                          pharmacy.status || "pending"
                        }`}
                      >
                        {pharmacy.status || "pending"}
                      </span>

                    </div>

                    {/* PHARMACY DETAILS */}

                    <div className="application-details">

                      <div>
                        <span>Owner</span>

                        <strong>
                          {pharmacy.ownerName ||
                            "Not provided"}
                        </strong>
                      </div>

                      <div>
                        <span>Email</span>

                        <strong>
                          {pharmacy.email ||
                            "Not provided"}
                        </strong>
                      </div>

                      <div>
                        <span>Phone</span>

                        <strong>
                          {pharmacy.phone ||
                            "Not provided"}
                        </strong>
                      </div>

                      <div>
                        <span>Licence Number</span>

                        <strong>
                          {pharmacy.licenceNumber ||
                            "Not provided"}
                        </strong>
                      </div>

                      <div>
                        <span>City</span>

                        <strong>
                          {pharmacy.city ||
                            "Not provided"}
                        </strong>
                      </div>

                      <div>
                        <span>State</span>

                        <strong>
                          {pharmacy.state ||
                            "Not provided"}
                        </strong>
                      </div>

                      <div className="application-address">
                        <span>Address</span>

                        <strong>
                          {pharmacy.address ||
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
                          {pharmacy.licenceNumber
                            ? "Licence number submitted"
                            : "Licence number not provided"}
                        </strong>

                      </div>

                    </div>

                    {/* ACTION BUTTONS */}

                    <div className="application-actions">

                      {pharmacy.status === "pending" && (
                        <>

                          <button
                            type="button"
                            className="application-approve-btn"
                            disabled={
                              processingId === pharmacy.id
                            }
                            onClick={() =>
                              handleApprove(pharmacy)
                            }
                          >
                            {processingId === pharmacy.id
                              ? "Processing..."
                              : "Approve"}
                          </button>

                          <button
                            type="button"
                            className="application-reject-btn"
                            disabled={
                              processingId === pharmacy.id
                            }
                            onClick={() =>
                              handleReject(pharmacy)
                            }
                          >
                            {processingId === pharmacy.id
                              ? "Processing..."
                              : "Reject"}
                          </button>

                        </>
                      )}

                      {pharmacy.status === "approved" && (

                        <button
                          type="button"
                          className="application-reject-btn"
                          disabled={
                            processingId === pharmacy.id
                          }
                          onClick={() =>
                            handleSuspend(pharmacy)
                          }
                        >
                          {processingId === pharmacy.id
                            ? "Processing..."
                            : "Suspend"}
                        </button>

                      )}

                      {pharmacy.status === "suspended" && (

                        <button
                          type="button"
                          className="application-approve-btn"
                          disabled={
                            processingId === pharmacy.id
                          }
                          onClick={() =>
                            handleReactivate(pharmacy)
                          }
                        >
                          {processingId === pharmacy.id
                            ? "Processing..."
                            : "Reactivate"}
                        </button>

                      )}

                    </div>

                  </div>

                ))}

              </div>

            )}

          </div>

        </div>

      </div>

    </div>
  );
}

export default Pharmacies;