import { useEffect, useState } from "react";

import {
    doc,
    getDoc,
    updateDoc
} from "firebase/firestore";

import { db } from "../../firebase/Firebase";

import { useNavigate } from "react-router-dom";


function PharmacyProfile() {

    const navigate = useNavigate();

    const uid = localStorage.getItem("uid");

    const [pharmacyId, setPharmacyId] = useState("");

    const [formData, setFormData] = useState({
        name: "",
        phone: "",
        address: "",
        city: "",
        state: "",
        country: "",
        latitude: "",
        longitude: ""
    });

    const [originalData, setOriginalData] = useState({});

    const [loading, setLoading] = useState(true);

    const [saving, setSaving] = useState(false);

    const [editMode, setEditMode] = useState(false);

    const [error, setError] = useState("");

    const [success, setSuccess] = useState("");


    // LOAD PHARMACY PROFILE

    useEffect(() => {

        const fetchProfile = async () => {

            try {

                if (!uid) {
                    navigate("/login");
                    return;
                }

                const userRef = doc(db, "users", uid);

                const userSnap = await getDoc(userRef);

                if (!userSnap.exists()) {
                    setError("User account not found.");
                    setLoading(false);
                    return;
                }

                const userData = userSnap.data();

                if (userData.role !== "pharmacy") {
                    setError("You are not authorized to access this page.");
                    setLoading(false);
                    return;
                }

                if (userData.status !== "approved") {
                    setError("Your pharmacy account is not approved yet.");
                    setLoading(false);
                    return;
                }

                if (!userData.pharmacyId) {
                    setError("Pharmacy details not found.");
                    setLoading(false);
                    return;
                }

                const id = userData.pharmacyId;

                setPharmacyId(id);

                const pharmacyRef = doc(db, "pharmacies", id);

                const pharmacySnap = await getDoc(pharmacyRef);

                if (!pharmacySnap.exists()) {
                    setError("Pharmacy information not found.");
                    setLoading(false);
                    return;
                }

                const pharmacyData = pharmacySnap.data();

                if (pharmacyData.ownerId !== uid) {
                    setError("You are not authorized to access this pharmacy.");
                    setLoading(false);
                    return;
                }

                if (pharmacyData.status !== "approved") {
                    setError("Your pharmacy is not approved yet.");
                    setLoading(false);
                    return;
                }

                const data = {
                    name: pharmacyData.name || "",
                    phone: pharmacyData.phone || "",
                    address: pharmacyData.address || "",
                    city: pharmacyData.city || "",
                    state: pharmacyData.state || "",
                    country: pharmacyData.country || "",
                    latitude: pharmacyData.latitude || "",
                    longitude: pharmacyData.longitude || ""
                };

                setFormData(data);

                setOriginalData(data);

                setLoading(false);

            } catch (err) {

                console.log(err);

                setError("Unable to load pharmacy profile.");

                setLoading(false);

            }

        };

        fetchProfile();

    }, [uid, navigate]);


    // HANDLE INPUT CHANGE

    const handleChange = (e) => {

        const { name, value } = e.target;

        setFormData((prev) => ({
            ...prev,
            [name]: value
        }));

    };


    // GET CURRENT LOCATION

    const getCurrentLocation = () => {

        setError("");
        setSuccess("");

        if (!navigator.geolocation) {

            setError("Geolocation is not supported by your browser.");

            return;

        }

        navigator.geolocation.getCurrentPosition(

            (position) => {

                setFormData((prev) => ({
                    ...prev,
                    latitude: position.coords.latitude.toString(),
                    longitude: position.coords.longitude.toString()
                }));

                setSuccess("Current location captured successfully.");

            },

            () => {

                setError("Unable to get your location. Please allow location access.");

            }

        );

    };


    // VALIDATE FORM

    const validateForm = () => {

        if (!formData.name.trim()) {
            setError("Pharmacy name is required.");
            return false;
        }

        if (!formData.phone.trim()) {
            setError("Phone number is required.");
            return false;
        }

        if (!/^[0-9]{10}$/.test(formData.phone)) {
            setError("Please enter a valid 10-digit phone number.");
            return false;
        }

        if (!formData.address.trim()) {
            setError("Address is required.");
            return false;
        }

        if (!formData.city.trim()) {
            setError("City is required.");
            return false;
        }

        if (!formData.state.trim()) {
            setError("State is required.");
            return false;
        }

        if (!formData.country.trim()) {
            setError("Country is required.");
            return false;
        }

        return true;

    };


    // SAVE PROFILE

    const handleSubmit = async (e) => {

        e.preventDefault();

        setError("");
        setSuccess("");

        if (!validateForm()) {
            return;
        }

        try {

            setSaving(true);

            const pharmacyRef = doc(db, "pharmacies", pharmacyId);

            await updateDoc(pharmacyRef, {

                name: formData.name.trim(),

                phone: formData.phone.trim(),

                address: formData.address.trim(),

                city: formData.city.trim(),

                state: formData.state.trim(),

                country: formData.country.trim(),

                latitude: formData.latitude,

                longitude: formData.longitude

            });

            setOriginalData(formData);

            setEditMode(false);

            setSuccess("Profile updated successfully.");

        } catch (err) {

            console.log(err);

            setError("Unable to update profile. Please try again.");

        } finally {

            setSaving(false);

        }

    };


    // CANCEL EDIT

    const handleCancel = () => {

        setFormData(originalData);

        setEditMode(false);

        setError("");

        setSuccess("");

    };


    // LOADING

    if (loading) {

        return (

            <div className="pp-loading">

                <div className="pp-spinner"></div>

                <p>Loading your profile...</p>

            </div>

        );

    }


    // ERROR

    if (error && !formData.name && !pharmacyId) {

        return (

            <div className="pp-error-page">

                <div className="pp-error-card">

                    <i className="ti-alert"></i>

                    <h3>Unable to Open Profile</h3>

                    <p>{error}</p>

                    <button onClick={() => navigate("/pharmacy/dashboard")}>
                        Back to Dashboard
                    </button>

                </div>

            </div>

        );

    }


    return (

        <div className="pp-page">

            <div className="pp-container">


                {/* PAGE TITLE */}

                <div className="pp-page-heading">

                    <div>

                        <h1>My Profile</h1>

                        <p>Manage your pharmacy information and details.</p>

                    </div>

                </div>


                {/* HERO SECTION */}

                <div className="pp-hero">

                    <div className="pp-hero-left">

                        <div className="pp-avatar">

                            <i className="ti-home"></i>

                        </div>

                        <div className="pp-hero-info">

                            <span className="pp-partner-badge">

                                <i className="ti-check"></i>

                                Verified Pharmacy Partner

                            </span>

                            <h2>{formData.name || "Your Pharmacy"}</h2>

                            <p>

                                <i className="ti-location-pin"></i>

                                {formData.city || "City not added"}

                                {formData.state && `, ${formData.state}`}

                            </p>

                        </div>

                    </div>

                </div>


                {/* ALERT MESSAGES */}

                {error && (

                    <div className="pp-alert pp-alert-error">

                        <i className="ti-alert"></i>

                        {error}

                    </div>

                )}

                {success && (

                    <div className="pp-alert pp-alert-success">

                        <i className="ti-check"></i>

                        {success}

                    </div>

                )}


                {/* MAIN CONTENT */}

                <div className="pp-content">


                    {/* PROFILE FORM */}

                    <div className="pp-main-card">

                        <div className="pp-card-heading">

                            <div>

                                <h3>Pharmacy Information</h3>

                                <p>View and update your pharmacy details.</p>

                            </div>

                            {!editMode && (

                                <button
                                    className="pp-edit-btn"
                                    onClick={() => {
                                        setEditMode(true);
                                        setError("");
                                        setSuccess("");
                                    }}
                                >

                                    <i className="ti-pencil"></i>

                                    Edit Profile

                                </button>

                            )}

                        </div>


                        <form onSubmit={handleSubmit}>

                            <div className="pp-form-grid">


                                {/* PHARMACY NAME */}

                                <div className="pp-form-group">

                                    <label>Pharmacy Name</label>

                                    <div className="pp-input-wrapper">

                                        <i className="ti-home"></i>

                                        <input
                                            type="text"
                                            name="name"
                                            value={formData.name}
                                            onChange={handleChange}
                                            disabled={!editMode}
                                            placeholder="Enter pharmacy name"
                                        />

                                    </div>

                                </div>


                                {/* PHONE */}

                                <div className="pp-form-group">

                                    <label>Phone Number</label>

                                    <div className="pp-input-wrapper">

                                        <i className="ti-mobile"></i>

                                        <input
                                            type="tel"
                                            name="phone"
                                            value={formData.phone}
                                            onChange={handleChange}
                                            disabled={!editMode}
                                            maxLength="10"
                                            placeholder="Enter phone number"
                                        />

                                    </div>

                                </div>


                                {/* ADDRESS */}

                                <div className="pp-form-group pp-full-width">

                                    <label>Full Address</label>

                                    <div className="pp-input-wrapper">

                                        <i className="ti-location-pin"></i>

                                        <input
                                            type="text"
                                            name="address"
                                            value={formData.address}
                                            onChange={handleChange}
                                            disabled={!editMode}
                                            placeholder="Enter complete address"
                                        />

                                    </div>

                                </div>


                                {/* CITY */}

                                <div className="pp-form-group">

                                    <label>City</label>

                                    <div className="pp-input-wrapper">

                                        <i className="ti-map"></i>

                                        <input
                                            type="text"
                                            name="city"
                                            value={formData.city}
                                            onChange={handleChange}
                                            disabled={!editMode}
                                            placeholder="Enter city"
                                        />

                                    </div>

                                </div>


                                {/* STATE */}

                                <div className="pp-form-group">

                                    <label>State</label>

                                    <div className="pp-input-wrapper">

                                        <i className="ti-map-alt"></i>

                                        <input
                                            type="text"
                                            name="state"
                                            value={formData.state}
                                            onChange={handleChange}
                                            disabled={!editMode}
                                            placeholder="Enter state"
                                        />

                                    </div>

                                </div>


                                {/* COUNTRY */}

                                <div className="pp-form-group">

                                    <label>Country</label>

                                    <div className="pp-input-wrapper">

                                        <i className="ti-world"></i>

                                        <input
                                            type="text"
                                            name="country"
                                            value={formData.country}
                                            onChange={handleChange}
                                            disabled={!editMode}
                                            placeholder="Enter country"
                                        />

                                    </div>

                                </div>


                                {/* LATITUDE */}

                                <div className="pp-form-group">

                                    <label>Latitude</label>

                                    <div className="pp-input-wrapper">

                                        <i className="ti-location-arrow"></i>

                                        <input
                                            type="text"
                                            name="latitude"
                                            value={formData.latitude}
                                            onChange={handleChange}
                                            disabled={!editMode}
                                            placeholder="Latitude"
                                        />

                                    </div>

                                </div>


                                {/* LONGITUDE */}

                                <div className="pp-form-group">

                                    <label>Longitude</label>

                                    <div className="pp-input-wrapper">

                                        <i className="ti-location-arrow"></i>

                                        <input
                                            type="text"
                                            name="longitude"
                                            value={formData.longitude}
                                            onChange={handleChange}
                                            disabled={!editMode}
                                            placeholder="Longitude"
                                        />

                                    </div>

                                </div>


                            </div>


                            {/* LOCATION BUTTON */}

                            {editMode && (

                                <button
                                    type="button"
                                    className="pp-location-btn"
                                    onClick={getCurrentLocation}
                                >

                                    <i className="ti-target"></i>

                                    Use My Current Location

                                </button>

                            )}


                            {/* FORM ACTIONS */}

                            {editMode && (

                                <div className="pp-form-actions">

                                    <button
                                        type="button"
                                        className="pp-cancel-btn"
                                        onClick={handleCancel}
                                        disabled={saving}
                                    >

                                        Cancel

                                    </button>

                                    <button
                                        type="submit"
                                        className="pp-save-btn"
                                        disabled={saving}
                                    >

                                        {saving ? (

                                            <>
                                                <span className="pp-button-spinner"></span>
                                                Saving...
                                            </>

                                        ) : (

                                            <>
                                                <i className="ti-check"></i>
                                                Save Changes
                                            </>

                                        )}

                                    </button>

                                </div>

                            )}

                        </form>

                    </div>


                    {/* SIDEBAR */}

                    <div className="pp-sidebar">


                        {/* ACCOUNT OVERVIEW */}

                        <div className="pp-side-card">

                            <h3>Account Overview</h3>

                            <div className="pp-overview-item">

                                <div className="pp-overview-icon">
                                    <i className="ti-check-box"></i>
                                </div>

                                <div>

                                    <h4>Account Status</h4>

                                    <span className="pp-status-approved">
                                        Approved
                                    </span>

                                </div>

                            </div>


                            <div className="pp-overview-item">

                                <div className="pp-overview-icon">
                                    <i className="ti-user"></i>
                                </div>

                                <div>

                                    <h4>Account Type</h4>

                                    <p>Pharmacy Partner</p>

                                </div>

                            </div>


                            <div className="pp-overview-item">

                                <div className="pp-overview-icon">
                                    <i className="ti-shield"></i>
                                </div>

                                <div>

                                    <h4>Verification</h4>

                                    <p>Verified Account</p>

                                </div>

                            </div>

                        </div>


                        {/* LOCATION SUMMARY */}

                        <div className="pp-side-card">

                            <h3>Location Summary</h3>

                            <div className="pp-location-summary">

                                <i className="ti-map-alt"></i>

                                <div>

                                    <h4>{formData.city || "City not added"}</h4>

                                    <p>
                                        {formData.state || "State not added"}
                                        {formData.country && `, ${formData.country}`}
                                    </p>

                                </div>

                            </div>

                            {formData.latitude && formData.longitude && (

                                <a
                                    href={`https://www.google.com/maps?q=${formData.latitude},${formData.longitude}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="pp-map-link"
                                >

                                    View on Google Maps

                                    <i className="ti-arrow-top-right"></i>

                                </a>

                            )}

                        </div>


                        {/* HELP */}

                        <div className="pp-help-card">

                            <div className="pp-help-icon">

                                <i className="ti-headphone-alt"></i>

                            </div>

                            <h3>Need Help?</h3>

                            <p>
                                Having trouble with your pharmacy profile?
                                Contact our support team for assistance.
                            </p>

                            <button onClick={() => navigate("/contact")}>

                                Contact Support

                                <i className="ti-arrow-right"></i>

                            </button>

                        </div>


                    </div>

                </div>

            </div>

        </div>

    );

}

export default PharmacyProfile;