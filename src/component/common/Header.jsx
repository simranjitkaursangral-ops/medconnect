import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import {
  onAuthStateChanged,
  signOut
} from "firebase/auth";

import {
  doc,
  getDoc,
  collection,
  query,
  where,
  onSnapshot,
  updateDoc,
  serverTimestamp
} from "firebase/firestore";

import { auth, db } from "../../firebase/Firebase";

function Header() {
  const navigate = useNavigate();

  const [isLogin, setIsLogin] = useState(false);
  const [userType, setUserType] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);

  const [notifications, setNotifications] = useState([]);
  const [notificationOpen, setNotificationOpen] = useState(false);

  // AUTHENTICATION

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(
      auth,
      async (user) => {
        if (!user) {
          setIsLogin(false);
          setUserType("");
          setNotifications([]);
          return;
        }

        try {
          const userDoc = await getDoc(
            doc(db, "users", user.uid)
          );

          if (!userDoc.exists()) {
            setIsLogin(false);
            setUserType("");
            return;
          }

          const userData = userDoc.data();

          setIsLogin(true);
          setUserType(userData.role || "");

          localStorage.setItem("isLogin", "true");
          localStorage.setItem("uid", user.uid);
          localStorage.setItem("userType", userData.role || "");
          localStorage.setItem("userName", userData.name || "");

          localStorage.setItem(
            "userEmail",
            userData.email || user.email || ""
          );

          if (userData.role === "pharmacy") {
            if (userData.pharmacyId) {
              localStorage.setItem(
                "pharmacyId",
                userData.pharmacyId
              );
            }

            if (userData.status) {
              localStorage.setItem(
                "pharmacyStatus",
                userData.status
              );
            }
          }
        } catch (error) {
          console.log("HEADER USER ERROR:", error);
        }
      }
    );

    return () => unsubscribe();
  }, []);

  // REAL-TIME CUSTOMER NOTIFICATIONS

  useEffect(() => {
    const user = auth.currentUser;

    if (!user || userType !== "user") {
      setNotifications([]);
      return;
    }

    let requestData = [];
    let responseData = [];

    const updateNotifications = () => {
      const requestMap = {};

      requestData.forEach((request) => {
        requestMap[request.id] = request;
      });

      const combinedNotifications = responseData.map(
        (response) => {
          const request = requestMap[response.requestId] || {};

          return {
            ...response,
            medicineName:
              request.medicineName || "Medicine request",
            requestId: response.requestId
          };
        }
      );

      combinedNotifications.sort((a, b) => {
        const dateA = a.respondedAt?.toDate
          ? a.respondedAt.toDate().getTime()
          : a.createdAt?.toDate
            ? a.createdAt.toDate().getTime()
            : 0;

        const dateB = b.respondedAt?.toDate
          ? b.respondedAt.toDate().getTime()
          : b.createdAt?.toDate
            ? b.createdAt.toDate().getTime()
            : 0;

        return dateB - dateA;
      });

      setNotifications(combinedNotifications);
    };

    const requestsQuery = query(
      collection(db, "medicineRequests"),
      where("userId", "==", user.uid)
    );

    const responsesQuery = query(
      collection(db, "pharmacyResponses"),
      where("userId", "==", user.uid)
    );

    const unsubscribeRequests = onSnapshot(
      requestsQuery,
      (snapshot) => {
        requestData = snapshot.docs.map((item) => ({
          id: item.id,
          ...item.data()
        }));

        updateNotifications();
      },
      (error) => {
        console.log("REQUEST NOTIFICATION ERROR:", error);
      }
    );

    const unsubscribeResponses = onSnapshot(
      responsesQuery,
      (snapshot) => {
        responseData = snapshot.docs.map((item) => ({
          id: item.id,
          ...item.data()
        }));

        updateNotifications();
      },
      (error) => {
        console.log("RESPONSE NOTIFICATION ERROR:", error);
      }
    );

    return () => {
      unsubscribeRequests();
      unsubscribeResponses();
    };
  }, [userType]);

  const unreadCount = notifications.filter(
    (notification) => !notification.isRead
  ).length;

  // MARK NOTIFICATION AS READ

  const handleNotificationClick = async (notification) => {
    try {
      if (!notification.isRead) {
        await updateDoc(
          doc(db, "pharmacyResponses", notification.id),
          {
            isRead: true,
            readAt: serverTimestamp()
          }
        );
      }

      setNotificationOpen(false);
      setMenuOpen(false);

      navigate("/my-requests");
    } catch (error) {
      console.log("NOTIFICATION UPDATE ERROR:", error);

      setNotificationOpen(false);
      navigate("/my-requests");
    }
  };

  // LOGOUT

  const handleLogout = async () => {
    try {
      await signOut(auth);

      localStorage.clear();

      setIsLogin(false);
      setUserType("");
      setMenuOpen(false);
      setNotificationOpen(false);
      setNotifications([]);

      navigate("/login");
    } catch (error) {
      console.log("LOGOUT ERROR:", error);
    }
  };

  const closeMenu = () => {
    setMenuOpen(false);
    setNotificationOpen(false);
  };

  const getHomeRoute = () => {
    if (userType === "admin") {
      return "/admin-dashboard";
    }

    if (userType === "pharmacy") {
      return "/pharmacy-dashboard";
    }

    return "/";
  };

  // RESPONSE STATUS

  const getAvailabilityStatus = (notification) => {
    return (
      notification.availability === "Available" ||
      notification.available === true
    );
  };

  // NOTIFICATION TIME

  const getNotificationTime = (notification) => {
    const timestamp =
      notification.respondedAt || notification.createdAt;

    if (!timestamp) return "Recently";

    const date = timestamp.toDate
      ? timestamp.toDate()
      : new Date(timestamp);

    if (Number.isNaN(date.getTime())) return "Recently";

    return date.toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  return (
    <header className="main-header">

      <div className="header-container">

        <Link
          to={getHomeRoute()}
          className="header-logo"
          onClick={closeMenu}
        >
          <div className="header-logo-icon">
            💊
          </div>

          <div className="header-logo-text">
            <strong>MedConnect</strong>

            <span>
              Medicine Availability Finder
            </span>
          </div>
        </Link>

        <button
          type="button"
          className="mobile-menu-btn"
          onClick={() => setMenuOpen(!menuOpen)}
        >
          {menuOpen ? "✕" : "☰"}
        </button>

        <nav
          className={
            menuOpen
              ? "header-nav open"
              : "header-nav"
          }
        >

          {userType !== "admin" && userType !== "pharmacy" && (
            <Link to="/" onClick={closeMenu}>
              Home
            </Link>
          )}

          {userType === "admin" ? (

            <>
              <Link to="/admin-dashboard" onClick={closeMenu}>
                Dashboard
              </Link>

              <Link to="/admin-pharmacy-applications" onClick={closeMenu}>
                Applications
              </Link>

              <Link to="/admin-pharmacies" onClick={closeMenu}>
                Pharmacies
              </Link>

              <Link to="/admin-users" onClick={closeMenu}>
                Users
              </Link>

              <button
                type="button"
                className="header-logout-btn"
                onClick={handleLogout}
              >
                Logout
              </button>
            </>

          ) : userType === "pharmacy" ? (

            <>
              <Link to="/pharmacy-dashboard" onClick={closeMenu}>
                Dashboard
              </Link>

              <Link to="/pharmacy-profile" onClick={closeMenu}>
                My Pharmacy
              </Link>

              <Link to="/pharmacy-medicines" onClick={closeMenu}>
                Medicines
              </Link>

              <Link to="/pharmacy-requests" onClick={closeMenu}>
                Requests
              </Link>

              <Link to="/pharmacy-prescriptions" onClick={closeMenu}>
                Prescriptions
              </Link>

              <button
                type="button"
                className="header-logout-btn"
                onClick={handleLogout}
              >
                Logout
              </button>
            </>

          ) : (

            <>

              <Link to="/search" onClick={closeMenu}>
                Find Medicine
              </Link>

              <Link to="/request-medicine" onClick={closeMenu}>
                Request Medicine
              </Link>

              <Link to="/prescription-upload" onClick={closeMenu}>
                Prescription
              </Link>

              {isLogin && userType === "user" && (
                <>
                  <Link to="/my-requests" onClick={closeMenu}>
                    My Requests
                  </Link>

                  <Link to="/my-prescriptions" onClick={closeMenu}>
                    My Prescriptions
                  </Link>

                  <Link to="/ai-assistant" onClick={closeMenu}>
                    AI Assistant
                  </Link>
                </>
              )}

              {isLogin && userType === "user" && (
                <div className="header-notification-wrapper">

                  <button
                    type="button"
                    className="header-notification-btn"
                    onClick={() =>
                      setNotificationOpen(!notificationOpen)
                    }
                    aria-label="Notifications"
                  >
                    <span className="notification-bell">
                      🔔
                    </span>

                    {unreadCount > 0 && (
                      <span className="notification-count">
                        {unreadCount > 99 ? "99+" : unreadCount}
                      </span>
                    )}
                  </button>

                  {notificationOpen && (

                    <div className="notification-dropdown">

                      <div className="notification-dropdown-header">

                        <div>
                          <h3>Notifications</h3>

                          <p>
                            Pharmacy offer updates
                          </p>
                        </div>

                        <span>
                          {unreadCount} unread
                        </span>

                      </div>

                      <div className="notification-list">

                        {notifications.length === 0 ? (

                          <div className="notification-empty">

                            <div className="notification-empty-icon">
                              🔔
                            </div>

                            <strong>
                              No notifications yet
                            </strong>

                            <p>
                              Pharmacy responses to your medicine requests will appear here.
                            </p>

                          </div>

                        ) : (

                          notifications.slice(0, 8).map(
                            (notification) => {

                              const isAvailable =
                                getAvailabilityStatus(notification);

                              return (

                                <button
                                  type="button"
                                  key={notification.id}
                                  className={
                                    notification.isRead
                                      ? "notification-item"
                                      : "notification-item unread"
                                  }
                                  onClick={() =>
                                    handleNotificationClick(notification)
                                  }
                                >

                                  <div className="notification-item-icon">
                                    💊
                                  </div>

                                  <div className="notification-item-content">

                                    <div className="notification-item-top">

                                      <strong>
                                        {notification.pharmacyName || "Pharmacy"}
                                      </strong>

                                      {!notification.isRead && (
                                        <span className="notification-unread-dot"></span>
                                      )}

                                    </div>

                                    <p>
                                      Response for{" "}
                                      <strong>
                                        {notification.medicineName}
                                      </strong>
                                    </p>

                                    <span
                                      className={
                                        isAvailable
                                          ? "notification-availability available"
                                          : "notification-availability unavailable"
                                      }
                                    >
                                      {isAvailable
                                        ? "✓ Medicine Available"
                                        : "✕ Not Available"}
                                    </span>

                                    {isAvailable && (

                                      <div className="notification-offer-details">

                                        <div>
                                          <span>Price</span>
                                          <strong>
                                            ₹{notification.price ?? "—"}
                                          </strong>
                                        </div>

                                        <div>
                                          <span>Quantity</span>
                                          <strong>
                                            {notification.availableQuantity ?? "—"}
                                          </strong>
                                        </div>

                                        <div>
                                          <span>Preparation</span>
                                          <strong>
                                            {notification.preparationTime || "Not specified"}
                                          </strong>
                                        </div>

                                      </div>

                                    )}

                                    <span className="notification-time">
                                      {getNotificationTime(notification)}
                                    </span>

                                  </div>

                                </button>

                              );
                            }
                          )

                        )}

                      </div>

                      <button
                        type="button"
                        className="notification-view-all"
                        onClick={() => {
                          setNotificationOpen(false);
                          setMenuOpen(false);
                          navigate("/my-requests");
                        }}
                      >
                        Compare All Pharmacy Offers →
                      </button>

                    </div>

                  )}

                </div>

              )}

              {isLogin ? (

                <button
                  type="button"
                  className="header-logout-btn"
                  onClick={handleLogout}
                >
                  Logout
                </button>

              ) : (

                <div className="header-auth-actions">

                  <Link
                    to="/login"
                    className="header-login-btn"
                    onClick={closeMenu}
                  >
                    Login
                  </Link>

                  <Link
                    to="/register"
                    className="header-register-btn"
                    onClick={closeMenu}
                  >
                    Get Started
                  </Link>

                </div>

              )}

            </>

          )}

        </nav>

      </div>

    </header>
  );
}

export default Header;