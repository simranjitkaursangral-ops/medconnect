import { useEffect, useState } from "react";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "../../firebase/Firebase";
import { useNavigate } from "react-router-dom";

function Profile() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: ""
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const userId = localStorage.getItem("uid");

        if (!userId) {
          navigate("/login");
          return;
        }

        const userDoc = await getDoc(
          doc(db, "users", userId)
        );

        if (!userDoc.exists()) {
          setError("User profile not found.");
          setLoading(false);
          return;
        }

        const data = userDoc.data();

        setFormData({
          name: data.name || "",
          email: data.email || "",
          phone: data.phone || ""
        });
      } catch (err) {
        setError("Failed to load profile.");
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [navigate]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    setMessage("");
    setError("");

    if (!formData.name.trim()) {
      setError("Name is required.");
      return;
    }

    if (!formData.phone.trim()) {
      setError("Phone number is required.");
      return;
    }

    try {
      setSaving(true);

      const userId = localStorage.getItem("uid");

      await updateDoc(
        doc(db, "users", userId),
        {
          name: formData.name.trim(),
          phone: formData.phone.trim()
        }
      );

      localStorage.setItem(
        "userName",
        formData.name.trim()
      );

      setMessage("Profile updated successfully.");
    } catch (err) {
      setError("Failed to update profile.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="admin-loading">
        Loading profile...
      </div>
    );
  }

  return (
    <div className="profile-page">
      <div className="profile-container">

        <div className="profile-header">
          <div className="profile-avatar">
            {formData.name
              ? formData.name.charAt(0).toUpperCase()
              : "U"}
          </div>

          <div>
            <h1>My Profile</h1>
            <p>Manage your MedConnect account information</p>
          </div>
        </div>

        <div className="profile-card">

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

          <form onSubmit={handleSubmit}>

            <div className="profile-form-grid">

              <div className="form-group">
                <label>Full Name</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Enter your full name"
                />
              </div>

              <div className="form-group">
                <label>Email Address</label>
                <input
                  type="email"
                  value={formData.email}
                  readOnly
                  className="readonly-input"
                />
                <small>
                  Email cannot be changed here.
                </small>
              </div>

              <div className="form-group">
                <label>Phone Number</label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="Enter your phone number"
                />
              </div>

            </div>

            <button
              type="submit"
              className="profile-save-btn"
              disabled={saving}
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>

          </form>
        </div>

        <div className="profile-info-card">
          <div>
            <span className="profile-info-icon">🔒</span>
          </div>

          <div>
            <h3>Your account is secure</h3>
            <p>
              Your profile information is stored securely
              in your MedConnect account.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}

export default Profile;