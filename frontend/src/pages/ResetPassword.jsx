import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { API_URL } from "../api";

export default function ResetPassword() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (newPassword !== confirmPassword) {
      setError("Passwords don't match.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || "Something went wrong. Please try again.");
      }

      setSuccess(true);
      setTimeout(() => navigate("/login"), 2000);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <section>
        <div className="container content-block">
          <span className="eyebrow">Restaurant Sign In</span>
          <h1 style={{ marginTop: "14px", marginBottom: "24px" }}>
            Reset your password
          </h1>
          <div className="form-error">
            This link is missing its reset token. Please use the link from
            your email, or{" "}
            <a href="/forgot-password">request a new one</a>.
          </div>
        </div>
      </section>
    );
  }

  return (
    <section>
      <div className="container content-block">
        <span className="eyebrow">Restaurant Sign In</span>
        <h1 style={{ marginTop: "14px", marginBottom: "24px" }}>
          Choose a new password
        </h1>

        {error && <div className="form-error">{error}</div>}

        {success ? (
          <div
            className="form-error"
            style={{
              background: "#eaf7ec",
              color: "#1e7a34",
              borderColor: "#bfe6c8",
            }}
          >
            Password updated — redirecting you to sign in…
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="newPassword">New Password</label>
              <input
                id="newPassword"
                name="newPassword"
                type="password"
                placeholder="At least 8 characters"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={8}
                autoFocus
              />
            </div>

            <div className="form-group">
              <label htmlFor="confirmPassword">Confirm New Password</label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                placeholder="Re-enter your new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={8}
              />
            </div>

            <button type="submit" className="btn" disabled={loading}>
              {loading ? "Updating…" : "Update password"}
            </button>
          </form>
        )}
      </div>
    </section>
  );
}