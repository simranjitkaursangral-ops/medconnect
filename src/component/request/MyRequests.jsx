import { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  query,
  where
} from "firebase/firestore";
import { db } from "../../firebase/Firebase";
import { Link } from "react-router-dom";

function MyRequests() {
  const [requests, setRequests] = useState([]);
  const [filter, setFilter] = useState("All");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadRequests = async () => {
      try {
        const userId =
          localStorage.getItem("uid");

        if (!userId) {
          setError(
            "Please login to view your medicine requests."
          );
          setLoading(false);
          return;
        }

        const requestQuery = query(
          collection(db, "medicineRequests"),
          where("userId", "==", userId)
        );

        const snapshot =
          await getDocs(requestQuery);

        const data = snapshot.docs.map(
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

        setRequests(data);
      } catch (error) {
        console.error(
          "REQUEST LOAD ERROR:",
          error
        );

        setError(
          "Unable to load your medicine requests."
        );
      } finally {
        setLoading(false);
      }
    };

    loadRequests();
  }, []);

  const filteredRequests =
    filter === "All"
      ? requests
      : requests.filter(
          (request) =>
            request.status === filter
        );

  const pendingCount =
    requests.filter(
      (request) =>
        request.status === "Pending"
    ).length;

  const acceptedCount =
    requests.filter(
      (request) =>
        request.status === "Accepted"
    ).length;

  const completedCount =
    requests.filter(
      (request) =>
        request.status === "Completed"
    ).length;

  const rejectedCount =
    requests.filter(
      (request) =>
        request.status === "Rejected"
    ).length;

  const formatDate = (timestamp) => {
    if (!timestamp?.toDate) {
      return "Recently";
    }

    return timestamp
      .toDate()
      .toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric"
      });
  };

  const formatTime = (timestamp) => {
    if (!timestamp?.toDate) {
      return "";
    }

    return timestamp
      .toDate()
      .toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit"
      });
  };

  const getStatusClass = (status) => {
    if (status === "Accepted") {
      return "request-status available";
    }

    if (status === "Completed") {
      return "request-status completed";
    }

    if (status === "Rejected") {
      return "request-status rejected";
    }

    return "request-status pending";
  };

  const getTimelineStatus = (status) => {
    return {
      requested: true,
      accepted:
        status === "Accepted" ||
        status === "Completed",
      completed:
        status === "Completed"
    };
  };

  return (
    <div className="my-requests-page">

      <div className="my-requests-container">

        <div className="my-requests-header">

          <div>
            <span className="results-label">
              MY MEDICINE REQUESTS
            </span>

            <h1>
              Track Your Requests
            </h1>

            <p>
              Follow the status of medicine
              requests sent to pharmacies.
            </p>
          </div>

          <Link
            to="/search"
            className="new-request-btn"
          >
            + New Request
          </Link>

        </div>

        <div className="request-summary-grid">

          <div
            className={
              filter === "All"
                ? "request-summary-card active"
                : "request-summary-card"
            }
            onClick={() =>
              setFilter("All")
            }
          >
            <div className="request-summary-icon">
              📋
            </div>

            <div>
              <span>
                Total Requests
              </span>

              <strong>
                {requests.length}
              </strong>
            </div>
          </div>

          <div
            className={
              filter === "Pending"
                ? "request-summary-card active"
                : "request-summary-card"
            }
            onClick={() =>
              setFilter("Pending")
            }
          >
            <div className="request-summary-icon">
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

          <div
            className={
              filter === "Accepted"
                ? "request-summary-card active"
                : "request-summary-card"
            }
            onClick={() =>
              setFilter("Accepted")
            }
          >
            <div className="request-summary-icon">
              ✓
            </div>

            <div>
              <span>
                Accepted
              </span>

              <strong>
                {acceptedCount}
              </strong>
            </div>
          </div>

          <div
            className={
              filter === "Completed"
                ? "request-summary-card active"
                : "request-summary-card"
            }
            onClick={() =>
              setFilter("Completed")
            }
          >
            <div className="request-summary-icon">
              ✓
            </div>

            <div>
              <span>
                Completed
              </span>

              <strong>
                {completedCount}
              </strong>
            </div>
          </div>

          <div
            className={
              filter === "Rejected"
                ? "request-summary-card active"
                : "request-summary-card"
            }
            onClick={() =>
              setFilter("Rejected")
            }
          >
            <div className="request-summary-icon">
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

        <div className="request-filter-bar">

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
                  ? "request-filter active"
                  : "request-filter"
              }
              onClick={() =>
                setFilter(item)
              }
            >
              {item}
            </button>

          ))}

        </div>

        {loading ? (

          <div className="requests-loading">

            <div className="loading-spinner"></div>

            <h3>
              Loading your requests...
            </h3>

          </div>

        ) : error ? (

          <div className="requests-error">

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

        ) : filteredRequests.length === 0 ? (

          <div className="requests-empty">

            <div className="requests-empty-icon">
              💊
            </div>

            <h2>
              {filter === "All"
                ? "No medicine requests yet"
                : `No ${filter.toLowerCase()} requests`}
            </h2>

            <p>
              Search for a medicine and send
              a request to a nearby pharmacy.
            </p>

            <Link
              to="/search"
              className="empty-search-btn"
            >
              Find Medicine
            </Link>

          </div>

        ) : (

          <div className="requests-list">

            {filteredRequests.map(
              (request) => {

                const status =
                  request.status ||
                  "Pending";

                const timeline =
                  getTimelineStatus(
                    status
                  );

                return (

                  <div
                    className="user-request-card"
                    key={request.id}
                  >

                    <div className="user-request-top">

                      <div className="user-request-medicine">

                        <div className="user-request-icon">
                          💊
                        </div>

                        <div>

                          <h2>
                            {request.medicineName ||
                              "Medicine Request"}
                          </h2>

                          <p>
                            {request.dosage ||
                              "Dosage not specified"}
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

                    <div className="user-request-info">

                      <div>
                        <span>
                          Pharmacy
                        </span>

                        <strong>
                          {request.pharmacyName ||
                            "Pharmacy"}
                        </strong>
                      </div>

                      <div>
                        <span>
                          Quantity
                        </span>

                        <strong>
                          {request.quantity || 1}
                        </strong>
                      </div>

                      <div>
                        <span>
                          Requested On
                        </span>

                        <strong>
                          {formatDate(
                            request.createdAt
                          )}
                        </strong>
                      </div>

                      <div>
                        <span>
                          Time
                        </span>

                        <strong>
                          {formatTime(
                            request.createdAt
                          )}
                        </strong>
                      </div>

                    </div>

                    <div className="request-timeline">

                      <div
                        className={
                          timeline.requested
                            ? "timeline-step active"
                            : "timeline-step"
                        }
                      >

                        <div className="timeline-dot">
                          ✓
                        </div>

                        <span>
                          Requested
                        </span>

                      </div>

                      <div
                        className={
                          timeline.accepted
                            ? "timeline-line active"
                            : "timeline-line"
                        }
                      ></div>

                      <div
                        className={
                          timeline.accepted
                            ? "timeline-step active"
                            : "timeline-step"
                        }
                      >

                        <div className="timeline-dot">

                          {timeline.accepted
                            ? "✓"
                            : "2"}

                        </div>

                        <span>
                          Accepted
                        </span>

                      </div>

                      <div
                        className={
                          timeline.completed
                            ? "timeline-line active"
                            : "timeline-line"
                        }
                      ></div>

                      <div
                        className={
                          timeline.completed
                            ? "timeline-step active"
                            : "timeline-step"
                        }
                      >

                        <div className="timeline-dot">

                          {timeline.completed
                            ? "✓"
                            : "3"}

                        </div>

                        <span>
                          Completed
                        </span>

                      </div>

                    </div>

                    {(request.location ||
                      request.message) && (

                      <div className="request-extra-info">

                        {request.location && (

                          <div>

                            <span>
                              📍 Location
                            </span>

                            <p>
                              {request.location}
                            </p>

                          </div>

                        )}

                        {request.message && (

                          <div>

                            <span>
                              💬 Message
                            </span>

                            <p>
                              {request.message}
                            </p>

                          </div>

                        )}

                      </div>

                    )}

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

export default MyRequests;