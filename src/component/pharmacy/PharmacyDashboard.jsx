import { useEffect, useState } from "react";

import {
    collection,
    doc,
    getDoc,
    getDocs,
    query,
    where,
    onSnapshot
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

    const [incomingRequests, setIncomingRequests] = useState([]);
    const [pendingRequests, setPendingRequests] = useState(0);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [requestLoading, setRequestLoading] = useState(true);

    useEffect(() => {
        let unsubscribeLegacy = null;
        let unsubscribeBroadcast = null;
        let active = true;

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

                if (
                    userData.role !== "pharmacy" ||
                    userData.status !== "approved"
                ) {
                    setError(
                        "You are not authorized to access this dashboard."
                    );
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
                    setError(
                        "You are not authorized to access this pharmacy."
                    );
                    return;
                }

                if (!active) return;

                setPharmacyName(
                    pharmacyData.name ||
                    pharmacyData.pharmacyName ||
                    userData.name ||
                    "Pharmacy"
                );

                // Get pharmacy medicines
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

                if (!active) return;

                setStats({
                    totalMedicines: total,
                    availableMedicines: available,
                    outOfStock,
                    totalStock: stock
                });

                // Listen to older single-pharmacy requests
                const legacyRequestQuery = query(
                    collection(db, "medicineRequests"),
                    where("pharmacyId", "==", pharmacyId)
                );

                unsubscribeLegacy = onSnapshot(
                    legacyRequestQuery,
                    (snapshot) => {
                        if (!active) return;

                        const legacyRequests = snapshot.docs.map((item) => ({
                            id: item.id,
                            ...item.data()
                        }));

                        updateIncomingRequests(
                            legacyRequests,
                            null
                        );
                    },
                    (err) => {
                        console.error(
                            "LEGACY REQUEST LISTENER ERROR:",
                            err
                        );
                    }
                );

                // Listen to multi-pharmacy broadcast requests
                const broadcastRequestQuery = query(
                    collection(db, "medicineRequests"),
                    where(
                        "targetPharmacyIds",
                        "array-contains",
                        pharmacyId
                    )
                );

                unsubscribeBroadcast = onSnapshot(
                    broadcastRequestQuery,
                    (snapshot) => {
                        if (!active) return;

                        const broadcastRequests = snapshot.docs.map(
                            (item) => ({
                                id: item.id,
                                ...item.data()
                            })
                        );

                        updateIncomingRequests(
                            null,
                            broadcastRequests
                        );
                    },
                    (err) => {
                        console.error(
                            "BROADCAST REQUEST LISTENER ERROR:",
                            err
                        );
                    }
                );

            } catch (err) {
                console.error("Dashboard error:", err);

                if (active) {
                    setError(
                        "Unable to load dashboard information. Please try again."
                    );
                }
            } finally {
                if (active) {
                    setLoading(false);
                }
            }
        };

        let legacyData = [];
        let broadcastData = [];

        const updateIncomingRequests = (
            legacy,
            broadcast
        ) => {
            if (legacy !== null) {
                legacyData = legacy;
            }

            if (broadcast !== null) {
                broadcastData = broadcast;
            }

            const combined = new Map();

            [...legacyData, ...broadcastData].forEach((request) => {
                combined.set(request.id, request);
            });

            const allRequests = Array.from(combined.values());

            allRequests.sort((a, b) => {
                const dateA =
                    a.createdAt?.toDate?.() || new Date(0);

                const dateB =
                    b.createdAt?.toDate?.() || new Date(0);

                return dateB - dateA;
            });

            setIncomingRequests(allRequests);

            setPendingRequests(
                allRequests.filter(
                    (request) =>
                        (request.status || "Pending") === "Pending"
                ).length
            );

            setRequestLoading(false);
        };

        fetchDashboardData();

        return () => {
            active = false;

            if (unsubscribeLegacy) {
                unsubscribeLegacy();
            }

            if (unsubscribeBroadcast) {
                unsubscribeBroadcast();
            }
        };

    }, [navigate]);

    const formatRequestDate = (timestamp) => {
        if (!timestamp?.toDate) {
            return "Recently";
        }

        return timestamp.toDate().toLocaleDateString("en-IN", {
            day: "numeric",
            month: "short"
        });
    };

    const getRequestStatusClass = (status) => {
        if (status === "Accepted") {
            return "dashboard-request-status accepted";
        }

        if (status === "Completed") {
            return "dashboard-request-status completed";
        }

        if (status === "Rejected") {
            return "dashboard-request-status rejected";
        }

        return "dashboard-request-status pending";
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
                            onClick={() =>
                                navigate("/pharmacy-add-medicine")
                            }
                        >
                            + Add Medicine
                        </button>

                        <button
                            className="secondary-dashboard-btn"
                            onClick={() =>
                                navigate("/pharmacy/profile")
                            }
                        >
                            View Profile
                        </button>

                    </div>

                </div>

                {/* Request notification indicator */}
                <div className="dashboard-notification-box">

                    <div className="dashboard-notification-icon">
                        ♢
                    </div>

                    <div>
                        <span>Pending Requests</span>

                        <strong>
                            {requestLoading ? "..." : pendingRequests}
                        </strong>

                        <p>
                            Requests waiting for your response
                        </p>
                    </div>

                    {pendingRequests > 0 && (
                        <span className="notification-indicator"></span>
                    )}

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
                        onClick={() =>
                            navigate("/pharmacy-medicines")
                        }
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


            {/* Incoming Requests */}
            <section className="dashboard-incoming-requests">

                <div className="dashboard-section-heading">

                    <div>
                        <span className="dashboard-small-label">
                            CUSTOMER ACTIVITY
                        </span>

                        <h2>Incoming Medicine Requests</h2>

                        <p>
                            Customer requests shared with your pharmacy.
                        </p>
                    </div>

                    <button
                        className="view-medicines-btn"
                        onClick={() =>
                            navigate("/pharmacy-requests")
                        }
                    >
                        View All Requests →
                    </button>

                </div>

                {requestLoading ? (

                    <div className="dashboard-request-empty">
                        Loading incoming requests...
                    </div>

                ) : incomingRequests.length === 0 ? (

                    <div className="dashboard-request-empty">
                        <div className="dashboard-empty-icon">
                            ♧
                        </div>

                        <h3>No incoming requests yet</h3>

                        <p>
                            New customer medicine requests will appear here
                            automatically.
                        </p>
                    </div>

                ) : (

                    <div className="dashboard-request-list">

                        {incomingRequests.slice(0, 5).map((request) => (

                            <div
                                className="dashboard-request-item"
                                key={request.id}
                            >

                                <div className="dashboard-request-medicine-icon">
                                    Rx
                                </div>

                                <div className="dashboard-request-details">

                                    <h3>
                                        {request.medicineName ||
                                            "Medicine Request"}
                                    </h3>

                                    <p>
                                        {request.dosage ||
                                            "Dosage not specified"}
                                        {" · "}
                                        Quantity: {request.quantity || 1}
                                    </p>

                                    <span>
                                        Received on{" "}
                                        {formatRequestDate(request.createdAt)}
                                    </span>

                                </div>

                                <div className="dashboard-request-actions">

                                    <span
                                        className={getRequestStatusClass(
                                            request.status || "Pending"
                                        )}
                                    >
                                        {request.status || "Pending"}
                                    </span>

                                    <button
                                        type="button"
                                        onClick={() =>
                                            navigate("/pharmacy-requests")
                                        }
                                    >
                                        View
                                    </button>

                                </div>

                            </div>

                        ))}

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
                        onClick={() =>
                            navigate("/pharmacy-add-medicine")
                        }
                    >
                        <div>
                            <h3>Add Medicine</h3>
                            <p>
                                Add new medicines to your inventory.
                            </p>
                        </div>

                        <span>→</span>
                    </button>


                    <button
                        className="dashboard-action-card"
                        onClick={() =>
                            navigate("/pharmacy-medicines")
                        }
                    >
                        <div>
                            <h3>Manage Medicines</h3>
                            <p>
                                Update prices, quantity and availability.
                            </p>
                        </div>

                        <span>→</span>
                    </button>


                    <button
                        className="dashboard-action-card"
                        onClick={() =>
                            navigate("/pharmacy-requests")
                        }
                    >
                        <div>
                            <h3>Medicine Requests</h3>
                            <p>
                                Check and manage customer requests.
                            </p>
                        </div>

                        <span>→</span>
                    </button>


                    <button
                        className="dashboard-action-card"
                        onClick={() =>
                            navigate("/pharmacy-prescriptions")
                        }
                    >
                        <div>
                            <h3>Prescriptions</h3>
                            <p>
                                View customer prescription details.
                            </p>
                        </div>

                        <span>→</span>
                    </button>

                </div>

            </section>

        </div>
    );
}

export default PharmacyDashboard;