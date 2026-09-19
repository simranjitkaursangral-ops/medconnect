import { useEffect, useState } from "react";
import {
  collection,
  doc,
  getDoc,
  getDocs
} from "firebase/firestore";
import { db } from "../../firebase/Firebase";
import { Link, useNavigate } from "react-router-dom";

function PharmacyDashboard() {
  const navigate = useNavigate();

  const [pharmacy, setPharmacy] = useState(null);
  const [stats, setStats] = useState({
    medicines: 0,
    availableMedicines: 0,
    requests: 0,
    prescriptions: 0
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      setError("");

      const uid = localStorage.getItem("uid");
      const pharmacyId =
        localStorage.getItem("pharmacyId");

      const userType =
        localStorage.getItem("userType");

      if (
        !uid ||
        userType !== "pharmacy"
      ) {
        navigate("/login");
        return;
      }

      const userSnapshot = await getDoc(
        doc(db, "users", uid)
      );

      if (!userSnapshot.exists()) {
        localStorage.clear();
        navigate("/login");
        return;
      }

      const userData =
        userSnapshot.data();

      if (
        userData.role !== "pharmacy" ||
        userData.status !== "approved"
      ) {
        localStorage.clear();
        navigate("/login");
        return;
      }

      if (!userData.pharmacyId) {
        setError(
          "Pharmacy information is incomplete."
        );
        return;
      }

      const actualPharmacyId =
        userData.pharmacyId;

      const pharmacySnapshot =
        await getDoc(
          doc(
            db,
            "pharmacies",
            actualPharmacyId
          )
        );

      if (!pharmacySnapshot.exists()) {
        setError(
          "Pharmacy profile was not found."
        );
        return;
      }

      const pharmacyData =
        pharmacySnapshot.data();

      if (
        pharmacyData.ownerId !== uid ||
        pharmacyData.status !== "approved"
      ) {
        localStorage.clear();
        navigate("/login");
        return;
      }

      setPharmacy({
        id: pharmacySnapshot.id,
        ...pharmacyData
      });

      localStorage.setItem(
        "pharmacyId",
        actualPharmacyId
      );

      const medicinesSnapshot =
        await getDocs(
          collection(db, "medicines")
        );

      const ownMedicines =
        medicinesSnapshot.docs
          .map((item) => ({
            id: item.id,
            ...item.data()
          }))
          .filter(
            (item) =>
              item.pharmacyId ===
              actualPharmacyId
          );

      const requestsSnapshot =
        await getDocs(
          collection(
            db,
            "medicineRequests"
          )
        );

      const ownRequests =
        requestsSnapshot.docs
          .map((item) => ({
            id: item.id,
            ...item.data()
          }))
          .filter(
            (item) =>
              item.pharmacyId ===
              actualPharmacyId
          );

      const prescriptionsSnapshot =
        await getDocs(
          collection(
            db,
            "prescriptions"
          )
        );

      const ownPrescriptions =
        prescriptionsSnapshot.docs
          .map((item) => ({
            id: item.id,
            ...item.data()
          }))
          .filter(
            (item) =>
              item.pharmacyId ===
              actualPharmacyId
          );

      const availableMedicines =
        ownMedicines.filter(
          (item) =>
            item.available === true ||
            Number(item.quantity) > 0
        );

      setStats({
        medicines:
          ownMedicines.length,

        availableMedicines:
          availableMedicines.length,

        requests:
          ownRequests.filter(
            (item) =>
              item.status === "pending"
          ).length,

        prescriptions:
          ownPrescriptions.filter(
            (item) =>
              item.status === "Pending" ||
              item.status === "pending"
          ).length
      });

    } catch (err) {
      console.error(
        "PHARMACY DASHBOARD ERROR:",
        err
      );

      setError(
        err.message ||
        "Unable to load pharmacy dashboard."
      );
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="admin-loading">

        <div className="loading-spinner"></div>

        <h3>
          Loading pharmacy dashboard...
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
              PHARMACY PARTNER
            </span>

            <h1>
              Welcome,{" "}
              {pharmacy?.ownerName ||
                "Pharmacy Partner"}
            </h1>

            <p>
              Manage your pharmacy,
              medicines, requests and
              prescriptions from one place.
            </p>

          </div>

          <Link
            to="/pharmacy-profile"
            className="admin-dashboard-action"
          >
            My Pharmacy
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
              💊
            </div>

            <div>
              <span>
                Total Medicines
              </span>

              <strong>
                {stats.medicines}
              </strong>
            </div>

          </div>

          <div className="admin-stat-card">

            <div className="admin-stat-icon">
              ✓
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
                {stats.requests}
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
                {stats.prescriptions}
              </strong>
            </div>

          </div>

        </div>

        <div className="admin-form-container">

          <div className="admin-form-card">

            <div className="admin-form-header">

              <div className="admin-form-icon">
                🏥
              </div>

              <div>

                <h2>
                  Pharmacy Operations
                </h2>

                <p>
                  Manage your pharmacy
                  operations.
                </p>

              </div>

            </div>

            <div className="application-list">

              <div className="application-card">

                <div className="application-card-header">

                  <div>

                    <span className="application-label">
                      MEDICINE INVENTORY
                    </span>

                    <h3>
                      Manage Medicines
                    </h3>

                  </div>

                </div>

                <div className="application-details">

                  <div>
                    <span>
                      Total Medicines
                    </span>

                    <strong>
                      {stats.medicines}
                    </strong>
                  </div>

                  <div>
                    <span>
                      Available
                    </span>

                    <strong>
                      {stats.availableMedicines}
                    </strong>
                  </div>

                </div>

                <div className="application-actions">

                  <Link
                    to="/pharmacy-medicines"
                    className="application-approve-btn"
                  >
                    Manage Medicines
                  </Link>

                  <Link
                    to="/pharmacy-add-medicine"
                    className="application-dashboard-action"
                  >
                    Add Medicine
                  </Link>

                </div>

              </div>

              <div className="application-card">

                <div className="application-card-header">

                  <div>

                    <span className="application-label">
                      MEDICINE REQUESTS
                    </span>

                    <h3>
                      Customer Requests
                    </h3>

                  </div>

                </div>

                <div className="application-details">

                  <div>
                    <span>
                      Pending Requests
                    </span>

                    <strong>
                      {stats.requests}
                    </strong>
                  </div>

                </div>

                <div className="application-actions">

                  <Link
                    to="/pharmacy-requests"
                    className="application-approve-btn"
                  >
                    View Requests
                  </Link>

                </div>

              </div>

              <div className="application-card">

                <div className="application-card-header">

                  <div>

                    <span className="application-label">
                      PRESCRIPTIONS
                    </span>

                    <h3>
                      Customer Prescriptions
                    </h3>

                  </div>

                </div>

                <div className="application-details">

                  <div>
                    <span>
                      Pending Prescriptions
                    </span>

                    <strong>
                      {stats.prescriptions}
                    </strong>
                  </div>

                </div>

                <div className="application-actions">

                  <Link
                    to="/pharmacy-prescriptions"
                    className="application-approve-btn"
                  >
                    View Prescriptions
                  </Link>

                </div>

              </div>

            </div>

          </div>

        </div>

      </div>

    </div>
  );
}

export default PharmacyDashboard;