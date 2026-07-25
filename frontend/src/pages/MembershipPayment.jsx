import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function MembershipPayment() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const token = sessionStorage.getItem("dynr_token");
    if (!token) {
      navigate("/membership");
    }
  }, [navigate]);

  async function handlePayment() {
    setError("");
    setLoading(true);

    try {
      const token = sessionStorage.getItem("dynr_token");
      const res = await fetch("/api/payment/complete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data?.error || "Payment failed. Please try again.");
      }

      navigate("/membership/success");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section>
      <div className="container center-block">
        <span className="eyebrow">Step 2 of 2</span>
        <h1 style={{ marginTop: "14px", marginBottom: "12px" }}>
          Complete your membership
        </h1>
        <p style={{ marginBottom: "40px" }}>
          One more step — confirm payment to activate your dynR account.
        </p>

        {error && <div className="form-error">{error}</div>}

        <div className="payment-card">
          <div className="payment-row">
            <span>Plan</span>
            <strong>dynR Membership</strong>
          </div>
          <div className="payment-row">
            <span>Billing</span>
            <strong>Monthly</strong>
          </div>
          <div className="payment-row">
            <span>Total due today</span>
            <strong>£0.00 (placeholder)</strong>
          </div>
        </div>

        <button
          className="btn"
          style={{ marginTop: "32px" }}
          onClick={handlePayment}
          disabled={loading}
        >
          {loading ? "Processing…" : "Confirm & Pay"}
        </button>

        <p style={{ marginTop: "16px", fontSize: "13px", color: "var(--muted)" }}>
          This is a placeholder payment step. Real payment processing isn't
          connected yet.
        </p>
      </div>
    </section>
  );
}