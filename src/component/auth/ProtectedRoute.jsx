import { useEffect, useState } from "react";
import { Navigate, Outlet } from "react-router-dom";

import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

import { auth, db } from "../../firebase/Firebase";

function ProtectedRoute({ allowedRole }) {
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [redirectPath, setRedirectPath] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    const unsubscribe = onAuthStateChanged(
      auth,
      async (user) => {
        if (!active) return;

        try {
          setLoading(true);
          setError("");

          if (!user) {
            localStorage.removeItem("isLogin");
            localStorage.removeItem("uid");
            localStorage.removeItem("userType");
            localStorage.removeItem("pharmacyId");

            if (active) {
              setAuthorized(false);
              setRedirectPath("/login");
            }

            return;
          }

          const userRef = doc(db, "users", user.uid);
          const userSnapshot = await getDoc(userRef);

          if (!userSnapshot.exists()) {
            await signOut(auth);

            if (active) {
              setAuthorized(false);
              setRedirectPath("/login");
            }

            return;
          }

          const userData = userSnapshot.data();
          const role = userData.role;

          if (
            role !== "user" &&
            role !== "pharmacy" &&
            role !== "admin"
          ) {
            await signOut(auth);

            if (active) {
              setAuthorized(false);
              setRedirectPath("/login");
            }

            return;
          }

          // Verify pharmacy approval and ownership.
          if (role === "pharmacy") {
            if (
              userData.status !== "approved" ||
              !userData.pharmacyId
            ) {
              await signOut(auth);

              if (active) {
                setAuthorized(false);
                setRedirectPath("/login");
              }

              return;
            }

            const pharmacyRef = doc(
              db,
              "pharmacies",
              userData.pharmacyId
            );

            const pharmacySnapshot = await getDoc(pharmacyRef);

            if (!pharmacySnapshot.exists()) {
              await signOut(auth);

              if (active) {
                setAuthorized(false);
                setRedirectPath("/login");
              }

              return;
            }

            const pharmacyData = pharmacySnapshot.data();

            if (
              pharmacyData.ownerId !== user.uid ||
              pharmacyData.status !== "approved"
            ) {
              await signOut(auth);

              if (active) {
                setAuthorized(false);
                setRedirectPath("/login");
              }

              return;
            }

            localStorage.setItem(
              "pharmacyId",
              userData.pharmacyId
            );
          }

          // Update local session information.
          localStorage.setItem("isLogin", "true");
          localStorage.setItem("uid", user.uid);
          localStorage.setItem("userType", role);
          localStorage.setItem(
            "userName",
            userData.name || ""
          );
          localStorage.setItem(
            "userEmail",
            user.email || ""
          );

          if (role !== allowedRole) {
            const dashboardRoutes = {
              user: "/",
              pharmacy: "/pharmacy-dashboard",
              admin: "/admin-dashboard"
            };

            if (active) {
              setAuthorized(false);
              setRedirectPath(dashboardRoutes[role]);
            }

            return;
          }

          if (active) {
            setAuthorized(true);
            setRedirectPath("");
          }

        } catch (err) {
          console.error("Protected route error:", err);

          if (active) {
            setAuthorized(false);
            setError(
              "Unable to verify your account. Please try again."
            );
          }
        } finally {
          if (active) {
            setLoading(false);
          }
        }
      }
    );

    return () => {
      active = false;
      unsubscribe();
    };
  }, [allowedRole]);

  if (loading) {
    return (
      <div className="admin-loading">
        Verifying your account...
      </div>
    );
  }

  if (error) {
    return (
      <div className="pharmacy-profile-page">
        <div className="pharmacy-profile-container">
          <div className="pharmacy-profile-message error">
            {error}
          </div>

          <button
            onClick={() => window.location.reload()}
            className="pharmacy-save-btn"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!authorized) {
    return (
      <Navigate
        to={redirectPath || "/login"}
        replace
      />
    );
  }

  return <Outlet />;
}

export default ProtectedRoute;