import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";

import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  where
} from "firebase/firestore";

import { auth, db } from "../../firebase/Firebase";


function MedicineRequests() {
  const location = useLocation();

  const [pharmacyId, setPharmacyId] = useState("");
  const [pharmacyName, setPharmacyName] = useState("");

  const [requests, setRequests] = useState([]);
  const [responses, setResponses] = useState([]);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState("");
  const [error, setError] = useState("");

  const [filter, setFilter] = useState("All");
  const [selectedRequest, setSelectedRequest] = useState(null);

  const [responseForm, setResponseForm] = useState({
    availability: "Available",
    availableQuantity: "",
    price: "",
    preparationTime: ""
  });

  // Verify logged-in pharmacy
  useEffect(() => {
    const verifyPharmacy = async () => {
      try {
        const user = auth.currentUser;

        if (!user) {
          setError("Please login with your pharmacy account.");
          setLoading(false);
          return;
        }

        const userRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userRef);

        if (!userSnap.exists()) {
          throw new Error("Pharmacy profile not found.");
        }

        const userData = userSnap.data();

        if (userData.role !== "pharmacy") {
          throw new Error("Access denied. Pharmacy account required.");
        }

        const id = userData.pharmacyId;

        if (!id) {
          throw new Error("Pharmacy profile is not linked to your account.");
        }

        const pharmacyRef = doc(db, "pharmacies", id);
        const pharmacySnap = await getDoc(pharmacyRef);

        if (!pharmacySnap.exists()) {
          throw new Error("Pharmacy details not found.");
        }

        const pharmacyData = pharmacySnap.data();

        if (
          pharmacyData.ownerId !== user.uid ||
          pharmacyData.status !== "approved"
        ) {
          throw new Error("Your pharmacy is not approved.");
        }

        setPharmacyId(id);
        setPharmacyName(
          pharmacyData.pharmacyName ||
          pharmacyData.name ||
          "Your Pharmacy"
        );
      } catch (err) {
        console.error("Pharmacy verification error:", err);
        setError(err.message || "Unable to verify pharmacy.");
        setLoading(false);
      }
    };

    verifyPharmacy();
  }, []);

  // Listen to incoming requests and pharmacy responses
  useEffect(() => {
    if (!pharmacyId) return;

    setLoading(true);

    let legacyRequests = [];
    let broadcastRequests = [];

    const updateRequests = () => {
      const combined = new Map();

      [...legacyRequests, ...broadcastRequests].forEach((item) => {
        combined.set(item.id, item);
      });

      const sorted = Array.from(combined.values()).sort((a, b) => {
        const aTime = a.createdAt?.toMillis?.() || 0;
        const bTime = b.createdAt?.toMillis?.() || 0;
        return bTime - aTime;
      });

      setRequests(sorted);
      setLoading(false);
    };

    const legacyQuery = query(
      collection(db, "medicineRequests"),
      where("pharmacyId", "==", pharmacyId)
    );

    const broadcastQuery = query(
      collection(db, "medicineRequests"),
      where("targetPharmacyIds", "array-contains", pharmacyId)
    );

    const responsesQuery = query(
      collection(db, "pharmacyResponses"),
      where("pharmacyId", "==", pharmacyId)
    );

    const unsubscribeLegacy = onSnapshot(
      legacyQuery,
      (snapshot) => {
        legacyRequests = snapshot.docs.map((item) => ({
          id: item.id,
          ...item.data()
        }));

        updateRequests();
      },
      (err) => {
        console.error("Legacy requests error:", err);
        setError("Unable to load some medicine requests.");
        setLoading(false);
      }
    );

    const unsubscribeBroadcast = onSnapshot(
      broadcastQuery,
      (snapshot) => {
        broadcastRequests = snapshot.docs.map((item) => ({
          id: item.id,
          ...item.data()
        }));

        updateRequests();
      },
      (err) => {
        console.error("Broadcast requests error:", err);
        setError("Unable to load broadcast requests.");
        setLoading(false);
      }
    );

    const unsubscribeResponses = onSnapshot(
      responsesQuery,
      (snapshot) => {
        setResponses(
          snapshot.docs.map((item) => ({
            id: item.id,
            ...item.data()
          }))
        );
      },
      (err) => {
        console.error("Responses loading error:", err);
      }
    );

    return () => {
      unsubscribeLegacy();
      unsubscribeBroadcast();
      unsubscribeResponses();
    };
  }, [pharmacyId]);

  // Find this pharmacy's response for a request
  const getResponse = (requestId) => {
    return responses.find(
      (response) => response.requestId === requestId
    );
  };

  // Filter requests
  const filteredRequests = useMemo(() => {
    return requests.filter((request) => {
      const response = getResponse(request.id);

      if (filter === "All") return true;

      if (filter === "Pending") {
        return !response;
      }

      if (filter === "Available") {
        return response?.availability === "Available";
      }

      if (filter === "Not Available") {
        return response?.availability === "Not Available";
      }

      return true;
    });
  }, [requests, responses, filter]);

  // Highlight request opened from notification
  useEffect(() => {
    const requestId = location.state?.requestId;

    if (!requestId || requests.length === 0) return;

    const target = requests.find(
      (request) => request.id === requestId
    );

    if (target) {
      setFilter("All");
      setSelectedRequest(target);

      setTimeout(() => {
        document
          .getElementById(`request-${requestId}`)
          ?.scrollIntoView({
            behavior: "smooth",
            block: "center"
          });
      }, 300);
    }
  }, [location.state, requests]);

  // Update response form
  const handleFormChange = (e) => {
    const { name, value } = e.target;

    setResponseForm((previous) => ({
      ...previous,
      [name]: value
    }));
  };

  // Submit or update pharmacy response
  const handleResponse = async (request) => {
    setError("");

    const availability = responseForm.availability;
    const availableQuantity =
      availability === "Available"
        ? Number(responseForm.availableQuantity)
        : 0;

    const price =
      availability === "Available"
        ? Number(responseForm.price)
        : 0;

    if (
      availability === "Available" &&
      (!responseForm.availableQuantity ||
        availableQuantity < 1)
    ) {
      setError("Please enter a valid available quantity.");
      return;
    }

    if (
      availability === "Available" &&
      (!responseForm.price || price < 0)
    ) {
      setError("Please enter a valid medicine price.");
      return;
    }

    if (
      availability === "Available" &&
      !responseForm.preparationTime.trim()
    ) {
      setError("Please enter the preparation time.");
      return;
    }

    try {
      setSubmitting(request.id);

      const existingResponse = getResponse(request.id);

      const responseData = {
        requestId: request.id,
        userId: request.userId,
        pharmacyId,
        pharmacyName,

        medicineName: request.medicineName,

        availability,
        availableQuantity,
        price,

        preparationTime:
          availability === "Available"
            ? responseForm.preparationTime.trim()
            : "",

        status: availability,
        isRead: false,
        respondedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      if (existingResponse) {
        await updateDoc(
          doc(db, "pharmacyResponses", existingResponse.id),
          responseData
        );
      } else {
        await addDoc(
          collection(db, "pharmacyResponses"),
          {
            ...responseData,
            createdAt: serverTimestamp()
          }
        );
      }

      setSelectedRequest(null);

      setResponseForm({
        availability: "Available",
        availableQuantity: "",
        price: "",
        preparationTime: ""
      });
    } catch (err) {
      console.error("Response submission error:", err);
      setError(
        err.message || "Unable to submit your response."
      );
    } finally {
      setSubmitting("");
    }
  };

  // Format date
  const formatDate = (timestamp) => {
    if (!timestamp?.toDate) return "Recently";

    return timestamp.toDate().toLocaleString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  const pendingCount = requests.filter(
    (request) => !getResponse(request.id)
  ).length;

  const availableCount = responses.filter(
    (response) => response.availability === "Available"
  ).length;

  const unavailableCount = responses.filter(
    (response) => response.availability === "Not Available"
  ).length;

  if (loading && !pharmacyId) {
    return (
      <div className="medicine-requests-loading">
        <div className="requests-loader"></div>
        <p>Loading pharmacy requests...</p>
      </div>
    );
  }

  if (error && !pharmacyId) {
    return (
      <div className="medicine-requests-page">
        <div className="medicine-request-error">{error}</div>
      </div>
    );
  }

  return (
    <div className="medicine-requests-page">

      <div className="medicine-requests-header">
        <div>
          <span className="medicine-requests-label">
            PHARMACY MANAGEMENT
          </span>

          <h1>Medicine Requests</h1>

          <p>
            Review customer requests and update medicine availability.
          </p>
        </div>

        <div className="pharmacy-name-badge">
          {pharmacyName}
        </div>
      </div>

      <div className="medicine-requests-container">

        {error && (
          <div className="medicine-request-error">
            {error}
            <button onClick={() => setError("")}>×</button>
          </div>
        )}

        {/* SUMMARY CARDS */}

        <div className="medicine-request-stats">

          <div className="medicine-request-stat">
            <span>Total Requests</span>
            <h2>{requests.length}</h2>
            <small>Requests received</small>
          </div>

          <div className="medicine-request-stat pending-stat">
            <span>Awaiting Response</span>
            <h2>{pendingCount}</h2>
            <small>Need your attention</small>
          </div>

          <div className="medicine-request-stat available-stat">
            <span>Available</span>
            <h2>{availableCount}</h2>
            <small>Positive responses</small>
          </div>

          <div className="medicine-request-stat unavailable-stat">
            <span>Unavailable</span>
            <h2>{unavailableCount}</h2>
            <small>Unavailable responses</small>
          </div>

        </div>

        {/* FILTERS */}

        <div className="medicine-requests-toolbar">
          <div>
            <h2>Customer Requests</h2>
            <p>Manage incoming medicine enquiries.</p>
          </div>

          <div className="medicine-request-filters">
            {["All", "Pending", "Available", "Not Available"].map(
              (item) => (
                <button
                  key={item}
                  className={filter === item ? "active" : ""}
                  onClick={() => setFilter(item)}
                >
                  {item}
                </button>
              )
            )}
          </div>
        </div>

        {/* REQUEST LIST */}

        {loading ? (
          <div className="medicine-request-empty">
            Loading requests...
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="medicine-request-empty">
            <div className="request-empty-icon">⌕</div>

            <h3>No requests found</h3>

            <p>
              {filter === "All"
                ? "New customer medicine requests will appear here."
                : `There are no ${filter.toLowerCase()} requests.`}
            </p>
          </div>
        ) : (
          <div className="medicine-request-list">

            {filteredRequests.map((request) => {
              const response = getResponse(request.id);

              const isSelected =
                selectedRequest?.id === request.id;

              return (
                <div
                  className={`medicine-request-card ${
                    location.state?.requestId === request.id
                      ? "highlight-request"
                      : ""
                  }`}
                  id={`request-${request.id}`}
                  key={request.id}
                >

                  <div className="medicine-request-card-top">

                    <div>
                      <span className="request-id">
                        REQUEST #{request.id.slice(0, 8).toUpperCase()}
                      </span>

                      <h3>{request.medicineName}</h3>

                      <span
                        className={`request-status ${
                          response
                            ? response.availability === "Available"
                              ? "status-available"
                              : "status-unavailable"
                            : "status-pending"
                        }`}
                      >
                        {response?.availability || "Pending"}
                      </span>
                    </div>

                    <span className="request-date">
                      {formatDate(request.createdAt)}
                    </span>

                  </div>

                  <div className="medicine-request-details">

                    <div>
                      <span>Quantity</span>
                      <strong>{request.quantity || "—"}</strong>
                    </div>

                    <div>
                      <span>Dosage</span>
                      <strong>{request.dosage || "Not specified"}</strong>
                    </div>

                    <div>
                      <span>Customer</span>
                      <strong>{request.userName || "Customer"}</strong>
                    </div>

                    <div>
                      <span>Location</span>
                      <strong>{request.location || "Not provided"}</strong>
                    </div>

                  </div>

                  {request.message && (
                    <div className="request-customer-message">
                      <span>Additional Message</span>
                      <p>{request.message}</p>
                    </div>
                  )}

                  {response && (
                    <div className="existing-pharmacy-response">
                      <div>
                        <span>Your Response</span>
                        <strong>{response.availability}</strong>
                      </div>

                      {response.availability === "Available" && (
                        <>
                          <div>
                            <span>Available Quantity</span>
                            <strong>{response.availableQuantity}</strong>
                          </div>

                          <div>
                            <span>Price</span>
                            <strong>₹{response.price}</strong>
                          </div>

                          <div>
                            <span>Preparation</span>
                            <strong>{response.preparationTime}</strong>
                          </div>
                        </>
                      )}
                    </div>
                  )}

                  <div className="medicine-request-card-actions">

                    <button
                      className="respond-request-btn"
                      onClick={() => {
                        setSelectedRequest(
                          isSelected ? null : request
                        );

                        setResponseForm({
                          availability: response?.availability || "Available",
                          availableQuantity:
                            response?.availableQuantity?.toString() || "",
                          price: response?.price?.toString() || "",
                          preparationTime:
                            response?.preparationTime || ""
                        });
                      }}
                    >
                      {isSelected
                        ? "Close Response"
                        : response
                          ? "Update Response"
                          : "Respond to Request"}
                    </button>

                  </div>

                  {isSelected && (
                    <div className="pharmacy-response-form">

                      <h4>
                        {response
                          ? "Update Your Response"
                          : "Send Your Response"}
                      </h4>

                      <div className="response-form-group">
                        <label>Medicine Availability</label>

                        <select
                          name="availability"
                          value={responseForm.availability}
                          onChange={handleFormChange}
                        >
                          <option value="Available">Available</option>
                          <option value="Not Available">
                            Not Available
                          </option>
                        </select>
                      </div>

                      {responseForm.availability === "Available" && (
                        <>
                          <div className="response-form-row">

                            <div className="response-form-group">
                              <label>Available Quantity *</label>

                              <input
                                type="number"
                                min="1"
                                name="availableQuantity"
                                value={responseForm.availableQuantity}
                                onChange={handleFormChange}
                                placeholder="Enter quantity"
                              />
                            </div>

                            <div className="response-form-group">
                              <label>Price (₹) *</label>

                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                name="price"
                                value={responseForm.price}
                                onChange={handleFormChange}
                                placeholder="Enter price"
                              />
                            </div>

                          </div>

                          <div className="response-form-group">
                            <label>Preparation Time *</label>

                            <input
                              type="text"
                              name="preparationTime"
                              value={responseForm.preparationTime}
                              onChange={handleFormChange}
                              placeholder="Example: 15 minutes"
                            />
                          </div>
                        </>
                      )}

                      <button
                        className="send-pharmacy-response-btn"
                        disabled={submitting === request.id}
                        onClick={() => handleResponse(request)}
                      >
                        {submitting === request.id
                          ? "Submitting..."
                          : response
                            ? "Update Response"
                            : "Submit Response"}
                      </button>

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

export default MedicineRequests;