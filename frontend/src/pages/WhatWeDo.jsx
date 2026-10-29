import { Link } from "react-router-dom";
import { FinalCta } from "../components/PageBits";

const FEATURES = [
  {
    t: "QR guest signups",
    d: "Give guests a simple way to join your guest list. One scan, with no app to download.",
    ex: { h: "A simple invitation", q: "“Stay in touch with us.”", p: "Place your QR code where guests can find it, and let them choose to join." },
  },
  {
    t: "Guest profiles",
    d: "Keep visits, preferences and notes together so your whole team can offer a more personal welcome.",
    ex: { h: "A familiar welcome", q: "“Alex prefers the window table.”", p: "A useful note makes it easier for the next team member to offer the same thoughtful service." },
  },
  {
    t: "Google review invitations",
    d: "Help guests share an honest review. Make it easier for future diners to hear about their experience.",
    ex: { h: "An honest invitation", q: "“How was your visit? Share your experience on Google.”", p: "Invite feedback without asking for a particular rating." },
  },
  {
    t: "Direct reservations",
    d: "Give guests your own booking page, with reservations arriving in your dashboard.",
    ex: { h: "An easy next step", q: "“Book your next visit.”", p: "Give guests a direct route to your own reservation page." },
  },
  {
    t: "Automatic follow-ups",
    d: "Keep the connection going with post-visit thank-yous and birthday messages from your own email address.",
    ex: { h: "A thoughtful follow-up", q: "“Thank you for dining with us.”", p: "Continue the relationship from your restaurant’s own email address." },
  },
  {
    t: "Your own private space",
    d: "Keep your restaurant’s guest information separate from other restaurants.",
    ex: { h: "Your restaurant, your space", q: "Private to your restaurant.", p: "Guest information stays separate from other restaurants, ready for your team to use." },
  },
];

const STEPS = [
  { t: "Join dynR", d: "Add your restaurant details and card. Nothing is charged for two months." },
  { t: "Make it yours", d: "Get your login by email and configure your email settings." },
  { t: "Invite your guests", d: "Print your QR code and put it where guests can easily find it." },
  { t: "Build the relationship", d: "Get to know your guests, welcome bookings and keep in touch." },
];

export default function WhatWeDo() {
  return (
    <div className="hm">
      <section className="hm-page-hero">
        <div className="hm-wrap">
          <p className="hm-eyebrow">The platform</p>
          <h1>
            Less to remember.
            <br />
            <span>More to recognise.</span>
          </h1>
          <p className="hm-lead">
            Keep the details that matter close to your team. From a guest’s first scan to their next reservation, dynR helps you carry
            good hospitality beyond the table.
          </p>
        </div>
      </section>

      <section className="hm-section hm-section-tight">
        <div className="hm-wrap">
          {FEATURES.map((f) => (
            <div key={f.t} className="hm-row">
              <div>
                <h2 className="hm-h3-lg">{f.t}</h2>
                <p className="hm-lead hm-lead-sm">{f.d}</p>
              </div>
              <div className="hm-ex">
                <small>Illustrative example</small>
                <h3>{f.ex.h}</h3>
                <p className="hm-ex-q">{f.ex.q}</p>
                <p>{f.ex.p}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="hm-tint">
        <div className="hm-wrap">
          <h2>
            A few steps.
            <br />
            A more connected service.
          </h2>
          <ol className="hm-steps">
            {STEPS.map((s, i) => (
              <li key={s.t}>
                <small>{String(i + 1).padStart(2, "0")}</small>
                <h3>{s.t}</h3>
                <p>{s.d}</p>
              </li>
            ))}
          </ol>
          <p className="hm-more">
            Prefer to talk it through? <Link to="/contact">Request a 15-minute chat</Link>
          </p>
        </div>
      </section>

      <FinalCta />
    </div>
  );
}
