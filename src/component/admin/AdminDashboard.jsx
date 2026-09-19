import { useEffect, useState } from "react";
import {
  collection,
  getDocs
} from "firebase/firestore";
import { db } from "../../firebase/Firebase";
import { Link } from "react-router-dom";

function AdminDashboard() {
  const [admin, setAdmin] = useState(null);

  const [stats, setStats] = useState({
    totalUsers: 0,
    totalPharmacies: 0,
    pendingPharmacies: 0,
    approvedPharmacies: 0,
    totalMedicines: 0,
    availableMedicines: 0,
    pendingRequests: 0,
    pendingPrescriptions: 0
  });

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        const userId =
          localStorage.getItem("uid");

        if (!userId) {
          throw new Error(
            "Admin login required."
          );
        }

        const usersSnapshot =
          await getDocs(
            collection(db, "users")
          );

        const currentAdmin =
          usersSnapshot.docs.find(
            (item) =>
              item.id === userId
          );

        if (!currentAdmin) {
          throw new Error(
            "Admin profile not found."
          );
        }

        const adminData =
          currentAdmin.data();

        if (
          adminData.role !== "admin"
        ) {
          throw new Error(
            "You are not authorized to access the admin dashboard."
          );
        }

        setAdmin(adminData);

        const users =
          usersSnapshot.docs.map(
            (item) => ({
              id: item.id,
              ...item.data()
            })
          );

        const pharmaciesSnapshot =
          await getDocs(
            collection(
              db,
              "pharmacies"
            )
          );

        const pharmacies =
          pharmaciesSnapshot.docs.map(
            (item) => ({
              id: item.id,
              ...item.data()
            })
          );

        const medicinesSnapshot =
          await getDocs(
            collection(
              db,
              "medicines"
            )
          );

        const medicines =
          medicinesSnapshot.docs.map(
            (item) => ({
              id: item.id,
              ...item.data()
            })
          );

        const requestsSnapshot =
          await getDocs(
            collection(
              db,
              "medicineRequests"
            )
          );

        const requests =
          requestsSnapshot.docs.map(
            (item) => ({
              id: item.id,
              ...item.data()
            })
          );

        const prescriptionsSnapshot =
          await getDocs(
            collection(
              db,
              "prescriptions"
            )
          );

        const prescriptions =
          prescriptionsSnapshot.docs.map(
            (item) => ({
              id: item.id,
              ...item.data()
            })
          );

        const totalUsers =
          users.filter(
            (user) =>
              user.role === "user"
          ).length;

        const totalPharmacies =
          pharmacies.length;

        const pendingPharmacies =
          pharmacies.filter(
            (pharmacy) =>
              pharmacy.status ===
              "pending"
          ).length;

        const approvedPharmacies =
          pharmacies.filter(
            (pharmacy) =>
              pharmacy.status ===
              "approved"
          ).length;

        const availableMedicines =
          medicines.filter(
            (medicine) =>
              Number(
                medicine.quantity
              ) > 0 &&
              medicine.availability !==
                "Out of Stock"
          ).length;

        const pendingRequests =
          requests.filter(
            (request) =>
              request.status ===
              "Pending"
          ).length;

        const pendingPrescriptions =
          prescriptions.filter(
            (prescription) =>
              prescription.status ===
              "Pending"
          ).length;

        setStats({
          totalUsers,
          totalPharmacies,
          pendingPharmacies,
          approvedPharmacies,
          totalMedicines:
            medicines.length,
          availableMedicines,
          pendingRequests,
          pendingPrescriptions
        });

      } catch (err) {
        console.error(
          "ADMIN DASHBOARD ERROR:",
          err
        );

        setError(
          err.message ||
            "Unable to load dashboard."
        );
      } finally {
        setLoading(false);
      }
    };

    loadDashboard();
  }, []);

  if (loading) {
    return (
      <div className="admin-loading">

        <div className="loading-spinner"></div>

        <h3>
          Loading admin dashboard...
        </h3>

      </div>
    );
  }

  if (error) {
    return (
      <div className="admin-loading">

        <h3>
          {error}
        </h3>

        <Link to="/login">
          Login Again
        </Link>

      </div>
    );
  }

  return (
    <div className="admin-dashboard">

      <div className="admin-dashboard-container">

        <div className="admin-dashboard-header">

          <div>

            <span className="results-label">
              PLATFORM ADMIN
            </span>

            <h1>
              Welcome,{" "}
              {admin?.name ||
                "Administrator"}
            </h1>

            <p>
              Monitor and manage the
              MedConnect platform,
              pharmacies and customer
              accounts.
            </p>

          </div>

          <Link
            to="/admin-pharmacy-applications"
            className="admin-dashboard-action"
          >
            Review Applications
          </Link>

        </div>

        <div className="admin-dashboard-stats">

          <div className="admin-stat-card">

            <div className="admin-stat-icon">
              👥
            </div>

            <div>

              <span>
                Total Users
              </span>

              <strong>
                {stats.totalUsers}
              </strong>

            </div>

          </div>

          <div className="admin-stat-card">

            <div className="admin-stat-icon">
              🏥
            </div>

            <div>

              <span>
                Total Pharmacies
              </span>

              <strong>
                {stats.totalPharmacies}
              </strong>

            </div>

          </div>

          <div className="admin-stat-card">

            <div className="admin-stat-icon">
              ⏳
            </div>

            <div>

              <span>
                Pending Applications
              </span>

              <strong>
                {stats.pendingPharmacies}
              </strong>

            </div>

          </div>

          <div className="admin-stat-card">

            <div className="admin-stat-icon">
              ✓
            </div>

            <div>

              <span>
                Approved Pharmacies
              </span>

              <strong>
                {stats.approvedPharmacies}
              </strong>

            </div>

          </div>

          <div className="admin-stat-card">

            <div className="admin-stat-icon">
              💊
            </div>

            <div>

              <span>
                Total Medicines
              </span>

              <strong>
                {stats.totalMedicines}
              </strong>

            </div>

          </div>

          <div className="admin-stat-card">

            <div className="admin-stat-icon">
              📦
            </div>

            <div>

              <span>
                Available Medicines
              </span>

              <strong>
                {stats.availableMedicines}
              </strong>

            </div>

          </div>

          <div className="admin-stat-card">

            <div className="admin-stat-icon">
              📋
            </div>

            <div>

              <span>
                Pending Requests
              </span>

              <strong>
                {stats.pendingRequests}
              </strong>

            </div>

          </div>

          <div className="admin-stat-card">

            <div className="admin-stat-icon">
              📄
            </div>

            <div>

              <span>
                Pending Prescriptions
              </span>

              <strong>
                {stats.pendingPrescriptions}
              </strong>

            </div>

          </div>

        </div>

        <div className="admin-dashboard-pharmacy">

          <div>

            <span className="admin-pharmacy-label">
              PLATFORM OVERVIEW
            </span>

            <h2>
              MedConnect
            </h2>

            <p>
              Medicine Availability Finder
            </p>

            <p>
              The platform administrator
              oversees pharmacy verification,
              customer accounts and overall
              platform activity.
            </p>

          </div>

          <div className="admin-pharmacy-status">

            <span></span>

            Platform Active

          </div>

        </div>

        <div className="admin-dashboard-actions">

          <Link
            to="/admin-pharmacy-applications"
            className="admin-action-card"
          >

            <div>
              🏥
            </div>

            <h3>
              Pharmacy Applications
            </h3>

            <p>
              Review licence documents
              and approve or reject
              pharmacy partners.
            </p>

          </Link>

          <Link
            to="/admin-pharmacies"
            className="admin-action-card"
          >

            <div>
              🏪
            </div>

            <h3>
              Pharmacy Management
            </h3>

            <p>
              View registered pharmacies
              and manage their platform
              access.
            </p>

          </Link>

          <Link
            to="/admin-users"
            className="admin-action-card"
          >

            <div>
              👥
            </div>

            <h3>
              Customer Management
            </h3>

            <p>
              View customer accounts
              and manage their platform
              access.
            </p>

          </Link>

          <div
            className="admin-action-card"
          >

            <div>
              📊
            </div>

            <h3>
              Platform Monitoring
            </h3>

            <p>
              Monitor medicines, requests,
              prescriptions and overall
              platform activity.
            </p>

          </div>

        </div>

      </div>

    </div>
  );
}

export default AdminDashboard;