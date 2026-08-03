import { useState } from "react";
import { API_URL } from "../api";

export default function JoinUs() {
  const [form, setForm] = useState({
    restaurantName: "",
    contactName: "",
    email: "",
    phone: "",
    message: "",
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/api/membership-inquiry`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || "Something went wrong. Please try again.");
      }

      setSuccess(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <section>
        <div className="container center-block">
          <span className="eyebrow">Join dynR</span>
          <h1>Know every guest who walks through your door.</h1>
        </div>
      </section>

      {/* Our story — condensed excerpt, roughly a quarter of the page */}
      <section style={{ paddingTop: 0 }}>
        <div className="container content-block">
          <p>
            Years on the floor of busy restaurants taught us something most
            people don't say out loud: guests don't stop coming back because
            the food or the service was bad. Most nights, everything goes
            right — they just don't feel remembered the next time they walk
            back in.
          </p>
          <p>
            That's why we built dynR — a simple way for any restaurant to
            keep track of who their guests are, what they like, and when
            they last visited, so every return visit feels personal.{" "}
            <a href="/our-story">Read the full story →</a>
          </p>
        </div>
      </section>

      <section className="section-alt">
        <div className="container content-block">
          <span className="eyebrow">Become a Member</span>
          <h2 style={{ marginTop: "14px", marginBottom: "8px" }}>
            Tell us about your restaurant
          </h2>
          <p style={{ marginBottom: "28px", opacity: 0.85 }}>
            Fill this in and we'll get back to you to set up your dynR
            account — no self-signup, we like to actually talk to the
            restaurants we work with first.
          </p>

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
              Thanks — we've got your details and will be in touch shortly.
            </div>
          ) : (
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
                />
              </div>

              <div className="form-group">
                <label htmlFor="contactName">Your Name</label>
                <input
                  id="contactName"
                  name="contactName"
                  type="text"
                  placeholder="Jane Smith"
                  value={form.contactName}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="email">Email</label>
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
                <label htmlFor="phone">Phone (optional)</label>
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
                <label htmlFor="message">Anything else we should know?</label>
                <textarea
                  id="message"
                  name="message"
                  rows={4}
                  placeholder="Tell us a bit about your restaurant..."
                  value={form.message}
                  onChange={handleChange}
                />
              </div>

              <button type="submit" className="btn" disabled={loading}>
                {loading ? "Sending…" : "Become a Member"}
              </button>
            </form>
          )}
        </div>
      </section>
    </>
  );
}
