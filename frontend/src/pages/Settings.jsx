import { useState, useEffect } from "react";
import { API_URL } from "../api";

export default function Settings() {
  const [form, setForm] = useState({
    smtpHost: "",
    smtpPort: "",
    smtpUser: "",
    smtpPass: "",
    googleReviewUrl: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const token = sessionStorage.getItem("dynr_token");

  useEffect(() => {
    async function loadSettings() {
      try {
        const res = await fetch(`${API_URL}/api/settings`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();

        if (res.ok && data.settings) {
          setForm({
            smtpHost: data.settings.smtp_host || "",
            smtpPort: data.settings.smtp_port || "",
            smtpUser: data.settings.smtp_user || "",
            smtpPass: data.settings.smtp_pass || "",
            googleReviewUrl: data.settings.google_review_url || "",
          });
        }
      } catch (err) {
        console.error("Failed to load settings:", err);
      } finally {
        setLoading(false);
      }
    }
    loadSettings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSuccess(false);
    setSaving(true);

    try {
      const res = await fetch(`${API_URL}/api/settings`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data?.error || "Failed to save settings.");
      }

      setSuccess(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return null;

  return (
    <div className="dash-page">
      <div className="dash-shell" style={{ maxWidth: 640, margin: "0 auto" }}>
        <div className="dash-topbar">
          <div className="dash-topbar-logo">
            dyn<span>R</span>
          </div>
          <a href="/dashboard" className="dash-sidebar-btn" style={{ width: "auto", padding: "10px 18px", marginBottom: 0 }}>
            Back to Dashboard
          </a>
        </div>

        <div style={{ padding: 32 }}>
          <h2 style={{ marginBottom: 4 }}>Settings</h2>
          <p className="dash-subtitle" style={{ marginBottom: 24 }}>
            Connect your own email so messages send from your restaurant, not dynR.
          </p>

          {error && <div className="form-error">{error}</div>}
          {success && (
            <div
              className="form-error"
              style={{ background: "#eaf7ec", color: "#1e7a34", borderColor: "#bfe6c8" }}
            >
              Settings saved.
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <h4 style={{ marginBottom: 12 }}>Email (SMTP)</h4>

            <div className="form-group">
              <label htmlFor="smtpHost">SMTP Host</label>
              <input
                id="smtpHost"
                name="smtpHost"
                type="text"
                placeholder="smtp.gmail.com"
                value={form.smtpHost}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label htmlFor="smtpPort">SMTP Port</label>
              <input
                id="smtpPort"
                name="smtpPort"
                type="text"
                placeholder="587"
                value={form.smtpPort}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label htmlFor="smtpUser">Email Address</label>
              <input
                id="smtpUser"
                name="smtpUser"
                type="email"
                placeholder="hello@yourrestaurant.com"
                value={form.smtpUser}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label htmlFor="smtpPass">Email Password / App Password</label>
              <input
                id="smtpPass"
                name="smtpPass"
                type="password"
                placeholder="••••••••••••••••"
                value={form.smtpPass}
                onChange={handleChange}
              />
            </div>

            <h4 style={{ margin: "28px 0 12px" }}>Google Reviews</h4>

            <div className="form-group">
              <label htmlFor="googleReviewUrl">Your Google Review Link</label>
              <input
                id="googleReviewUrl"
                name="googleReviewUrl"
                type="url"
                placeholder="https://g.page/r/your-restaurant/review"
                value={form.googleReviewUrl}
                onChange={handleChange}
              />
            </div>

            <button type="submit" className="btn" disabled={saving}>
              {saving ? "Saving…" : "Save Settings"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}