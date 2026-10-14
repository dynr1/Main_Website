import { useState } from "react";
import { Link } from "react-router-dom";
import { API_URL } from "../api";

const initialForm = {
  restaurantName: "",
  email: "",
  phone: "",
  password: "",
  website: "", // honeypot — hidden from people, bots fill it in
};

export default function RegisterMember() {
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [paymentFailed, setPaymentFailed] = useState(false);
  const [loading, setLoading] = useState(false);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    let redirecting = false;

    try {
      const res = await fetch(`${API_URL}/api/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || "Something went wrong. Please try again.");
      }
      setForm(initialForm);
      if (data.checkoutUrl) {
        // Straight on to the £79/month payment page.
        redirecting = true;
        window.location.href = data.checkoutUrl;
        return;
      }
      setPaymentFailed(Boolean(data.paymentFailed));
      setSuccess(true);
    } catch (err) {
      setError(err.message);
    } finally {
      if (!redirecting) setLoading(false);
    }
  }

  if (success) {
    return (
      <section>
        <div className="container content-block">
          <span className="eyebrow">{paymentFailed ? "One more step" : "Welcome to dynR"}</span>
          <h1 style={{ marginTop: "14px", marginBottom: "24px" }}>
            {paymentFailed ? "We couldn't open the payment page" : "You're registered"}
          </h1>
          <p>
            {paymentFailed
              ? "Your dashboard has been created, but the payment page didn't open, so your free trial hasn't started. Please email hello@dynr.co.uk and we'll send you a payment link straight away."
              : "Your dashboard has been created. Your login details will be emailed to you."}
          </p>
          <Link className="btn" to="/login">
            Go to login
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section>
      <div className="container content-block">
        <span className="eyebrow">Register as a member</span>
        <h1 style={{ marginTop: "14px", marginBottom: "32px" }}>
          Create your restaurant account
        </h1>

        {error && <div className="form-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="restaurantName">Restaurant Name</label>
            <input
              id="restaurantName"
              name="restaurantName"
              type="text"
              placeholder="The Olive Branch"
              value={form.restaurantName}
              onChange={handleChange}
              required
              maxLength={120}
            />
          </div>

          <div className="form-group">
            <label htmlFor="email">Restaurant Email</label>
            <input
              id="email"
              name="email"
              type="email"
              placeholder="jane@restaurant.com"
              value={form.email}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="phone">Contact Number</label>
            <input
              id="phone"
              name="phone"
              type="tel"
              placeholder="07123 456789"
              value={form.phone}
              onChange={handleChange}
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Dashboard Password</label>
            <input
              id="password"
              name="password"
              type="password"
              placeholder="At least 8 characters"
              value={form.password}
              onChange={handleChange}
              required
              minLength={8}
            />
          </div>

          {/* Honeypot */}
          <div style={{ position: "absolute", left: "-9999px" }} aria-hidden="true">
            <label htmlFor="website">Website</label>
            <input
              id="website"
              name="website"
              type="text"
              tabIndex={-1}
              autoComplete="off"
              value={form.website}
              onChange={handleChange}
            />
          </div>

          <p style={{ fontSize: "16px", color: "var(--muted)" }}>
            First 2 months free, then £79 per month. You'll add your card on the next page, but nothing is charged until the trial ends. Cancel any time.
          </p>

          <button type="submit" className="btn" disabled={loading}>
            {loading ? "Creating account…" : "Register & make payment"}
          </button>
        </form>
      </div>
    </section>
  );
}
