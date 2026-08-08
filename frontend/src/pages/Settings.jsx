import { useState, useEffect } from "react";
import { API_URL } from "../api";

export default function Settings() {
  const [section, setSection] = useState("setup"); // "setup" | "messages" | "password"

  const [form, setForm] = useState({
    smtpHost: "",
    smtpPort: "",
    smtpUser: "",
    smtpPass: "",
    googleReviewUrl: "",
    welcomeEmailText: "",
    followupEmailText: "",
  });
  const [smtpConfigured, setSmtpConfigured] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const [pwForm, setPwForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [pwError, setPwError] = useState("");
  const [pwSuccess, setPwSuccess] = useState(false);
  const [pwSaving, setPwSaving] = useState(false);

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
            smtpPass: "",
            googleReviewUrl: data.settings.google_review_url || "",
            welcomeEmailText: data.settings.welcome_email_text || "",
            followupEmailText: data.settings.followup_email_text || "",
          });
          setSmtpConfigured(!!data.settings.smtp_configured);
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

      if (form.smtpPass.trim()) {
        setSmtpConfigured(true);
        setForm((f) => ({ ...f, smtpPass: "" }));
      }
      setSuccess(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleChangePassword(e) {
    e.preventDefault();
    setPwError("");
    setPwSuccess(false);

    if (pwForm.newPassword !== pwForm.confirmPassword) {
      setPwError("New passwords don't match.");
      return;
    }

    setPwSaving(true);
    try {
      const res = await fetch(`${API_URL}/api/change-password`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          currentPassword: pwForm.currentPassword,
          newPassword: pwForm.newPassword,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || "Failed to change password.");
      }

      setPwSuccess(true);
      setPwForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } catch (err) {
      setPwError(err.message);
    } finally {
      setPwSaving(false);
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

          <div className="form-group" style={{ maxWidth: 260, marginBottom: 24 }}>
            <label htmlFor="settingsSection">Section</label>
            <select
              id="settingsSection"
              value={section}
              onChange={(e) => setSection(e.target.value)}
            >
              <option value="setup">Set Up</option>
              <option value="messages">Edit Messages</option>
              <option value="password">Change Password</option>
            </select>
          </div>

          {error && <div className="form-error">{error}</div>}
          {success && (
            <div
              className="form-error"
              style={{ background: "#eaf7ec", color: "#1e7a34", borderColor: "#bfe6c8" }}
            >
              Settings saved.
            </div>
          )}

          {section === "setup" && (
            <>
              <p className="dash-subtitle" style={{ marginBottom: 24 }}>
                Connect your own email so messages send from your restaurant, not dynR.
              </p>

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
                    placeholder={smtpConfigured ? "•••••••• (saved — leave blank to keep)" : "16-character app password"}
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
            </>
          )}

          {section === "messages" && (
            <>
              <p className="dash-subtitle" style={{ marginBottom: 24 }}>
                Customize the automatic emails dynR sends your guests. Leave a
                field blank to use dynR's default wording.
              </p>

              <form onSubmit={handleSubmit}>
                <h4 style={{ marginBottom: 8 }}>Welcome Email</h4>
                <p style={{ marginBottom: 12, opacity: 0.75, fontSize: 13 }}>
                  Sent automatically the moment a guest signs up. Available
                  placeholders: {"{{first_name}}"}, {"{{name}}"},{" "}
                  {"{{restaurant_name}}"}, {"{{membership_number}}"}
                </p>
                <div className="form-group">
                  <textarea
                    name="welcomeEmailText"
                    rows={6}
                    placeholder={`Welcome to the family, {{first_name}}!\n\nThank you for becoming part of the {{restaurant_name}} family...`}
                    value={form.welcomeEmailText}
                    onChange={handleChange}
                  />
                </div>

                <h4 style={{ margin: "28px 0 8px" }}>Visit Follow-up Email</h4>
                <p style={{ marginBottom: 12, opacity: 0.75, fontSize: 13 }}>
                  Sent automatically 1 hour after you mark a guest as visited.
                  Available placeholders: {"{{first_name}}"}, {"{{name}}"},{" "}
                  {"{{restaurant_name}}"}, {"{{review_link}}"}
                </p>
                <div className="form-group">
                  <textarea
                    name="followupEmailText"
                    rows={6}
                    placeholder={`Hi {{first_name}},\n\nThanks so much for visiting {{restaurant_name}} today...`}
                    value={form.followupEmailText}
                    onChange={handleChange}
                  />
                </div>

                <button type="submit" className="btn" disabled={saving}>
                  {saving ? "Saving…" : "Save Messages"}
                </button>
              </form>
            </>
          )}

          {section === "password" && (
            <>
              <p className="dash-subtitle" style={{ marginBottom: 24 }}>
                Change your dashboard login password.
              </p>

              {pwError && <div className="form-error">{pwError}</div>}
              {pwSuccess && (
                <div
                  className="form-error"
                  style={{ background: "#eaf7ec", color: "#1e7a34", borderColor: "#bfe6c8" }}
                >
                  Password updated.
                </div>
              )}

              <form onSubmit={handleChangePassword}>
                <div className="form-group">
                  <label htmlFor="currentPassword">Current Password</label>
                  <input
                    id="currentPassword"
                    type="password"
                    value={pwForm.currentPassword}
                    onChange={(e) => setPwForm((f) => ({ ...f, currentPassword: e.target.value }))}
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="newPassword">New Password</label>
                  <input
                    id="newPassword"
                    type="password"
                    placeholder="At least 8 characters"
                    value={pwForm.newPassword}
                    onChange={(e) => setPwForm((f) => ({ ...f, newPassword: e.target.value }))}
                    required
                    minLength={8}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="confirmPassword">Confirm New Password</label>
                  <input
                    id="confirmPassword"
                    type="password"
                    value={pwForm.confirmPassword}
                    onChange={(e) => setPwForm((f) => ({ ...f, confirmPassword: e.target.value }))}
                    required
                    minLength={8}
                  />
                </div>

                <button type="submit" className="btn" disabled={pwSaving}>
                  {pwSaving ? "Saving…" : "Change Password"}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
