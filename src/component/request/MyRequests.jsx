import { useEffect, useState } from "react";

import {
  collection,
  query,
  where,
  doc,
  serverTimestamp,
  onSnapshot,
  writeBatch
} from "firebase/firestore";

import { db } from "../../firebase/Firebase";
import { Link } from "react-router-dom";

function MyRequests() {
  const [requests, setRequests] = useState([]);
  const [responses, setResponses] = useState([]);

  const [filter, setFilter] = useState("All");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selecting, setSelecting] = useState("");
  const [offerSort, setOfferSort] = useState("Recommended");

  useEffect(() => {
    const userId = localStorage.getItem("uid");

    if (!userId) {
      setError("Please login to view your medicine requests.");
      setLoading(false);
      return;
    }

    let requestsLoaded = false;
    let responsesLoaded = false;

    const checkLoading = () => {
      if (requestsLoaded && responsesLoaded) {
        setLoading(false);
      }
    };

    const requestQuery = query(
      collection(db, "medicineRequests"),
      where("userId", "==", userId)
    );

    const unsubscribeRequests = onSnapshot(
      requestQuery,
      (snapshot) => {
        const data = snapshot.docs.map((item) => ({
          id: item.id,
          ...item.data()
        }));

        data.sort((a, b) => {
          const dateA = a.createdAt?.toDate?.() || new Date(0);
          const dateB = b.createdAt?.toDate?.() || new Date(0);

          return dateB - dateA;
        });

        setRequests(data);

        requestsLoaded = true;
        checkLoading();
      },
      (err) => {
        console.error("REQUEST LISTENER ERROR:", err);
        setError("Unable to load your medicine requests.");
        setLoading(false);
      }
    );

    const responseQuery = query(
      collection(db, "pharmacyResponses"),
      where("userId", "==", userId)
    );

    const unsubscribeResponses = onSnapshot(
      responseQuery,
      (snapshot) => {
        const data = snapshot.docs.map((item) => ({
          id: item.id,
          ...item.data()
        }));

        setResponses(data);

        responsesLoaded = true;
        checkLoading();
      },
      (err) => {
        console.error("RESPONSE LISTENER ERROR:", err);
        setError("Unable to load pharmacy responses.");
        setLoading(false);
      }
    );

    return () => {
      unsubscribeRequests();
      unsubscribeResponses();
    };
  }, []);

  const requestsWithResponses = requests.map((request) => ({
    ...request,
    responses: responses.filter(
      (response) => response.requestId === request.id
    )
  }));

  const filteredRequests =
    filter === "All"
      ? requestsWithResponses
      : requestsWithResponses.filter(
          (request) => (request.status || "Pending") === filter
        );

  const pendingCount = requests.filter(
    (request) => (request.status || "Pending") === "Pending"
  ).length;

  const acceptedCount = requests.filter(
    (request) => request.status === "Accepted"
  ).length;

  const completedCount = requests.filter(
    (request) => request.status === "Completed"
  ).length;

  const rejectedCount = requests.filter(
    (request) => request.status === "Rejected"
  ).length;

  const formatDate = (timestamp) => {
    if (!timestamp?.toDate) {
      return "Recently";
    }

    return timestamp.toDate().toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric"
    });
  };

  const formatTime = (timestamp) => {
    if (!timestamp?.toDate) {
      return "";
    }

    return timestamp.toDate().toLocaleTimeString("en-IN", {
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

  const getTimelineStatus = (status) => ({
    requested: true,
    accepted: status === "Accepted" || status === "Completed",
    completed: status === "Completed"
  });

  const availableResponses = (items = []) =>
    items.filter(
      (item) =>
        item.availability === "Available" &&
        Number(item.availableQuantity) > 0
    );

  // Sort pharmacy offers for easier comparison.
  const sortPharmacyOffers = (items = []) => {
    const sorted = [...items];

    if (offerSort === "Lowest Price") {
      sorted.sort((a, b) => {
        return Number(a.price ?? Infinity) - Number(b.price ?? Infinity);
      });
    }

    if (offerSort === "Fastest Preparation") {
      sorted.sort((a, b) => {
        const timeA = parsePreparationTime(a.preparationTime);
        const timeB = parsePreparationTime(b.preparationTime);

        return timeA - timeB;
      });
    }

    if (offerSort === "Highest Quantity") {
      sorted.sort((a, b) => {
        return (
          Number(b.availableQuantity || 0) -
          Number(a.availableQuantity || 0)
        );
      });
    }

    if (offerSort === "Recommended") {
      sorted.sort((a, b) => {
        const priceA = Number(a.price ?? Infinity);
        const priceB = Number(b.price ?? Infinity);

        return priceA - priceB;
      });
    }

    return sorted;
  };

  const parsePreparationTime = (value) => {
    if (!value) {
      return Infinity;
    }

    const match = String(value).match(/\d+/);

    return match ? Number(match[0]) : Infinity;
  };

  // Select a pharmacy offer.
  const handleChoosePharmacy = async (request, response) => {
    try {
      const userId = localStorage.getItem("uid");

      if (!userId || request.userId !== userId) {
        alert("You are not authorized to select this offer.");
        return;
      }

      if (response.availability !== "Available") {
        alert("This pharmacy has marked the medicine unavailable.");
        return;
      }

      if (Number(response.availableQuantity) <= 0) {
        alert("This pharmacy has no available quantity.");
        return;
      }

      if (request.selectedPharmacyId) {
        alert("You have already selected a pharmacy.");
        return;
      }

      setSelecting(response.id);

      const batch = writeBatch(db);

      const requestRef = doc(
        db,
        "medicineRequests",
        request.id
      );

      const responseRef = doc(
        db,
        "pharmacyResponses",
        response.id
      );

      batch.update(requestRef, {
        selectedPharmacyId: response.pharmacyId,
        selectedPharmacyName: response.pharmacyName || "",
        selectedResponseId: response.id,
        selectedAt: serverTimestamp(),
        selectionStatus: "Selected",
        updatedAt: serverTimestamp()
      });

      batch.update(responseRef, {
        status: "Selected",
        selectedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      await batch.commit();

      alert(
        `${response.pharmacyName || "Pharmacy"} selected successfully!`
      );

    } catch (err) {
      console.error("PHARMACY SELECTION ERROR:", err);

      alert(
        "Unable to select this pharmacy. Please try again."
      );
    } finally {
      setSelecting("");
    }
  };

  return (
    <div className="my-requests-page">

      <div className="my-requests-container">

        <div className="my-requests-header">

          <div>
            <span className="results-label">
              MY MEDICINE REQUESTS
            </span>

            <h1>Track Your Requests</h1>

            <p>
              Compare pharmacy responses and find the right option
              for your medicine.
            </p>
          </div>

          <Link to="/search" className="new-request-btn">
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
            onClick={() => setFilter("All")}
          >
            <div className="request-summary-icon">📋</div>

            <div>
              <span>Total Requests</span>
              <strong>{requests.length}</strong>
            </div>
          </div>

          <div
            className={
              filter === "Pending"
                ? "request-summary-card active"
                : "request-summary-card"
            }
            onClick={() => setFilter("Pending")}
          >
            <div className="request-summary-icon">⏳</div>

            <div>
              <span>Pending</span>
              <strong>{pendingCount}</strong>
            </div>
          </div>

          <div
            className={
              filter === "Accepted"
                ? "request-summary-card active"
                : "request-summary-card"
            }
            onClick={() => setFilter("Accepted")}
          >
            <div className="request-summary-icon">✓</div>

            <div>
              <span>Accepted</span>
              <strong>{acceptedCount}</strong>
            </div>
          </div>

          <div
            className={
              filter === "Completed"
                ? "request-summary-card active"
                : "request-summary-card"
            }
            onClick={() => setFilter("Completed")}
          >
            <div className="request-summary-icon">✓</div>

            <div>
              <span>Completed</span>
              <strong>{completedCount}</strong>
            </div>
          </div>

          <div
            className={
              filter === "Rejected"
                ? "request-summary-card active"
                : "request-summary-card"
            }
            onClick={() => setFilter("Rejected")}
          >
            <div className="request-summary-icon">✕</div>

            <div>
              <span>Rejected</span>
              <strong>{rejectedCount}</strong>
            </div>
          </div>

        </div>

        <div className="request-filter-bar">

          {["All", "Pending", "Accepted", "Completed", "Rejected"].map(
            (item) => (
              <button
                key={item}
                type="button"
                className={
                  filter === item
                    ? "request-filter active"
                    : "request-filter"
                }
                onClick={() => setFilter(item)}
              >
                {item}
              </button>
            )
          )}

        </div>

        {loading ? (

          <div className="requests-loading">
            <div className="loading-spinner"></div>
            <h3>Loading your requests...</h3>
          </div>

        ) : error ? (

          <div className="requests-error">
            <div>⚠️</div>
            <h2>{error}</h2>
            <Link to="/login">Login</Link>
          </div>

        ) : filteredRequests.length === 0 ? (

          <div className="requests-empty">

            <div className="requests-empty-icon">💊</div>

            <h2>
              {filter === "All"
                ? "No medicine requests yet"
                : `No ${filter.toLowerCase()} requests`}
            </h2>

            <p>
              Search for a medicine and send a request to pharmacies.
            </p>

            <Link to="/search" className="empty-search-btn">
              Find Medicine
            </Link>

          </div>

        ) : (

          <div className="requests-list">

            {filteredRequests.map((request) => {

              const status = request.status || "Pending";
              const timeline = getTimelineStatus(status);
              const requestResponses = request.responses || [];

              const available = availableResponses(requestResponses);
              const sortedResponses = sortPharmacyOffers(requestResponses);
              const isBroadcast = request.broadcast === true;

              return (

                <div className="user-request-card" key={request.id}>

                  <div className="user-request-top">

                    <div className="user-request-medicine">

                      <div className="user-request-icon">
                        💊
                      </div>

                      <div>
                        <h2>
                          {request.medicineName || "Medicine Request"}
                        </h2>

                        <p>
                          {request.dosage || "Dosage not specified"}
                        </p>
                      </div>

                    </div>

                    <span className={getStatusClass(status)}>
                      {status}
                    </span>

                  </div>

                  <div className="user-request-info">

                    <div>
                      <span>Pharmacy</span>

                      <strong>
                        {request.selectedPharmacyName ||
                          request.pharmacyName ||
                          (isBroadcast
                            ? "Multiple pharmacies"
                            : "Pharmacy")}
                      </strong>
                    </div>

                    <div>
                      <span>Quantity</span>
                      <strong>{request.quantity || 1}</strong>
                    </div>

                    <div>
                      <span>Requested On</span>
                      <strong>{formatDate(request.createdAt)}</strong>
                    </div>

                    <div>
                      <span>Time</span>
                      <strong>{formatTime(request.createdAt)}</strong>
                    </div>

                  </div>

                  <div className="request-timeline">

                    <div className="timeline-step active">
                      <div className="timeline-dot">✓</div>
                      <span>Requested</span>
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
                        {timeline.accepted ? "✓" : "2"}
                      </div>
                      <span>Accepted</span>
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
                        {timeline.completed ? "✓" : "3"}
                      </div>
                      <span>Completed</span>
                    </div>

                  </div>

                  {/* Pharmacy comparison */}

                  {isBroadcast && (

                    <div className="pharmacy-comparison-section">

                      <div className="pharmacy-comparison-heading">

                        <div>
                          <span className="results-label">
                            LIVE PHARMACY RESPONSES
                          </span>

                          <h3>Compare Your Offers</h3>
                        </div>

                        <span className="response-count-badge">
                          {requestResponses.length} / {request.totalPharmacies || 0} responded
                        </span>

                      </div>

                      {requestResponses.length > 0 && (

                        <div className="offer-sort-bar">

                          <label htmlFor={`offer-sort-${request.id}`}>
                            Sort offers:
                          </label>

                          <select
                            id={`offer-sort-${request.id}`}
                            value={offerSort}
                            onChange={(e) => setOfferSort(e.target.value)}
                          >
                            <option value="Recommended">
                              Recommended
                            </option>

                            <option value="Lowest Price">
                              Lowest Price
                            </option>

                            <option value="Fastest Preparation">
                              Fastest Preparation
                            </option>

                            <option value="Highest Quantity">
                              Highest Available Quantity
                            </option>
                          </select>

                        </div>

                      )}

                      {requestResponses.length === 0 ? (

                        <div className="no-pharmacy-responses">
                          <strong>Waiting for pharmacy responses</strong>

                          <p>
                            Your request has been shared with approved
                            pharmacies. New offers will appear here
                            automatically.
                          </p>
                        </div>

                      ) : (

                        <div className="pharmacy-offers-list">

                          {sortedResponses.map((response, index) => {

                            const isAvailable =
                              response.availability === "Available" &&
                              Number(response.availableQuantity) > 0;

                            const isSelected =
                              request.selectedResponseId === response.id;

                            const isBestPrice =
                              isAvailable &&
                              available.length > 0 &&
                              Number(response.price) ===
                                Math.min(
                                  ...available.map((item) =>
                                    Number(item.price ?? Infinity)
                                  )
                                );

                            return (

                              <div
                                className={
                                  isSelected
                                    ? "pharmacy-offer-card selected"
                                    : "pharmacy-offer-card"
                                }
                                key={response.id}
                              >

                                <div className="pharmacy-offer-top">

                                  <div>
                                    <h4>
                                      {response.pharmacyName || "Pharmacy"}
                                    </h4>

                                    <span
                                      className={
                                        isAvailable
                                          ? "offer-availability available"
                                          : "offer-availability unavailable"
                                      }
                                    >
                                      {isAvailable
                                        ? "Available"
                                        : "Not Available"}
                                    </span>
                                  </div>

                                  <div className="offer-card-labels">

                                    {isBestPrice && (
                                      <span className="best-price-badge">
                                        Best Price
                                      </span>
                                    )}

                                    {isSelected && (
                                      <span className="selected-offer-badge">
                                        ✓ Selected
                                      </span>
                                    )}

                                  </div>

                                </div>

                                {isAvailable ? (

                                  <>

                                    <div className="pharmacy-offer-details">

                                      <div>
                                        <span>Price</span>
                                        <strong>
                                          ₹{response.price ?? "—"}
                                        </strong>
                                      </div>

                                      <div>
                                        <span>Available Quantity</span>
                                        <strong>
                                          {response.availableQuantity ?? "—"}
                                        </strong>
                                      </div>

                                      <div>
                                        <span>Preparation Time</span>
                                        <strong>
                                          {response.preparationTime || "Not specified"}
                                        </strong>
                                      </div>

                                    </div>

                                    {isSelected ? (

                                      <div className="selected-pharmacy-message">
                                        You selected this pharmacy for your request.
                                      </div>

                                    ) : (

                                      <button
                                        type="button"
                                        className="choose-pharmacy-btn"
                                        disabled={
                                          Boolean(request.selectedPharmacyId) ||
                                          selecting === response.id
                                        }
                                        onClick={() =>
                                          handleChoosePharmacy(request, response)
                                        }
                                      >
                                        {selecting === response.id
                                          ? "Selecting..."
                                          : request.selectedPharmacyId
                                            ? "Another pharmacy selected"
                                            : "Choose This Pharmacy"}
                                      </button>

                                    )}

                                  </>

                                ) : (

                                  <p className="unavailable-offer-message">
                                    This pharmacy currently cannot provide
                                    this medicine.
                                  </p>

                                )}

                              </div>

                            );
                          })}

                        </div>

                      )}

                      {request.selectedPharmacyId && (

                        <div className="final-pharmacy-selection">
                          <strong>Pharmacy selected</strong>

                          <p>
                            {request.selectedPharmacyName}
                          </p>
                        </div>

                      )}

                      {requestResponses.length > 0 &&
                        available.length === 0 && (

                          <p className="no-available-pharmacy">
                            No pharmacy has confirmed availability yet.
                          </p>

                        )}

                    </div>

                  )}

                  {!isBroadcast && (

                    <div className="legacy-pharmacy-info">
                      <span>Pharmacy</span>

                      <strong>
                        {request.pharmacyName || "Pharmacy"}
                      </strong>
                    </div>

                  )}

                  {(request.location || request.message) && (

                    <div className="request-extra-info">

                      {request.location && (
                        <div>
                          <span>📍 Location</span>
                          <p>{request.location}</p>
                        </div>
                      )}

                      {request.message && (
                        <div>
                          <span>💬 Message</span>
                          <p>{request.message}</p>
                        </div>
                      )}

                    </div>

                  )}

                </div>

              );
            })}

          </div>

        )}

      </div>
    </div>
  );
}

export default MyRequests;