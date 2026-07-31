import { useState } from "react";
import { API_URL } from "../api";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/api/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || "Something went wrong. Please try again.");
      }

      setSent(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section>
      <div className="container content-block">
        <span className="eyebrow">Restaurant Sign In</span>
        <h1 style={{ marginTop: "14px", marginBottom: "24px" }}>
          Reset your password
        </h1>

        {error && <div className="form-error">{error}</div>}

        {sent ? (
          <div
            className="form-error"
            style={{
              background: "#eaf7ec",
              color: "#1e7a34",
              borderColor: "#bfe6c8",
            }}
          >
            If an account exists for that email, a reset link is on its way —
            check your inbox. The link is valid for 1 hour.
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                name="email"
                type="email"
                placeholder="jane@restaurant.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
              />
            </div>

            <button type="submit" className="btn" disabled={loading}>
              {loading ? "Sending…" : "Send reset link"}
            </button>
          </form>
        )}

        <p style={{ marginTop: "16px" }}>
          <a href="/login">Back to sign in</a>
        </p>
      </div>
    </section>
  );
}