import { useEffect, useState } from "react";
import {
  collection,
  doc,
  getDocs,
  updateDoc
} from "firebase/firestore";
import { db } from "../../firebase/Firebase";
import { Link } from "react-router-dom";

function Users() {
  const [users, setUsers] = useState([]);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState("");
  const [error, setError] = useState("");

  const loadUsers = async () => {
    try {
      setLoading(true);
      setError("");

      const snapshot = await getDocs(
        collection(db, "users")
      );

      const data = snapshot.docs
        .map((item) => ({
          id: item.id,
          ...item.data()
        }))
        .filter(
          (user) => user.role === "user"
        );

      data.sort((a, b) => {
        const aTime =
          a.createdAt?.seconds || 0;

        const bTime =
          b.createdAt?.seconds || 0;

        return bTime - aTime;
      });

      setUsers(data);
    } catch (err) {
      console.error(err);

      setError(
        err.message ||
          "Unable to load users."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const changeUserStatus = async (
    user,
    status
  ) => {
    try {
      setProcessingId(user.id);
      setError("");

      const userRef = doc(
        db,
        "users",
        user.id
      );

      await updateDoc(userRef, {
        status
      });

      setUsers((previous) =>
        previous.map((item) =>
          item.id === user.id
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
          "Unable to update user status."
      );
    } finally {
      setProcessingId("");
    }
  };

  const filteredUsers = users.filter(
    (user) => {
      const matchesFilter =
        filter === "all" ||
        user.status === filter;

      const searchText =
        search.toLowerCase().trim();

      const matchesSearch =
        !searchText ||
        user.name
          ?.toLowerCase()
          .includes(searchText) ||
        user.email
          ?.toLowerCase()
          .includes(searchText) ||
        user.phone
          ?.toLowerCase()
          .includes(searchText);

      return (
        matchesFilter &&
        matchesSearch
      );
    }
  );

  const activeCount = users.filter(
    (user) =>
      user.status !== "blocked"
  ).length;

  const blockedCount = users.filter(
    (user) =>
      user.status === "blocked"
  ).length;

  if (loading) {
    return (
      <div className="admin-loading">
        <div className="loading-spinner"></div>

        <h3>
          Loading users...
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
              USER MANAGEMENT
            </span>

            <h1>
              Customer Management
            </h1>

            <p>
              Monitor customer accounts and
              manage platform access when
              necessary.
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
              👥
            </div>

            <div>
              <span>
                Total Customers
              </span>

              <strong>
                {users.length}
              </strong>
            </div>

          </div>

          <div className="admin-stat-card">

            <div className="admin-stat-icon">
              ✓
            </div>

            <div>
              <span>
                Active Customers
              </span>

              <strong>
                {activeCount}
              </strong>
            </div>

          </div>

          <div className="admin-stat-card">

            <div className="admin-stat-icon">
              🚫
            </div>

            <div>
              <span>
                Blocked Customers
              </span>

              <strong>
                {blockedCount}
              </strong>
            </div>

          </div>

        </div>

        <div className="admin-form-container">

          <div className="admin-form-card">

            <div className="admin-form-header">

              <div className="admin-form-icon">
                👥
              </div>

              <div>

                <h2>
                  Registered Customers
                </h2>

                <p>
                  View customer accounts
                  registered on MedConnect.
                </p>

              </div>

            </div>

            <div className="admin-user-toolbar">

              <input
                type="text"
                value={search}
                placeholder="Search by name, email or phone..."
                onChange={(e) =>
                  setSearch(e.target.value)
                }
                className="admin-user-search"
              />

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
                  filter === "active"
                    ? "application-filter active"
                    : "application-filter"
                }
                onClick={() =>
                  setFilter("active")
                }
              >
                Active
              </button>

              <button
                type="button"
                className={
                  filter === "blocked"
                    ? "application-filter active"
                    : "application-filter"
                }
                onClick={() =>
                  setFilter("blocked")
                }
              >
                Blocked
              </button>

            </div>

            {filteredUsers.length === 0 ? (
              <div className="application-empty">

                <div>
                  👥
                </div>

                <h3>
                  No customers found
                </h3>

                <p>
                  No customer accounts match
                  your current filters.
                </p>

              </div>
            ) : (
              <div className="application-list">

                {filteredUsers.map((user) => (

                  <div
                    className="application-card"
                    key={user.id}
                  >

                    <div className="application-card-header">

                      <div>

                        <span className="application-label">
                          CUSTOMER
                        </span>

                        <h3>
                          {user.name ||
                            "Unnamed User"}
                        </h3>

                      </div>

                      <span
                        className={
                          user.status ===
                          "blocked"
                            ? "application-status rejected"
                            : "application-status approved"
                        }
                      >
                        {user.status ===
                        "blocked"
                          ? "Blocked"
                          : "Active"}
                      </span>

                    </div>

                    <div className="application-details">

                      <div>
                        <span>
                          Email
                        </span>

                        <strong>
                          {user.email ||
                            "Not provided"}
                        </strong>
                      </div>

                      <div>
                        <span>
                          Phone
                        </span>

                        <strong>
                          {user.phone ||
                            "Not provided"}
                        </strong>
                      </div>

                      <div>
                        <span>
                          Account Type
                        </span>

                        <strong>
                          Customer
                        </strong>
                      </div>

                      <div>
                        <span>
                          User ID
                        </span>

                        <strong>
                          {user.id}
                        </strong>
                      </div>

                    </div>

                    <div className="application-actions">

                      {user.status ===
                      "blocked" ? (

                        <button
                          type="button"
                          className="application-approve-btn"
                          disabled={
                            processingId ===
                            user.id
                          }
                          onClick={() =>
                            changeUserStatus(
                              user,
                              "active"
                            )
                          }
                        >
                          {processingId ===
                          user.id
                            ? "Processing..."
                            : "Unblock User"}
                        </button>

                      ) : (

                        <button
                          type="button"
                          className="application-reject-btn"
                          disabled={
                            processingId ===
                            user.id
                          }
                          onClick={() =>
                            changeUserStatus(
                              user,
                              "blocked"
                            )
                          }
                        >
                          {processingId ===
                          user.id
                            ? "Processing..."
                            : "Block User"}
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

export default Users;