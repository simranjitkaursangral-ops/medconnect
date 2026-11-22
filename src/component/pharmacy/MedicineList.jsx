import { useEffect, useState } from "react";

import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  where
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


  // LOAD MEDICINES

  const loadMedicines = async () => {

    try {

      setLoading(true);

      setError("");


      const uid = localStorage.getItem("uid");

      const pharmacyId = localStorage.getItem("pharmacyId");

      const userType = localStorage.getItem("userType");


      if (!uid || userType !== "pharmacy" || !pharmacyId) {

        navigate("/login");

        return;

      }


      // GET CURRENT USER

      const userRef = doc(db, "users", uid);

      const userSnapshot = await getDoc(userRef);


      if (!userSnapshot.exists()) {

        setError("User profile not found.");

        return;

      }


      const userData = userSnapshot.data();


      if (
        userData.role !== "pharmacy" ||
        userData.pharmacyId !== pharmacyId ||
        userData.status !== "approved"
      ) {

        setError("Invalid or unapproved pharmacy account.");

        return;

      }


      // GET PHARMACY

      const pharmacyRef = doc(db, "pharmacies", pharmacyId);

      const pharmacySnapshot = await getDoc(pharmacyRef);


      if (!pharmacySnapshot.exists()) {

        setError("Pharmacy profile not found.");

        return;

      }


      const pharmacyData = pharmacySnapshot.data();


      if (
        pharmacyData.ownerId !== uid ||
        pharmacyData.status !== "approved"
      ) {

        setError("You are not authorized to manage this pharmacy.");

        return;

      }


      // GET PHARMACY MEDICINES

      const medicineQuery = query(

        collection(db, "medicines"),

        where("pharmacyId", "==", pharmacyId)

      );


      const medicineSnapshot = await getDocs(medicineQuery);


      const data = medicineSnapshot.docs.map((item) => ({

        id: item.id,

        ...item.data()

      }));


      // SORT MEDICINES

      data.sort((a, b) => {

        const aTime = a.createdAt?.seconds || 0;

        const bTime = b.createdAt?.seconds || 0;

        return bTime - aTime;

      });


      setMedicines(data);


    } catch (err) {

      console.error("LOAD MEDICINES ERROR:", err);

      setError(err.message || "Unable to load medicines.");

    } finally {

      setLoading(false);

    }

  };


  // DELETE MEDICINE

  const handleDelete = async (medicine) => {

    const confirmed = window.confirm(

      `Are you sure you want to delete ${medicine.medicineName || "this medicine"}?`

    );


    if (!confirmed) {

      return;

    }


    try {

      setDeletingId(medicine.id);

      setError("");


      const uid = localStorage.getItem("uid");

      const pharmacyId = localStorage.getItem("pharmacyId");


      if (
        !uid ||
        localStorage.getItem("userType") !== "pharmacy" ||
        medicine.pharmacyId !== pharmacyId
      ) {

        setError("You cannot delete this medicine.");

        return;

      }


      // VERIFY OWNERSHIP AGAIN

      const pharmacySnapshot = await getDoc(

        doc(db, "pharmacies", pharmacyId)

      );


      if (
        !pharmacySnapshot.exists() ||
        pharmacySnapshot.data().ownerId !== uid ||
        pharmacySnapshot.data().status !== "approved"
      ) {

        setError("You are not authorized to delete this medicine.");

        return;

      }


      await deleteDoc(

        doc(db, "medicines", medicine.id)

      );


      setMedicines((previous) =>

        previous.filter((item) => item.id !== medicine.id)

      );


    } catch (err) {

      console.error("DELETE MEDICINE ERROR:", err);

      setError(err.message || "Unable to delete medicine.");

    } finally {

      setDeletingId("");

    }

  };


  // SEARCH MEDICINES

  const filteredMedicines = medicines.filter((medicine) => {

    const value = search.trim().toLowerCase();


    if (!value) {

      return true;

    }


    return (

      (medicine.medicineName || "").toLowerCase().includes(value) ||

      (medicine.category || "").toLowerCase().includes(value) ||

      (medicine.dosage || "").toLowerCase().includes(value)

    );

  });


  // STOCK COUNTS

  const availableCount = medicines.filter(

    (medicine) => Number(medicine.quantity) > 0

  ).length;


  const outOfStockCount = medicines.length - availableCount;


  // STOCK VERIFICATION STATUS

  const getStockVerification = (medicine) => {

    const quantity = Number(medicine.quantity || 0);

    if (quantity <= 0) {

      return {

        label: "Out of Stock",

        className: "stock-unavailable",

        date: "No available stock"

      };

    }


    const stockTimestamp =

      medicine.stockVerifiedAt ||

      medicine.stockUpdatedAt ||

      medicine.updatedAt;


    if (!stockTimestamp) {

      return {

        label: "Needs Confirmation",

        className: "stock-stale",

        date: "Verification date unavailable"

      };

    }


    const stockDate =

      typeof stockTimestamp.toDate === "function"

        ? stockTimestamp.toDate()

        : new Date(stockTimestamp);


    if (Number.isNaN(stockDate.getTime())) {

      return {

        label: "Needs Confirmation",

        className: "stock-stale",

        date: "Verification date unavailable"

      };

    }


    const hoursDifference =

      (Date.now() - stockDate.getTime()) / (1000 * 60 * 60);


    if (hoursDifference <= 24 && hoursDifference >= 0) {

      return {

        label: "Recently Verified",

        className: "stock-fresh",

        date: stockDate.toLocaleString("en-IN", {

          dateStyle: "medium",

          timeStyle: "short"

        })

      };

    }


    return {

      label: "Needs Confirmation",

      className: "stock-stale",

      date: stockDate.toLocaleString("en-IN", {

        dateStyle: "medium",

        timeStyle: "short"

      })

    };

  };


  if (loading) {

    return (

      <div className="admin-loading">

        <div className="loading-spinner"></div>

        <h3>Loading medicines...</h3>

      </div>

    );

  }


  return (

    <div className="admin-page">


      <div className="admin-page-container">


        {/* HERO SECTION */}

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


        {/* ERROR */}

        {error && (

          <div className="form-error">

            {error}

          </div>

        )}


        {/* DASHBOARD STATS */}

        <div className="admin-dashboard-stats">


          <div className="admin-stat-card">

            <div className="admin-stat-icon">

              💊

            </div>

            <div>

              <span>Total Medicines</span>

              <strong>{medicines.length}</strong>

            </div>

          </div>


          <div className="admin-stat-card">

            <div className="admin-stat-icon">

              ✓

            </div>

            <div>

              <span>Available</span>

              <strong>{availableCount}</strong>

            </div>

          </div>


          <div className="admin-stat-card">

            <div className="admin-stat-icon">

              ⚠️

            </div>

            <div>

              <span>Out of Stock</span>

              <strong>{outOfStockCount}</strong>

            </div>

          </div>


        </div>


        {/* MEDICINE INVENTORY */}

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


            {/* SEARCH */}

            <div className="admin-user-toolbar">


              <div className="admin-user-search">


                <input

                  type="text"

                  placeholder="Search medicine, category or dosage..."

                  value={search}

                  onChange={(e) => setSearch(e.target.value)}

                />


              </div>


            </div>


            {/* EMPTY STATE */}

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


              // MEDICINE LIST

              <div className="application-list">


                {filteredMedicines.map((medicine) => {


                  const quantity = Number(medicine.quantity || 0);


                  const isAvailable = quantity > 0;


                  const stockStatus = getStockVerification(medicine);


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

                            {medicine.medicineName || "Unnamed Medicine"}

                          </h3>


                        </div>


                        <span

                          className={`application-status ${

                            isAvailable ? "approved" : "suspended"

                          }`}

                        >

                          {isAvailable ? "Available" : "Out of Stock"}

                        </span>


                      </div>


                      <div className="application-details">


                        <div>

                          <span>Category</span>

                          <strong>

                            {medicine.category || "Not provided"}

                          </strong>

                        </div>


                        <div>

                          <span>Dosage</span>

                          <strong>

                            {medicine.dosage || "Not provided"}

                          </strong>

                        </div>


                        <div>

                          <span>Quantity</span>

                          <strong>{quantity}</strong>

                        </div>


                        <div>

                          <span>Price</span>

                          <strong>

                            ₹{medicine.price || "0"}

                          </strong>

                        </div>


                        <div className="application-address">

                          <span>Description</span>

                          <strong>

                            {medicine.description ||

                              "No description provided."}

                          </strong>

                        </div>


                      </div>


                      {/* STOCK VERIFICATION */}

                      <div className="medicine-stock-verification">


                        <div className="medicine-stock-heading">

                          <span className="medicine-stock-label">

                            STOCK VERIFICATION

                          </span>


                          <span className={`stock-verification-badge ${stockStatus.className}`}>

                            {stockStatus.label}

                          </span>

                        </div>


                        <p>

                          Last updated: {stockStatus.date}

                        </p>


                      </div>


                      {/* ACTIONS */}

                      <div className="application-actions">


                        <Link

                          to={`/pharmacy-update-stock/${medicine.id}`}

                          className="application-approve-btn"

                        >

                          Update Stock

                        </Link>


                        <button

                          type="button"

                          className="application-reject-btn"

                          disabled={deletingId === medicine.id}

                          onClick={() => handleDelete(medicine)}

                        >

                          {deletingId === medicine.id

                            ? "Deleting..."

                            : "Delete"}

                        </button>


                      </div>


                    </div>

                  );

                })}


              </div>


            )}


          </div>


        </div>


      </div>


    </div>

  );

}


export default MedicineList;