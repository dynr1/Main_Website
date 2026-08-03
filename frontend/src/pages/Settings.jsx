import { useState, useEffect } from "react";
import { API_URL } from "../api";

export default function Settings() {
  const [section, setSection] = useState("setup"); // "setup" | "messages"

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
  const [paymentStatus, setPaymentStatus] = useState("unpaid");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [billingLoading, setBillingLoading] = useState(false);
  const [billingError, setBillingError] = useState("");

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
          setPaymentStatus(data.settings.payment_status || "unpaid");
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

  async function handleSubscribe() {
    setBillingError("");
    setBillingLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/create-checkout-session`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();

      if (!res.ok || !data.url) {
        throw new Error(data?.error || "Failed to start checkout.");
      }

      window.location.href = data.url;
    } catch (err) {
      setBillingError(err.message);
      setBillingLoading(false);
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

              <div style={{ marginBottom: 28, padding: 16, background: "#f7f5f2", borderRadius: 8 }}>
                <h4 style={{ marginBottom: 8 }}>Billing</h4>
                {paymentStatus === "paid" ? (
                  <p style={{ color: "#1e7a34" }}>Your subscription is active.</p>
                ) : (
                  <>
                    <p style={{ marginBottom: 12 }}>
                      Your subscription isn't active yet.
                    </p>
                    {billingError && <div className="form-error">{billingError}</div>}
                    <button
                      type="button"
                      className="btn"
                      onClick={handleSubscribe}
                      disabled={billingLoading}
                    >
                      {billingLoading ? "Redirecting…" : "Subscribe now"}
                    </button>
                  </>
                )}
              </div>

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
        </div>
      </div>
    </div>
  );
}
