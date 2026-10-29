import { useState } from "react";
import { Link } from "react-router-dom";
import { API_URL } from "../api";

const initialForm = {
  name: "",
  restaurant: "",
  email: "",
  phone: "",
  message: "",
};

export default function Contact() {
  const [form, setForm] = useState(initialForm);
  const [status, setStatus] = useState("idle"); // idle | sending | success | error
  const [errorMsg, setErrorMsg] = useState("");

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setStatus("sending");
    setErrorMsg("");

    try {
      const res = await fetch(`${API_URL}/api/contact`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || "Something went wrong. Please try again.");
      }

      setStatus("success");
      setForm(initialForm);
    } catch (err) {
      setStatus("error");
      setErrorMsg(err.message);
    }
  }

  return (
    <>
      <section className="contact-page">
        <div className="container contact-grid">
          <div className="contact-copy">
            <h1>Let's talk</h1>
            <p className="hero-lede">
              Tell us a bit about your restaurant and we'll be in touch within
              a day.
            </p>

            <dl className="contact-facts">
              <div>
                <dt>Email</dt>
                <dd>
                  <a href="mailto:hello@dynr.co.uk">hello@dynr.co.uk</a>
                </dd>
              </div>
              <div>
                <dt>What to expect</dt>
                <dd>A free 15-minute chat. No pitch, no pressure.</dd>
              </div>
              <div>
                <dt>Ready to start now?</dt>
                <dd>
                  <Link to="/register-as-member" className="link-cta">
                    Become a member
                  </Link>
                </dd>
              </div>
            </dl>
          </div>

          <div className="auth-card">
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="name">Name</label>
              <input
                id="name"
                name="name"
                placeholder="Jane Smith"
                value={form.name}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="restaurant">Restaurant Name</label>
              <input
                id="restaurant"
                name="restaurant"
                placeholder="The Olive Branch"
                value={form.restaurant}
                onChange={handleChange}
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
              <label htmlFor="phone">Phone</label>
              <input
                id="phone"
                name="phone"
                placeholder="07123 456789"
                value={form.phone}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label htmlFor="message">Message</label>
              <textarea
                id="message"
                name="message"
                placeholder="Tell us about your restaurant..."
                value={form.message}
                onChange={handleChange}
              />
            </div>

            <button type="submit" className="btn" disabled={status === "sending"}>
              {status === "sending" ? "Sending…" : "Send message"}
            </button>

            {status === "success" && (
              <p style={{ color: "#1e7a34", marginTop: "16px" }}>
                Thanks — we've received your message and will be in touch
                within a day.
              </p>
            )}

            {status === "error" && (
              <p style={{ color: "#b3261e", marginTop: "16px" }}>{errorMsg}</p>
            )}
          </form>
          </div>
        </div>
      </section>
    </>
  );
}