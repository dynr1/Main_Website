import { Link } from "react-router-dom";
import { FinalCta, TrialButton, TRIAL_FINE } from "../components/PageBits";

const POINTS = [
  { t: "You care who comes back.", d: "You want guests to remember your restaurant and feel remembered when they return." },
  { t: "You want your team to share the little details.", d: "Preferences and notes can help any member of staff offer a more thoughtful welcome." },
  { t: "You want to stay connected after service.", d: "Thank-yous and birthday messages give you a natural way to keep in touch." },
  { t: "You want an easier route to the next visit.", d: "Your own reservation page helps guests book directly when they are ready." },
];

const WEEK = [
  { t: "A guest scans your QR code", d: "It sits on the table or by the door. They enter their name, email, phone and birthday on their own phone. They don't download anything or make a password." },
  { t: "Your team sees who's walking in", d: "Open a guest's profile and you can see their visits, what they like, and any notes you've added. Anyone on shift can use it, not only the person with the best memory." },
  { t: "You mark the visit, we send the thank-you", d: "When a guest has been in, one tap logs the visit. About an hour later they get a friendly thank-you email, with a link to review you on Google if you've added yours." },
  { t: "Birthdays take care of themselves", d: "On a guest's birthday, a message goes out automatically, so a nice touch never depends on someone remembering." },
  { t: "Quiet Tuesday? Write to your regulars", d: "Pick the guests you want and send them a message. It goes from your own email address, so it reads like it came from you, because it did." },
];

const DIFFERENT = [
  { t: "Nothing for guests to install", d: "Everything runs in the phone's browser. If a guest can scan a QR code, they can join." },
  { t: "Emails come from you, not from us", d: "Your guests hear from your restaurant's own email address. dynR is never mentioned to them." },
  { t: "Your guest list stays yours", d: "Each restaurant's guests sit in their own protected space. We don't share, sell or reuse them." },
];

export default function ForRestaurants() {
  return (
    <div className="hm">
      <section className="hm-page-hero">
        <div className="hm-wrap">
          <p className="hm-eyebrow">For restaurants</p>
          <h1>
            Your restaurant has character.
            <br />
            <span>Your hospitality should too.</span>
          </h1>
          <p className="hm-lead">
            For independent restaurants that want to build relationships with guests, without leaving every detail to one person’s memory.
          </p>
        </div>
      </section>

      <section className="hm-section hm-section-tight">
        <div className="hm-wrap hm-two">
          <ul className="hm-statements">
            {POINTS.map((p) => (
              <li key={p.t}>
                <h3>{p.t}</h3>
                <p>{p.d}</p>
              </li>
            ))}
          </ul>
          <div className="hm-callout">
            <p className="hm-eyebrow">Start with a conversation</p>
            <h2>
              Is dynR right
              <br />
              for your restaurant?
            </h2>
            <p className="hm-lead hm-lead-sm">
              Tell us how you welcome guests today and what you would like to make easier. We’ll talk through where dynR may fit.
            </p>
            <Link to="/contact" className="hm-btn hm-btn-ghost">
              Request a 15-minute chat
            </Link>
            <p className="hm-fine">Free 15-minute chat. No obligation to join.</p>
          </div>
        </div>
      </section>

      <section className="hm-tint">
        <div className="hm-wrap">
          <p className="hm-eyebrow">What it looks like in practice</p>
          <h2>A week with dynR.</h2>
          <ol className="hm-timeline">
            {WEEK.map((w, i) => (
              <li key={w.t}>
                <small>{String(i + 1).padStart(2, "0")}</small>
                <div>
                  <h3>{w.t}</h3>
                  <p>{w.d}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="hm-section">
        <div className="hm-wrap">
          <p className="hm-eyebrow">Why restaurants choose dynR</p>
          <h2>Simple for guests.<br />Yours to keep.</h2>
          <div className="hm-features hm-features-3">
            {DIFFERENT.map((d) => (
              <div key={d.t} className="hm-feature">
                <h3>{d.t}</h3>
                <p>{d.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="hm-section hm-section-tight">
        <div className="hm-wrap hm-price-grid">
          <div>
            <p className="hm-eyebrow">One simple membership</p>
            <h2>£79 a month.<br />First 2 months free.</h2>
            <p className="hm-lead">Try dynR with your own guests before your first payment. Cancel any time.</p>
            <Link to="/membership" className="hm-link">
              See membership details <i>↗</i>
            </Link>
          </div>
          <div className="hm-callout">
            <TrialButton block />
            <p className="hm-fine">{TRIAL_FINE}</p>
          </div>
        </div>
      </section>

      <FinalCta />
    </div>
  );
}
