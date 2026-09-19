import { useEffect, useState } from "react";
import {
  doc,
  getDoc,
  updateDoc
} from "firebase/firestore";
import { db } from "../../firebase/Firebase";

function PharmacyProfile() {
  const uid = localStorage.getItem("uid");

  const [pharmacyId, setPharmacyId] =
    useState("");

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [message, setMessage] =
    useState("");

  const [error, setError] =
    useState("");

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

  useEffect(() => {
    const loadProfile = async () => {
      if (!uid) {
        setError(
          "Pharmacy account not found."
        );
        setLoading(false);
        return;
      }

      try {
        const userSnapshot =
          await getDoc(
            doc(db, "users", uid)
          );

        if (!userSnapshot.exists()) {
          setError(
            "User profile not found."
          );
          setLoading(false);
          return;
        }

        const userData =
          userSnapshot.data();

        if (
          userData.role !== "pharmacy" ||
          userData.status !== "approved" ||
          !userData.pharmacyId
        ) {
          setError(
            "Your pharmacy account is not approved."
          );
          setLoading(false);
          return;
        }

        const id =
          userData.pharmacyId;

        const pharmacySnapshot =
          await getDoc(
            doc(db, "pharmacies", id)
          );

        if (!pharmacySnapshot.exists()) {
          setError(
            "Pharmacy profile not found."
          );
          setLoading(false);
          return;
        }

        const pharmacyData =
          pharmacySnapshot.data();

        if (
          pharmacyData.ownerId !== uid
        ) {
          setError(
            "You are not authorized to access this pharmacy."
          );
          setLoading(false);
          return;
        }

        if (
          pharmacyData.status !==
          "approved"
        ) {
          setError(
            "Your pharmacy is not approved."
          );
          setLoading(false);
          return;
        }

        setPharmacyId(id);

        setFormData({
          name:
            pharmacyData.name || "",
          phone:
            pharmacyData.phone || "",
          address:
            pharmacyData.address || "",
          city:
            pharmacyData.city || "",
          state:
            pharmacyData.state || "",
          country:
            pharmacyData.country || "",
          latitude:
            pharmacyData.latitude !==
            undefined
              ? pharmacyData.latitude
              : "",
          longitude:
            pharmacyData.longitude !==
            undefined
              ? pharmacyData.longitude
              : ""
        });
      } catch (err) {
        console.error(
          "LOAD PHARMACY PROFILE ERROR:",
          err
        );

        setError(
          err.message ||
            "Unable to load pharmacy profile."
        );
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [uid]);

  const handleChange = (event) => {
    const { name, value } =
      event.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value
    }));

    setMessage("");
    setError("");
  };

  const handleLocation = () => {
    setMessage("");
    setError("");

    if (!navigator.geolocation) {
      setError(
        "Geolocation is not supported by your browser."
      );
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setFormData((previous) => ({
          ...previous,
          latitude:
            position.coords.latitude.toString(),
          longitude:
            position.coords.longitude.toString()
        }));

        setMessage(
          "Current location added successfully."
        );
      },
      () => {
        setError(
          "Unable to get your location. Please allow location access."
        );
      }
    );
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    setMessage("");
    setError("");

    if (!uid || !pharmacyId) {
      setError(
        "Pharmacy account information is missing."
      );
      return;
    }

    if (!formData.name.trim()) {
      setError(
        "Pharmacy name is required."
      );
      return;
    }

    if (!formData.phone.trim()) {
      setError(
        "Phone number is required."
      );
      return;
    }

    if (!formData.address.trim()) {
      setError(
        "Address is required."
      );
      return;
    }

    if (!formData.city.trim()) {
      setError(
        "City is required."
      );
      return;
    }

    if (!formData.state.trim()) {
      setError(
        "State is required."
      );
      return;
    }

    if (!formData.country.trim()) {
      setError(
        "Country is required."
      );
      return;
    }

    if (
      formData.latitude !== "" &&
      isNaN(Number(formData.latitude))
    ) {
      setError(
        "Latitude must be a valid number."
      );
      return;
    }

    if (
      formData.longitude !== "" &&
      isNaN(Number(formData.longitude))
    ) {
      setError(
        "Longitude must be a valid number."
      );
      return;
    }

    try {
      setSaving(true);

      const userSnapshot =
        await getDoc(
          doc(db, "users", uid)
        );

      if (!userSnapshot.exists()) {
        throw new Error(
          "User profile not found."
        );
      }

      const userData =
        userSnapshot.data();

      if (
        userData.role !== "pharmacy" ||
        userData.status !== "approved" ||
        userData.pharmacyId !== pharmacyId
      ) {
        throw new Error(
          "You are not authorized to update this pharmacy."
        );
      }

      const pharmacyRef = doc(
        db,
        "pharmacies",
        pharmacyId
      );

      const pharmacySnapshot =
        await getDoc(pharmacyRef);

      if (!pharmacySnapshot.exists()) {
        throw new Error(
          "Pharmacy profile not found."
        );
      }

      const pharmacyData =
        pharmacySnapshot.data();

      if (
        pharmacyData.ownerId !== uid
      ) {
        throw new Error(
          "You are not authorized to update this pharmacy."
        );
      }

      if (
        pharmacyData.status !==
        "approved"
      ) {
        throw new Error(
          "Only an approved pharmacy can update its profile."
        );
      }

      await updateDoc(
        pharmacyRef,
        {
          name:
            formData.name.trim(),
          phone:
            formData.phone.trim(),
          address:
            formData.address.trim(),
          city:
            formData.city.trim(),
          state:
            formData.state.trim(),
          country:
            formData.country.trim(),
          latitude:
            formData.latitude === ""
              ? ""
              : Number(
                  formData.latitude
                ),
          longitude:
            formData.longitude === ""
              ? ""
              : Number(
                  formData.longitude
                )
        }
      );

      localStorage.setItem(
        "userName",
        formData.name.trim()
      );

      setMessage(
        "Pharmacy profile updated successfully."
      );
    } catch (err) {
      console.error(
        "UPDATE PHARMACY PROFILE ERROR:",
        err
      );

      setError(
        err.message ||
          "Unable to update pharmacy profile."
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <main className="admin-page">
        <div className="admin-page-container">
          <div className="admin-loading">
            <div className="loading-spinner"></div>
            <h3>
              Loading pharmacy profile...
            </h3>
          </div>
        </div>
      </main>
    );
  }

  if (error && !pharmacyId) {
    return (
      <main className="admin-page">
        <div className="admin-page-container">
          <div className="admin-loading">
            <h3>{error}</h3>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="admin-page">

      <div className="admin-page-container">

        <div className="admin-hero">

          <div className="admin-hero-content">

            <span className="section-badge">
              My Pharmacy
            </span>

            <h1>
              Pharmacy Profile
            </h1>

            <p>
              Keep your pharmacy information
              accurate so customers can find
              and contact you easily.
            </p>

          </div>

        </div>

        {message && (
          <div className="form-success">
            {message}
          </div>
        )}

        {error && (
          <div className="form-error">
            {error}
          </div>
        )}

        <div className="admin-form-container">

          <div className="admin-form-card">

            <div className="admin-form-header">

              <div className="admin-form-icon">
                🏥
              </div>

              <div>
                <h2>
                  Pharmacy Information
                </h2>

                <p>
                  Update your pharmacy details
                  and location.
                </p>
              </div>

            </div>

            <form
              className="admin-form"
              onSubmit={handleSubmit}
            >

              <div className="form-group">

                <label>
                  Pharmacy Name
                </label>

                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Enter pharmacy name"
                />

              </div>

              <div className="form-group">

                <label>
                  Phone Number
                </label>

                <input
                  type="text"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="Enter phone number"
                />

              </div>

              <div className="form-group">

                <label>
                  Address
                </label>

                <input
                  type="text"
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  placeholder="Enter pharmacy address"
                />

              </div>

              <div className="form-row">

                <div className="form-group">

                  <label>
                    City
                  </label>

                  <input
                    type="text"
                    name="city"
                    value={formData.city}
                    onChange={handleChange}
                    placeholder="Enter city"
                  />

                </div>

                <div className="form-group">

                  <label>
                    State
                  </label>

                  <input
                    type="text"
                    name="state"
                    value={formData.state}
                    onChange={handleChange}
                    placeholder="Enter state"
                  />

                </div>

              </div>

              <div className="form-group">

                <label>
                  Country
                </label>

                <input
                  type="text"
                  name="country"
                  value={formData.country}
                  onChange={handleChange}
                  placeholder="Enter country"
                />

              </div>

              <div className="form-row">

                <div className="form-group">

                  <label>
                    Latitude
                  </label>

                  <input
                    type="text"
                    name="latitude"
                    value={formData.latitude}
                    onChange={handleChange}
                    placeholder="e.g. 30.9010"
                  />

                </div>

                <div className="form-group">

                  <label>
                    Longitude
                  </label>

                  <input
                    type="text"
                    name="longitude"
                    value={formData.longitude}
                    onChange={handleChange}
                    placeholder="e.g. 75.8573"
                  />

                </div>

              </div>

              <button
                type="button"
                className="admin-dashboard-action"
                onClick={handleLocation}
              >
                📍 Use My Location
              </button>

              <button
                type="submit"
                className="admin-form-submit"
                disabled={saving}
              >
                {saving
                  ? "Saving..."
                  : "Save Pharmacy Profile"}
              </button>

            </form>

          </div>

        </div>

      </div>

    </main>
  );
}

export default PharmacyProfile;