import { useState, useEffect } from "react";

export default function AdminGate({ children }) {
  const [unlocked, setUnlocked] = useState(false);
  const [checking, setChecking] = useState(true);
  const [passcode, setPasscode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const token = sessionStorage.getItem("dynr_admin_token");
    setUnlocked(!!token);
    setChecking(false);
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/admin/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passcode }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || "Incorrect passcode.");
      }

      sessionStorage.setItem("dynr_admin_token", data.adminToken);
      window.dispatchEvent(new Event("dynr-admin-unlock"));
      setUnlocked(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (checking) return null;

  if (!unlocked) {
    return (
      <section>
        <div className="container content-block">
          <span className="eyebrow">Admin only</span>
          <h1 style={{ marginTop: "14px", marginBottom: "24px" }}>
            Enter passcode
          </h1>

          {error && <div className="form-error">{error}</div>}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="passcode">Passcode</label>
              <input
                id="passcode"
                type="password"
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
                required
                autoFocus
              />
            </div>
            <button type="submit" className="btn" disabled={loading}>
              {loading ? "Checking…" : "Unlock"}
            </button>
          </form>
        </div>
      </section>
    );
  }

  return children;
}