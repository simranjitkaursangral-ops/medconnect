import { Navigate, Outlet } from "react-router-dom";

function ProtectedRoute({ allowedRole }) {
  const isLogin =
    localStorage.getItem("isLogin") === "true";

  const uid =
    localStorage.getItem("uid");

  const userType =
    localStorage.getItem("userType");

  if (!isLogin || !uid || !userType) {
    return (
      <Navigate
        to="/login"
        replace
      />
    );
  }

  if (userType !== allowedRole) {

    if (userType === "admin") {
      return (
        <Navigate
          to="/admin-dashboard"
          replace
        />
      );
    }

    if (userType === "pharmacy") {
      return (
        <Navigate
          to="/pharmacy-dashboard"
          replace
        />
      );
    }

    return (
      <Navigate
        to="/"
        replace
      />
    );
  }

  return <Outlet />;
}

export default ProtectedRoute;