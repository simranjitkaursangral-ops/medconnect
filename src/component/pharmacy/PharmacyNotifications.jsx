import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  updateDoc,
  serverTimestamp,
  writeBatch
} from "firebase/firestore";

import { db } from "../../firebase/Firebase";
import "./PharmacyNotifications.css";

function PharmacyNotifications({ pharmacyId }) {
  const navigate = useNavigate();

  const [notifications, setNotifications] = useState([]);
  const [filter, setFilter] = useState("All");
  const [loading, setLoading] = useState(true);

  // Load pharmacy notifications in real time
  useEffect(() => {
    if (!pharmacyId) {
      setNotifications([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    const notificationQuery = query(
      collection(db, "pharmacyNotifications"),
      where("pharmacyId", "==", pharmacyId)
    );

    const unsubscribe = onSnapshot(
      notificationQuery,
      (snapshot) => {
        const data = snapshot.docs.map((item) => ({
          id: item.id,
          ...item.data()
        }));

        data.sort((a, b) => {
          const first = a.createdAt?.toMillis?.() || 0;
          const second = b.createdAt?.toMillis?.() || 0;

          return second - first;
        });

        setNotifications(data);
        setLoading(false);
      },
      (error) => {
        console.error("Notification listener error:", error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [pharmacyId]);

  // Count unread notifications
  const unreadCount = notifications.filter(
    (item) => !item.isRead
  ).length;

  // Apply notification filters
  const filteredNotifications = notifications.filter((item) => {
    if (filter === "Unread") return !item.isRead;
    if (filter === "Read") return item.isRead;

    return true;
  });

  // Mark one notification as read
  const markAsRead = async (notificationId) => {
    try {
      await updateDoc(
        doc(db, "pharmacyNotifications", notificationId),
        {
          isRead: true,
          readAt: serverTimestamp()
        }
      );

      // Update the local state after successful Firestore update
      setNotifications((previous) =>
        previous.map((item) =>
          item.id === notificationId
            ? { ...item, isRead: true }
            : item
        )
      );

      return true;

    } catch (error) {
      console.error("Unable to mark notification as read:", error);
      return false;
    }
  };

  // Mark all notifications as read
  const markAllAsRead = async () => {
    try {
      const unreadNotifications = notifications.filter(
        (item) => !item.isRead
      );

      if (unreadNotifications.length === 0) return;

      const batch = writeBatch(db);

      unreadNotifications.forEach((item) => {
        batch.update(
          doc(db, "pharmacyNotifications", item.id),
          {
            isRead: true,
            readAt: serverTimestamp()
          }
        );
      });

      await batch.commit();

      // Update local state after successful batch operation
      setNotifications((previous) =>
        previous.map((item) => ({
          ...item,
          isRead: true
        }))
      );

    } catch (error) {
      console.error("Unable to mark all as read:", error);
      alert("Unable to mark notifications as read. Please try again.");
    }
  };

  // Open request and mark notification as read
  const handleViewRequest = async (notification) => {
    if (!notification.requestId) {
      alert("Request information is not available.");
      return;
    }

    if (!notification.isRead) {
      const updated = await markAsRead(notification.id);

      if (!updated) {
        alert(
          "Unable to mark notification as read. Please check Firestore permissions."
        );
        return;
      }
    }

    navigate("/pharmacy-requests", {
      state: {
        requestId: notification.requestId
      }
    });
  };

  // Format notification time
  const formatTime = (timestamp) => {
    if (!timestamp?.toDate) return "Recently";

    return timestamp.toDate().toLocaleString("en-IN", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  return (
    <section className="pharmacy-notifications">

      {/* Heading */}
      <div className="pharmacy-notification-heading">

        <div>
          <h2>Notifications</h2>

          <p>
            Keep track of new medicine requests from customers.
          </p>
        </div>

        <div className="pharmacy-unread-count">
          {unreadCount} Unread
        </div>

      </div>

      {/* Toolbar */}
      <div className="pharmacy-notification-toolbar">

        <div className="pharmacy-notification-filters">

          {["All", "Unread", "Read"].map((item) => (
            <button
              key={item}
              type="button"
              className={filter === item ? "active" : ""}
              onClick={() => setFilter(item)}
            >
              {item}
            </button>
          ))}

        </div>

        {unreadCount > 0 && (
          <button
            type="button"
            className="mark-all-read"
            onClick={markAllAsRead}
          >
            Mark all as read
          </button>
        )}

      </div>

      {/* Loading */}
      {loading ? (

        <div className="pharmacy-notification-empty">
          Loading notifications...
        </div>

      ) : filteredNotifications.length === 0 ? (

        /* Empty State */
        <div className="pharmacy-notification-empty">

          <h3>No notifications found</h3>

          <p>
            New medicine requests will appear here.
          </p>

        </div>

      ) : (

        /* Notification List */
        <div className="pharmacy-notification-list">

          {filteredNotifications.map((item) => (

            <div
              key={item.id}
              className={`pharmacy-notification-item ${
                !item.isRead ? "unread" : ""
              }`}
            >

              {/* Unread Indicator */}
              <div className="pharmacy-notification-dot">
                {!item.isRead && <span />}
              </div>

              {/* Notification Content */}
              <div className="pharmacy-notification-content">

                <h3>New Medicine Request</h3>

                <p>
                  <strong>
                    {item.userName || "Customer"}
                  </strong>

                  {" "}has requested{" "}

                  <strong>
                    {item.medicineName || "a medicine"}
                  </strong>.
                </p>

                <span>
                  {formatTime(item.createdAt)}
                </span>

              </div>

              {/* Actions */}
              <div className="pharmacy-notification-actions">

                <button
                  type="button"
                  className="view-request-btn"
                  onClick={() => handleViewRequest(item)}
                >
                  View Request
                </button>

                {!item.isRead && (
                  <button
                    type="button"
                    className="notification-read-btn"
                    onClick={() => markAsRead(item.id)}
                  >
                    Mark as read
                  </button>
                )}

              </div>

            </div>

          ))}

        </div>

      )}

    </section>
  );
}

export default PharmacyNotifications;