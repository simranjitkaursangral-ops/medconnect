import { useEffect, useState } from "react";
import {
  collection,
  deleteDoc,
  doc,
  getDocs
} from "firebase/firestore";
import { db } from "../../firebase/Firebase";
import { Link, useNavigate } from "react-router-dom";

function MedicineList() {
  const navigate = useNavigate();

  const [medicines, setMedicines] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    loadMedicines();
  }, []);

  const loadMedicines = async () => {
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
        userType !== "pharmacy" ||
        !pharmacyId
      ) {
        navigate("/login");
        return;
      }

      const userSnapshot = await getDocs(
        collection(db, "users")
      );

      const currentUser =
        userSnapshot.docs.find(
          (item) => item.id === uid
        );

      if (!currentUser) {
        localStorage.clear();
        navigate("/login");
        return;
      }

      const userData =
        currentUser.data();

      if (
        userData.role !== "pharmacy" ||
        userData.status !== "approved" ||
        userData.pharmacyId !== pharmacyId
      ) {
        localStorage.clear();
        navigate("/login");
        return;
      }

      const pharmacySnapshot =
        await getDocs(
          collection(db, "pharmacies")
        );

      const pharmacy =
        pharmacySnapshot.docs.find(
          (item) => item.id === pharmacyId
        );

      if (!pharmacy) {
        setError(
          "Pharmacy profile not found."
        );
        return;
      }

      const pharmacyData =
        pharmacy.data();

      if (
        pharmacyData.ownerId !== uid ||
        pharmacyData.status !== "approved"
      ) {
        localStorage.clear();
        navigate("/login");
        return;
      }

      const medicineSnapshot =
        await getDocs(
          collection(db, "medicines")
        );

      const data =
        medicineSnapshot.docs
          .map((item) => ({
            id: item.id,
            ...item.data()
          }))
          .filter(
            (item) =>
              item.pharmacyId === pharmacyId
          );

      data.sort((a, b) => {
        const aTime =
          a.createdAt?.seconds || 0;

        const bTime =
          b.createdAt?.seconds || 0;

        return bTime - aTime;
      });

      setMedicines(data);

    } catch (err) {
      console.error(
        "LOAD MEDICINES ERROR:",
        err
      );

      setError(
        err.message ||
        "Unable to load medicines."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (medicine) => {
    const confirmed =
      window.confirm(
        `Are you sure you want to delete ${medicine.medicineName || "this medicine"}?`
      );

    if (!confirmed) {
      return;
    }

    try {
      setDeletingId(medicine.id);
      setError("");

      const pharmacyId =
        localStorage.getItem("pharmacyId");

      if (
        medicine.pharmacyId !== pharmacyId
      ) {
        setError(
          "You cannot delete this medicine."
        );

        return;
      }

      await deleteDoc(
        doc(
          db,
          "medicines",
          medicine.id
        )
      );

      setMedicines((previous) =>
        previous.filter(
          (item) =>
            item.id !== medicine.id
        )
      );

    } catch (err) {
      console.error(
        "DELETE MEDICINE ERROR:",
        err
      );

      setError(
        err.message ||
        "Unable to delete medicine."
      );
    } finally {
      setDeletingId("");
    }
  };

  const filteredMedicines =
    medicines.filter((medicine) => {
      const value =
        search.trim().toLowerCase();

      if (!value) {
        return true;
      }

      return (
        (
          medicine.medicineName ||
          ""
        )
          .toLowerCase()
          .includes(value) ||
        (
          medicine.category ||
          ""
        )
          .toLowerCase()
          .includes(value) ||
        (
          medicine.dosage ||
          ""
        )
          .toLowerCase()
          .includes(value)
      );
    });

  const availableCount =
    medicines.filter(
      (medicine) =>
        medicine.available === true ||
        Number(medicine.quantity) > 0
    ).length;

  const outOfStockCount =
    medicines.length -
    availableCount;

  if (loading) {
    return (
      <div className="admin-loading">

        <div className="loading-spinner"></div>

        <h3>
          Loading medicines...
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
              MEDICINE INVENTORY
            </span>

            <h1>
              Manage Medicines
            </h1>

            <p>
              Add, update and manage medicines
              available at your pharmacy.
            </p>

          </div>

          <Link
            to="/pharmacy-add-medicine"
            className="admin-dashboard-action"
          >
            + Add Medicine
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
                {medicines.length}
              </strong>
            </div>

          </div>

          <div className="admin-stat-card">

            <div className="admin-stat-icon">
              ✓
            </div>

            <div>
              <span>
                Available
              </span>

              <strong>
                {availableCount}
              </strong>
            </div>

          </div>

          <div className="admin-stat-card">

            <div className="admin-stat-icon">
              ⚠️
            </div>

            <div>
              <span>
                Out of Stock
              </span>

              <strong>
                {outOfStockCount}
              </strong>
            </div>

          </div>

        </div>

        <div className="admin-form-container">

          <div className="admin-form-card">

            <div className="admin-form-header">

              <div className="admin-form-icon">
                💊
              </div>

              <div>

                <h2>
                  Your Medicine Inventory
                </h2>

                <p>
                  You can only manage medicines
                  belonging to your pharmacy.
                </p>

              </div>

            </div>

            <div className="admin-user-toolbar">

              <div className="admin-user-search">

                <input
                  type="text"
                  placeholder="Search medicine, category or dosage..."
                  value={search}
                  onChange={(e) =>
                    setSearch(e.target.value)
                  }
                />

              </div>

            </div>

            {filteredMedicines.length === 0 ? (

              <div className="application-empty">

                <div>
                  💊
                </div>

                <h3>
                  No medicines found
                </h3>

                <p>
                  {medicines.length === 0
                    ? "Start adding medicines to your pharmacy inventory."
                    : "Try another search term."}
                </p>

                {medicines.length === 0 && (
                  <div className="application-actions">

                    <Link
                      to="/pharmacy-add-medicine"
                      className="application-approve-btn"
                    >
                      Add First Medicine
                    </Link>

                  </div>
                )}

              </div>

            ) : (

              <div className="application-list">

                {filteredMedicines.map(
                  (medicine) => {

                    const quantity =
                      Number(
                        medicine.quantity || 0
                      );

                    const isAvailable =
                      medicine.available === true ||
                      quantity > 0;

                    return (
                      <div
                        className="application-card"
                        key={medicine.id}
                      >

                        <div className="application-card-header">

                          <div>

                            <span className="application-label">
                              MEDICINE
                            </span>

                            <h3>
                              {medicine.medicineName ||
                                "Unnamed Medicine"}
                            </h3>

                          </div>

                          <span
                            className={`application-status ${
                              isAvailable
                                ? "approved"
                                : "suspended"
                            }`}
                          >
                            {isAvailable
                              ? "Available"
                              : "Out of Stock"}
                          </span>

                        </div>

                        <div className="application-details">

                          <div>

                            <span>
                              Category
                            </span>

                            <strong>
                              {medicine.category ||
                                "Not provided"}
                            </strong>

                          </div>

                          <div>

                            <span>
                              Dosage
                            </span>

                            <strong>
                              {medicine.dosage ||
                                "Not provided"}
                            </strong>

                          </div>

                          <div>

                            <span>
                              Quantity
                            </span>

                            <strong>
                              {quantity}
                            </strong>

                          </div>

                          <div>

                            <span>
                              Price
                            </span>

                            <strong>
                              ₹
                              {medicine.price ||
                                "0"}
                            </strong>

                          </div>

                          <div className="application-address">

                            <span>
                              Description
                            </span>

                            <strong>
                              {medicine.description ||
                                "No description provided."}
                            </strong>

                          </div>

                        </div>

                        <div className="application-actions">

                          <Link
                            to={`/pharmacy-update-stock/${medicine.id}`}
                            className="application-approve-btn"
                          >
                            Update
                          </Link>

                          <button
                            type="button"
                            className="application-reject-btn"
                            disabled={
                              deletingId ===
                              medicine.id
                            }
                            onClick={() =>
                              handleDelete(
                                medicine
                              )
                            }
                          >
                            {deletingId ===
                            medicine.id
                              ? "Deleting..."
                              : "Delete"}
                          </button>

                        </div>

                      </div>
                    );
                  }
                )}

              </div>

            )}

          </div>

        </div>

      </div>

    </div>
  );
}

export default MedicineList;