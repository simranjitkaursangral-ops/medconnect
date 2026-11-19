import { useEffect, useState } from "react";
import {
    collection,
    doc,
    getDoc,
    getDocs,
    query,
    where
} from "firebase/firestore";

import { auth, db } from "../../firebase/Firebase";
import { useNavigate } from "react-router-dom";


function PharmacyDashboard() {
    const navigate = useNavigate();

    const [pharmacyName, setPharmacyName] = useState("Pharmacy");
    const [stats, setStats] = useState({
        totalMedicines: 0,
        availableMedicines: 0,
        outOfStock: 0,
        totalStock: 0
    });

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        fetchDashboardData();
    }, []);

    const fetchDashboardData = async () => {
        try {
            setLoading(true);
            setError("");

            const user = auth.currentUser;

            if (!user) {
                navigate("/login");
                return;
            }

            // Get logged-in user details
            const userRef = doc(db, "users", user.uid);
            const userSnap = await getDoc(userRef);

            if (!userSnap.exists()) {
                setError("User information not found.");
                return;
            }

            const userData = userSnap.data();

            if (userData.role !== "pharmacy" || userData.status !== "approved") {
                setError("You are not authorized to access this dashboard.");
                return;
            }

            const pharmacyId = userData.pharmacyId;

            if (!pharmacyId) {
                setError("Pharmacy information is missing.");
                return;
            }

            // Get pharmacy details
            const pharmacyRef = doc(db, "pharmacies", pharmacyId);
            const pharmacySnap = await getDoc(pharmacyRef);

            if (!pharmacySnap.exists()) {
                setError("Pharmacy profile not found.");
                return;
            }

            const pharmacyData = pharmacySnap.data();

            if (pharmacyData.ownerId !== user.uid) {
                setError("You are not authorized to access this pharmacy.");
                return;
            }

            setPharmacyName(
                pharmacyData.name ||
                pharmacyData.pharmacyName ||
                userData.name ||
                "Pharmacy"
            );

            // Get medicines belonging to this pharmacy
            const medicineQuery = query(
                collection(db, "medicines"),
                where("pharmacyId", "==", pharmacyId)
            );

            const medicineSnapshot = await getDocs(medicineQuery);

            let total = 0;
            let available = 0;
            let outOfStock = 0;
            let stock = 0;

            medicineSnapshot.forEach((medicineDoc) => {
                const medicine = medicineDoc.data();

                total++;

                const quantity = Number(medicine.quantity || 0);
                stock += quantity;

                if (
                    medicine.availability === "Available" &&
                    quantity > 0
                ) {
                    available++;
                } else {
                    outOfStock++;
                }
            });

            setStats({
                totalMedicines: total,
                availableMedicines: available,
                outOfStock,
                totalStock: stock
            });

        } catch (err) {
            console.error("Dashboard error:", err);

            setError(
                "Unable to load dashboard information. Please try again."
            );
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="pharmacy-dashboard">

            {/* Welcome Section */}
            <section className="dashboard-welcome">

                <div className="welcome-content">
                    <span className="welcome-label">
                        Pharmacy Dashboard
                    </span>

                    <h1>
                        Welcome, {pharmacyName}
                    </h1>

                    <p>
                        Manage your medicine inventory and keep your
                        pharmacy information up to date.
                    </p>

                    <div className="welcome-buttons">
                        <button
                            className="primary-dashboard-btn"
                            onClick={() => navigate("/pharmacy-add-medicine")}
                        >
                            + Add Medicine
                        </button>

                        <button
                            className="secondary-dashboard-btn"
                            onClick={() => navigate("/pharmacy/profile")}
                        >
                            View Profile
                        </button>
                    </div>
                </div>

            </section>


            {/* Inventory Overview */}
            <section className="dashboard-inventory">

                <div className="dashboard-section-heading">
                    <div>
                        <h2>Inventory Overview</h2>
                        <p>
                            A summary of your pharmacy's medicine stock.
                        </p>
                    </div>

                    <button
                        className="view-medicines-btn"
                        onClick={() => navigate("/pharmacy-medicines")}
                    >
                        View All Medicines
                    </button>
                </div>


                {loading ? (
                    <div className="dashboard-message">
                        Loading dashboard information...
                    </div>
                ) : error ? (
                    <div className="dashboard-error">
                        {error}
                    </div>
                ) : (
                    <div className="dashboard-stats">

                        <div className="dashboard-stat-card">
                            <p>Total Medicines</p>
                            <h3>{stats.totalMedicines}</h3>
                            <span>Medicines in your inventory</span>
                        </div>

                        <div className="dashboard-stat-card">
                            <p>Available Medicines</p>
                            <h3>{stats.availableMedicines}</h3>
                            <span>Currently available</span>
                        </div>

                        <div className="dashboard-stat-card">
                            <p>Out of Stock</p>
                            <h3>{stats.outOfStock}</h3>
                            <span>Currently unavailable</span>
                        </div>

                        <div className="dashboard-stat-card">
                            <p>Total Stock Units</p>
                            <h3>{stats.totalStock}</h3>
                            <span>Total quantity in stock</span>
                        </div>

                    </div>
                )}

            </section>


            {/* Quick Access */}
            <section className="dashboard-quick-access">

                <div className="dashboard-section-heading">
                    <div>
                        <h2>Quick Access</h2>
                        <p>
                            Manage your pharmacy activities.
                        </p>
                    </div>
                </div>


                <div className="dashboard-actions">

                    <button
                        className="dashboard-action-card"
                        onClick={() => navigate("/pharmacy-add-medicine")}
                    >
                        <div>
                            <h3>Add Medicine</h3>
                            <p>Add new medicines to your inventory.</p>
                        </div>
                        <span>→</span>
                    </button>


                    <button
                        className="dashboard-action-card"
                        onClick={() => navigate("/pharmacy-medicines")}
                    >
                        <div>
                            <h3>Manage Medicines</h3>
                            <p>Update prices, quantity and availability.</p>
                        </div>
                        <span>→</span>
                    </button>


                    <button
                        className="dashboard-action-card"
                        onClick={() => navigate("/pharmacy-requests")}
                    >
                        <div>
                            <h3>Medicine Requests</h3>
                            <p>Check and manage customer requests.</p>
                        </div>
                        <span>→</span>
                    </button>


                    <button
                        className="dashboard-action-card"
                        onClick={() => navigate("/pharmacy-prescriptions")}
                    >
                        <div>
                            <h3>Prescriptions</h3>
                            <p>View customer prescription details.</p>
                        </div>
                        <span>→</span>
                    </button>

                </div>

            </section>

        </div>
    );
}

export default PharmacyDashboard;