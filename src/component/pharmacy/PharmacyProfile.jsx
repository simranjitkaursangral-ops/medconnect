import { useEffect, useState } from "react";
import {
  doc,
  getDoc,
  updateDoc
} from "firebase/firestore";

import {
  MapContainer,
  TileLayer,
  Marker,
  useMapEvents,
  useMap
} from "react-leaflet";

import L from "leaflet";

import { db } from "../../firebase/Firebase";

const pharmacyIcon = L.divIcon({
  className: "pharmacy-map-marker",
  html: `<div style="
    width: 22px;
    height: 22px;
    background: #159b67;
    border: 4px solid white;
    border-radius: 50%;
    box-shadow: 0 2px 8px rgba(0,0,0,0.3);
  "></div>`,
  iconSize: [22, 22],
  iconAnchor: [11, 11]
});

function MapClickHandler({ setPosition }) {
  useMapEvents({
    click(event) {
      setPosition({
        latitude: event.latlng.lat,
        longitude: event.latlng.lng
      });
    }
  });

  return null;
}

function MapCenter({ position }) {
  const map = useMap();

  useEffect(() => {
    if (position) {
      map.flyTo(
        [position.latitude, position.longitude],
        16,
        { duration: 0.7 }
      );
    }
  }, [position, map]);

  return null;
}

function PharmacyProfile() {
  const uid = localStorage.getItem("uid");

  const [pharmacyId, setPharmacyId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    address: "",
    city: "",
    state: "",
    country: "India",
    latitude: "",
    longitude: ""
  });

  const [originalData, setOriginalData] = useState(null);

  useEffect(() => {
    fetchPharmacy();
  }, []);

  const fetchPharmacy = async () => {
    try {
      setLoading(true);
      setError("");

      if (!uid) {
        setError("Please login again.");
        return;
      }

      const userRef = doc(db, "users", uid);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        setError("User account not found.");
        return;
      }

      const userData = userSnap.data();

      if (
        userData.role !== "pharmacy" ||
        userData.status !== "approved" ||
        !userData.pharmacyId
      ) {
        setError("You are not authorized to access this pharmacy profile.");
        return;
      }

      const id = userData.pharmacyId;

      const pharmacyRef = doc(db, "pharmacies", id);
      const pharmacySnap = await getDoc(pharmacyRef);

      if (!pharmacySnap.exists()) {
        setError("Pharmacy profile not found.");
        return;
      }

      const pharmacyData = pharmacySnap.data();

      if (pharmacyData.ownerId !== uid) {
        setError("You are not the owner of this pharmacy.");
        return;
      }

      const data = {
        name: pharmacyData.name || "",
        phone: pharmacyData.phone || "",
        address: pharmacyData.address || "",
        city: pharmacyData.city || "",
        state: pharmacyData.state || "",
        country: pharmacyData.country || "India",
        latitude: pharmacyData.latitude ?? "",
        longitude: pharmacyData.longitude ?? ""
      };

      setPharmacyId(id);
      setFormData(data);
      setOriginalData(data);

    } catch (err) {
      console.error("Profile loading error:", err);
      setError("Unable to load pharmacy profile.");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value
    }));
  };

  const handlePositionChange = (position) => {
    setFormData((previous) => ({
      ...previous,
      latitude: position.latitude.toFixed(7),
      longitude: position.longitude.toFixed(7)
    }));
  };

  const handleCurrentLocation = () => {
    setError("");
    setMessage("");

    if (!navigator.geolocation) {
      setError("Your browser does not support location detection.");
      return;
    }

    setLocationLoading(true);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        handlePositionChange({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        });

        setLocationLoading(false);
        setMessage("Current location selected. Save your profile to update it.");
      },
      (err) => {
        console.error("Location error:", err);

        setLocationLoading(false);

        if (err.code === 1) {
          setError("Please allow location permission in your browser.");
        } else {
          setError("Unable to detect your location. Please try again.");
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0
      }
    );
  };

  const handleSave = async (e) => {
    e.preventDefault();

    setError("");
    setMessage("");

    if (
      !formData.name.trim() ||
      !formData.phone.trim() ||
      !formData.address.trim() ||
      !formData.city.trim() ||
      !formData.state.trim()
    ) {
      setError("Please fill all required fields.");
      return;
    }

    const latitude = Number(formData.latitude);
    const longitude = Number(formData.longitude);

    if (
      formData.latitude !== "" &&
      formData.longitude !== ""
    ) {
      if (
        !Number.isFinite(latitude) ||
        !Number.isFinite(longitude) ||
        latitude < -90 ||
        latitude > 90 ||
        longitude < -180 ||
        longitude > 180
      ) {
        setError("Please select a valid location on the map.");
        return;
      }
    } else {
      setError("Please select your pharmacy location on the map.");
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
        latitude,
        longitude,
        locationUpdatedAt: new Date()
      });

      const updatedData = {
        ...formData,
        latitude,
        longitude
      };

      setFormData(updatedData);
      setOriginalData(updatedData);
      setEditMode(false);
      setMessage("Pharmacy profile and location updated successfully.");

      localStorage.setItem("userName", formData.name.trim());

    } catch (err) {
      console.error("Profile update error:", err);
      setError("Unable to update profile. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (originalData) {
      setFormData(originalData);
    }

    setEditMode(false);
    setError("");
    setMessage("");
  };

  const hasCoordinates =
    formData.latitude !== "" &&
    formData.longitude !== "" &&
    Number.isFinite(Number(formData.latitude)) &&
    Number.isFinite(Number(formData.longitude));

  const mapPosition = hasCoordinates
    ? [
        Number(formData.latitude),
        Number(formData.longitude)
      ]
    : [31.3260, 75.5762];

  if (loading) {
    return (
      <div className="admin-loading">
        Loading pharmacy profile...
      </div>
    );
  }

  if (error && !pharmacyId) {
    return (
      <div className="pharmacy-profile-page">
        <div className="pharmacy-profile-container">
          <div className="pharmacy-profile-message error">
            {error}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="pharmacy-profile-page">
      <div className="pharmacy-profile-container">

        <div className="pharmacy-profile-hero">
          <div className="pharmacy-hero-content">
            <div className="pharmacy-profile-avatar">
              ✚
            </div>

            <div>
              <span className="pharmacy-profile-label">
                PHARMACY ACCOUNT
              </span>

              <h1>{formData.name}</h1>

              <p>Manage your pharmacy information and location.</p>
            </div>
          </div>

          <span className="pharmacy-approved-badge">
            ✓ Approved Pharmacy
          </span>
        </div>

        {message && (
          <div className="pharmacy-profile-message success">
            {message}
          </div>
        )}

        {error && (
          <div className="pharmacy-profile-message error">
            {error}
          </div>
        )}

        <div className="pharmacy-details-card">

          <div className="pharmacy-form-section">
            <div className="pharmacy-section-heading">
              <div>
                <h2>Pharmacy Information</h2>
                <p>Keep your pharmacy details up to date.</p>
              </div>

              {!editMode && (
                <button
                  type="button"
                  className="pharmacy-edit-btn"
                  onClick={() => {
                    setEditMode(true);
                    setMessage("");
                    setError("");
                  }}
                >
                  Edit Profile
                </button>
              )}
            </div>

            <form onSubmit={handleSave}>
              <div className="pharmacy-form-grid">

                <div className="pharmacy-input-group">
                  <label>Pharmacy Name *</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    disabled={!editMode}
                    required
                  />
                </div>

                <div className="pharmacy-input-group">
                  <label>Phone Number *</label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    disabled={!editMode}
                    required
                  />
                </div>

                <div className="pharmacy-input-group full-width">
                  <label>Full Address *</label>
                  <input
                    type="text"
                    name="address"
                    value={formData.address}
                    onChange={handleChange}
                    disabled={!editMode}
                    required
                  />
                </div>

                <div className="pharmacy-input-group">
                  <label>City *</label>
                  <input
                    type="text"
                    name="city"
                    value={formData.city}
                    onChange={handleChange}
                    disabled={!editMode}
                    required
                  />
                </div>

                <div className="pharmacy-input-group">
                  <label>State *</label>
                  <input
                    type="text"
                    name="state"
                    value={formData.state}
                    onChange={handleChange}
                    disabled={!editMode}
                    required
                  />
                </div>

                <div className="pharmacy-input-group">
                  <label>Country</label>
                  <input
                    type="text"
                    name="country"
                    value={formData.country}
                    onChange={handleChange}
                    disabled={!editMode}
                  />
                </div>

              </div>

              <div className="pharmacy-location-section">
                <div className="pharmacy-location-heading">
                  <div>
                    <h2>Pharmacy Map Location</h2>
                    <p>
                      Select your pharmacy's exact position.
                      This helps customers find the nearest pharmacy.
                    </p>
                  </div>
                </div>

                <div className="pharmacy-location-coordinates">
                  <div>
                    <small>LATITUDE</small>
                    <strong>
                      {hasCoordinates
                        ? Number(formData.latitude).toFixed(7)
                        : "Not selected"}
                    </strong>
                  </div>

                  <div>
                    <small>LONGITUDE</small>
                    <strong>
                      {hasCoordinates
                        ? Number(formData.longitude).toFixed(7)
                        : "Not selected"}
                    </strong>
                  </div>
                </div>

                {editMode && (
                  <>
                    <button
                      type="button"
                      className="pharmacy-location-btn"
                      onClick={handleCurrentLocation}
                      disabled={locationLoading}
                    >
                      {locationLoading
                        ? "Detecting location..."
                        : "⌖ Use Current Location"}
                    </button>

                    <p className="pharmacy-map-instruction">
                      Or click directly on the map to select your pharmacy location.
                    </p>
                  </>
                )}

                <div className="pharmacy-profile-map">
                  <MapContainer
                    center={mapPosition}
                    zoom={hasCoordinates ? 16 : 12}
                    scrollWheelZoom={true}
                    style={{
                      height: "350px",
                      width: "100%",
                      borderRadius: "12px"
                    }}
                    key={`${mapPosition[0]}-${mapPosition[1]}`}
                  >
                    <TileLayer
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />

                    <MapCenter
                      position={{
                        latitude: mapPosition[0],
                        longitude: mapPosition[1]
                      }}
                    />

                    {editMode && (
                      <MapClickHandler
                        setPosition={handlePositionChange}
                      />
                    )}

                    {hasCoordinates && (
                      <Marker
                        position={mapPosition}
                        icon={pharmacyIcon}
                      />
                    )}
                  </MapContainer>
                </div>

                {!editMode && hasCoordinates && (
                  <a
                    className="pharmacy-map-link"
                    href={`https://www.google.com/maps?q=${formData.latitude},${formData.longitude}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Open saved location in Google Maps ↗
                  </a>
                )}
              </div>

              {editMode && (
                <div className="pharmacy-profile-actions">
                  <button
                    type="button"
                    className="pharmacy-cancel-btn"
                    onClick={handleCancel}
                    disabled={saving}
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    className="pharmacy-save-btn"
                    disabled={saving}
                  >
                    {saving ? "Saving..." : "Save Profile"}
                  </button>
                </div>
              )}

            </form>
          </div>
        </div>

      </div>
    </div>
  );
}

export default PharmacyProfile;