import { useState, useEffect } from "react";
import { API_URL } from "../api";

// Each provider: the server details are filled in for you, plus the steps for getting a password.
const PROVIDERS = {
  gmail: {
    label: "Gmail or Google Workspace",
    host: "smtp.gmail.com",
    port: "587",
    passLabel: "Gmail App Password (16 letters)",
    steps: [
      "Sign in to your Google account at myaccount.google.com.",
      "Open Security and turn on 2-Step Verification if it isn't on already. Google requires this.",
      "Go to myaccount.google.com/apppasswords. (If you can't find it, search \"App passwords\" in the search bar at the top of your Google account.)",
      "Type a name such as dynR and press Create.",
      "Google shows a 16-letter password. Copy it and paste it below. Spaces don't matter.",
    ],
    note: "Use this App Password here, not your normal Gmail password.",
  },
  outlook: {
    label: "Outlook, Hotmail or Microsoft 365",
    host: "smtp-mail.outlook.com",
    port: "587",
    passLabel: "App password or email password",
    steps: [
      "Sign in at account.microsoft.com and open Security.",
      "Turn on two-step verification, then create an app password.",
      "Paste that app password below.",
    ],
    note: "Microsoft often blocks this kind of sign-in, especially for work accounts. If the test fails, a Gmail address is the easiest option.",
  },
  yahoo: {
    label: "Yahoo Mail",
    host: "smtp.mail.yahoo.com",
    port: "465",
    passLabel: "Yahoo App Password",
    steps: [
      "Sign in to your Yahoo account and open Account security.",
      "Turn on two-step verification if needed.",
      "Choose Generate app password, name it dynR, and copy the password.",
      "Paste it below.",
    ],
    note: "Use the app password here, not your normal Yahoo password.",
  },
  other: {
    label: "Other email provider",
    host: "",
    port: "587",
    passLabel: "Email password or app password",
    steps: [
      "Ask your email provider (or your web person) for the SMTP server name and port.",
      "Most providers use port 587. Some use 465.",
    ],
    note: "",
  },
};

function detectProvider(host) {
  const h = (host || "").toLowerCase();
  if (!h) return "gmail";
  if (h.includes("gmail") || h.includes("googlemail")) return "gmail";
  if (h.includes("outlook") || h.includes("office365") || h.includes("hotmail")) return "outlook";
  if (h.includes("yahoo")) return "yahoo";
  return "other";
}

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
  const [billing, setBilling] = useState(null);
  const [billingBusy, setBillingBusy] = useState(false);
  const [provider, setProvider] = useState("gmail");
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null); // { ok, message }

  const token = sessionStorage.getItem("dynr_token");

  useEffect(() => {
    async function loadSettings() {
      try {
        const res = await fetch(`${API_URL}/api/settings`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();

        if (res.ok && data.settings) {
          setProvider(detectProvider(data.settings.smtp_host));
          setForm({
            smtpHost: data.settings.smtp_host || PROVIDERS.gmail.host,
            smtpPort: data.settings.smtp_port || PROVIDERS.gmail.port,
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
    fetch(`${API_URL}/api/billing`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : null))
      .then((b) => b && setBilling(b))
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Opens Stripe: the payment page, or the page to update the card / cancel.
  async function openBilling(kind) {
    setBillingBusy(true);
    setError("");
    try {
      const res = await fetch(`${API_URL}/api/billing/${kind}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Something went wrong.");
      window.location.href = data.url;
    } catch (err) {
      setError(err.message);
      setBillingBusy(false);
    }
  }

  function handleChange(e) {
    const { name, value } = e.target;
    setTestResult(null);
    setForm((f) => ({ ...f, [name]: value }));
  }

  function chooseProvider(key) {
    setProvider(key);
    setTestResult(null);
    const p = PROVIDERS[key];
    // Fill in the server details so the owner doesn't have to know them.
    setForm((f) => ({
      ...f,
      smtpHost: key === "other" ? (detectProvider(f.smtpHost) === "other" ? f.smtpHost : "") : p.host,
      smtpPort: p.port,
    }));
  }

  async function sendTestEmail() {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch(`${API_URL}/api/settings/test-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "The test email could not be sent.");
      setTestResult({
        ok: true,
        message: `Test email sent to ${data.sentTo}. Check that inbox (and spam). If it arrived, press Save settings.`,
      });
    } catch (err) {
      setTestResult({ ok: false, message: err.message });
    } finally {
      setTesting(false);
    }
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
    <div className="dx-settings">
      <div className="dx-head">
        <div>
          <h1>Restaurant settings</h1>
          <p className="dx-muted">Connect your own email so messages send from your restaurant, not dynR.</p>
        </div>
      </div>

      <div className="dx-card dx-settings-card">
        <div>
          {error && <div className="form-error">{error}</div>}
          {success && (
            <div
              className="form-error"
              style={{ background: "#eaf7ec", color: "#1e7a34", borderColor: "#bfe6c8" }}
            >
              Settings saved.
            </div>
          )}

          {billing && (
            <div style={{ marginBottom: 28 }}>
              <h4 style={{ marginBottom: 12 }}>Membership</h4>
              {billing.paymentStatus === "paid" ? (
                <>
                  <p style={{ fontSize: 16 }}>
                    <span className="dash-tag" style={{ background: "#eaf7ec", color: "#1e7a34" }}>
                      Active ✓
                    </span>{" "}
                    First 2 months free, then £79 per month. You can cancel any time.
                  </p>
                  {billing.canManage && (
                    <button
                      type="button"
                      className="btn"
                      onClick={() => openBilling("portal")}
                      disabled={billingBusy}
                    >
                      {billingBusy ? "Opening…" : "Manage or cancel subscription"}
                    </button>
                  )}
                </>
              ) : (
                <>
                  <p style={{ fontSize: 16 }}>
                    <span className="dash-tag" style={{ background: "#fdeceb", color: "#b3261e" }}>
                      Not active yet
                    </span>{" "}
                    Your first 2 months are free, then £79 per month. Add your card to start; you can cancel any time.
                  </p>
                  {billing.configured && (
                    <button
                      type="button"
                      className="btn"
                      onClick={() => openBilling("checkout")}
                      disabled={billingBusy}
                    >
                      {billingBusy ? "Opening…" : "Start free trial"}
                    </button>
                  )}
                </>
              )}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <h4 style={{ marginBottom: 12 }}>Your email</h4>
            <p style={{ fontSize: 16, color: "var(--muted)", marginBottom: 20 }}>
              Connect your restaurant's own email so guest messages come from you, not from dynR.
            </p>

            <div className="form-group">
              <label htmlFor="provider">Who provides your email?</label>
              <select
                id="provider"
                value={provider}
                onChange={(e) => chooseProvider(e.target.value)}
                className="email-select"
              >
                {Object.entries(PROVIDERS).map(([key, p]) => (
                  <option key={key} value={key}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="email-guide">
              <strong>How to get your password</strong>
              <ol>
                {PROVIDERS[provider].steps.map((st) => (
                  <li key={st}>{st}</li>
                ))}
              </ol>
              {PROVIDERS[provider].note && <p>{PROVIDERS[provider].note}</p>}
            </div>

            <div className="form-group">
              <label htmlFor="smtpUser">Your email address</label>
              <input
                id="smtpUser"
                name="smtpUser"
                type="email"
                placeholder="hello@yourrestaurant.com"
                value={form.smtpUser}
                onChange={handleChange}
                autoComplete="off"
              />
            </div>

            <div className="form-group">
              <label htmlFor="smtpPass">{PROVIDERS[provider].passLabel}</label>
              <input
                id="smtpPass"
                name="smtpPass"
                type="password"
                placeholder="••••••••••••••••"
                value={form.smtpPass}
                onChange={handleChange}
                autoComplete="new-password"
              />
            </div>

            {provider === "other" && (
              <>
                <div className="form-group">
                  <label htmlFor="smtpHost">Mail server</label>
                  <input
                    id="smtpHost"
                    name="smtpHost"
                    type="text"
                    placeholder="smtp.yourprovider.com"
                    value={form.smtpHost}
                    onChange={handleChange}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="smtpPort">Port</label>
                  <input
                    id="smtpPort"
                    name="smtpPort"
                    type="text"
                    placeholder="587"
                    value={form.smtpPort}
                    onChange={handleChange}
                  />
                </div>
              </>
            )}

            <div className="email-test">
              <button
                type="button"
                className="btn btn-ghost"
                onClick={sendTestEmail}
                disabled={testing}
              >
                {testing ? "Sending test…" : "Send test email"}
              </button>
              <span className="email-test__hint">Sends a test to your own address. Nobody else is emailed.</span>
            </div>

            {testResult && (
              <div
                className="form-error"
                role="status"
                style={
                  testResult.ok
                    ? { background: "#eaf7ec", color: "#1e7a34", borderColor: "#bfe6c8" }
                    : undefined
                }
              >
                {testResult.message}
              </div>
            )}

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
              {saving ? "Saving…" : "Save settings"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}