import { useState } from "react";
import { API_URL } from "../api";
import { FinalCta } from "../components/PageBits";

const TOPICS = [
  "Bringing guests back",
  "Remembering guest details",
  "Getting more Google reviews",
  "Taking bookings directly",
  "Staying in touch with guests",
  "I'm not sure yet",
];

const initialForm = { name: "", restaurant: "", email: "", phone: "", topic: TOPICS[0], extra: "" };

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

    // The server expects name, email, restaurant and message. Phone and the topic go in the message.
    const message = [
      `Would most like help with: ${form.topic}`,
      form.phone ? `Phone: ${form.phone}` : "",
      form.extra ? `\n${form.extra}` : "",
    ]
      .filter(Boolean)
      .join("\n");

    try {
      const res = await fetch(`${API_URL}/api/contact`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: form.name, email: form.email, restaurant: form.restaurant, phone: form.phone, message }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Something went wrong. Please try again.");
      setStatus("success");
      setForm(initialForm);
    } catch (err) {
      setStatus("error");
      setErrorMsg(err.message);
    }
  }

  return (
    <div className="hm">
      <section className="hm-page-hero hm-contact">
        <div className="hm-wrap hm-two">
          <div>
            <p className="hm-eyebrow">Contact</p>
            <h1>
              Let’s talk about
              <br />
              <span>your restaurant.</span>
            </h1>
            <p className="hm-lead">A free 15-minute chat to explore how you welcome guests today, and where dynR could help.</p>
            <ul className="hm-ticks">
              <li><i>✓</i>Tell us what you want to make easier</li>
              <li><i>✓</i>See how the platform fits your service</li>
              <li><i>✓</i>Get answers before deciding to join</li>
            </ul>
            <p className="hm-fine">No obligation to join.</p>
            <div className="hm-email-line">
              <small>Prefer email?</small>
              <a href="mailto:hello@dynr.co.uk">hello@dynr.co.uk</a>
            </div>
          </div>

          <div className="hm-form-card">
            <h2>Request your 15-minute chat</h2>
            <p className="hm-lead hm-lead-sm">A few details to help us understand your restaurant.</p>

            {status === "success" ? (
              <div className="hm-success" role="status">
                <b>Thank you, we've got your request.</b>
                <p>We'll be in touch within a day to arrange your chat.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="hm-form">
                <div className="hm-form-row">
                  <label>
                    Your name
                    <input name="name" value={form.name} onChange={handleChange} placeholder="Jane Smith" required />
                  </label>
                  <label>
                    Restaurant name
                    <input name="restaurant" value={form.restaurant} onChange={handleChange} placeholder="The Olive Branch" />
                  </label>
                </div>
                <label>
                  Email address
                  <input type="email" name="email" value={form.email} onChange={handleChange} placeholder="jane@restaurant.com" required />
                </label>
                <label>
                  Phone number <span className="hm-opt">(optional)</span>
                  <input type="tel" name="phone" value={form.phone} onChange={handleChange} placeholder="07123 456789" />
                </label>
                <label>
                  What would you most like help with?
                  <select name="topic" value={form.topic} onChange={handleChange}>
                    {TOPICS.map((t) => (
                      <option key={t}>{t}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Anything else? <span className="hm-opt">(optional)</span>
                  <textarea name="extra" rows="4" value={form.extra} onChange={handleChange} placeholder="Tell us a little about your restaurant." />
                </label>
                <button type="submit" className="hm-btn hm-btn-primary hm-btn-block" disabled={status === "sending"}>
                  {status === "sending" ? "Sending…" : "Request my chat"} <i>↗</i>
                </button>
                {status === "error" && <p className="hm-error" role="alert">{errorMsg}</p>}
              </form>
            )}
          </div>
        </div>
      </section>

      <FinalCta />
    </div>
  );
}
