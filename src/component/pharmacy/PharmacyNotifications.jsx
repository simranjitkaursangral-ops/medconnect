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

  useEffect(() => {
    if (!pharmacyId) {
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

  const unreadCount = notifications.filter(
    (item) => !item.isRead
  ).length;

  const filteredNotifications = notifications.filter((item) => {
    if (filter === "Unread") return !item.isRead;
    if (filter === "Read") return item.isRead;

    return true;
  });

  const markAsRead = async (notificationId) => {
    try {
      await updateDoc(
        doc(db, "pharmacyNotifications", notificationId),
        {
          isRead: true,
          readAt: serverTimestamp()
        }
      );
    } catch (error) {
      console.error("Unable to mark notification as read:", error);
    }
  };

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
    } catch (error) {
      console.error("Unable to mark all as read:", error);
    }
  };

  const handleViewRequest = async (notification) => {
    if (!notification.requestId) return;

    if (!notification.isRead) {
      await markAsRead(notification.id);
    }

    navigate("/pharmacy-requests", {
      state: {
        requestId: notification.requestId
      }
    });
  };

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

      {loading ? (

        <div className="pharmacy-notification-empty">
          Loading notifications...
        </div>

      ) : filteredNotifications.length === 0 ? (

        <div className="pharmacy-notification-empty">
          <h3>No notifications found</h3>
          <p>New medicine requests will appear here.</p>
        </div>

      ) : (

        <div className="pharmacy-notification-list">

          {filteredNotifications.map((item) => (

            <div
              key={item.id}
              className={`pharmacy-notification-item ${
                !item.isRead ? "unread" : ""
              }`}
            >

              <div className="pharmacy-notification-dot">
                {!item.isRead && <span />}
              </div>

              <div className="pharmacy-notification-content">

                <h3>New Medicine Request</h3>

                <p>
                  <strong>{item.userName || "Customer"}</strong>
                  {" "}has requested{" "}
                  <strong>
                    {item.medicineName || "a medicine"}
                  </strong>.
                </p>

                <span>{formatTime(item.createdAt)}</span>

              </div>

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