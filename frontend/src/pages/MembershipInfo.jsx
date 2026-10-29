import { Link } from "react-router-dom";
import { Accordion, FinalCta, TrialButton, TRIAL_FINE } from "../components/PageBits";

// Put your guide video here. Either:
//  - a YouTube/Vimeo EMBED link, e.g. "https://www.youtube.com/embed/XXXXXXXXXXX"
//  - or a file in frontend/public, e.g. "/videos/become-a-member.mp4"
// Leave empty to hide the video section until you have one.
const GUIDE_VIDEO_URL = "";

const INCLUDED = ["QR guest signups", "Guest profiles", "Google review invitations", "Direct reservations", "Automatic follow-ups", "Your own private space"];

const OFFERS = [
  { t: "Guest sign-up by QR code", d: "Guests join in seconds from a QR code on the table or at the door. No app to download." },
  { t: "Guest profiles", d: "Every visit, preference and note in one place, so any member of staff knows who is walking in." },
  { t: "Table reservations", d: "Your own booking page, with reservations landing straight in your dashboard." },
  { t: "Automatic follow-ups", d: "A thank-you after each visit and birthday messages, sent from your own email address." },
  { t: "Your own private space", d: "Your guests' data lives in its own protected folder, separate from every other restaurant." },
];

const BENEFITS = [
  "Turn first-time guests into regulars",
  "Fill your quiet nights with the people who already love you",
  "Make hospitality personal without relying on one person's memory",
  "Keep your guest list yours, with emails sent from your own address",
  "Set up with no technical skills needed",
];

const STEPS = [
  { t: "Join dynR", d: "Add your restaurant details and card. Nothing is charged for two months." },
  { t: "Make it yours", d: "Get your login by email and configure your email settings." },
  { t: "Invite your guests", d: "Print your QR code and put it where guests can easily find it." },
  { t: "Build the relationship", d: "Get to know your guests, welcome bookings and keep in touch." },
];

const FAQS = [
  { q: "What does the membership cost?", a: "The first two months are free. After that it is £79 a month, taken automatically from the card you add when you join." },
  { q: "Can I cancel?", a: "Yes, any time. You can cancel from Settings in your dashboard and you will not be charged again." },
  { q: "Who sends emails to my guests?", a: "You do, from your own email address. You connect your restaurant's email in Settings, and guests never see dynR mentioned." },
  { q: "Will dynR guarantee more bookings or better reviews?", a: "No. dynR can't promise results. It gives you a simple way to remember your guests, stay in touch and make it easy to book again or leave an honest review." },
  { q: "What do I need to set up?", a: "Your restaurant details and a card to start. Then connect your own email in Settings (there's a step-by-step guide and a test button) and print your QR code." },
];

function GuideVideo() {
  if (GUIDE_VIDEO_URL.match(/\.(mp4|webm|mov)$/i)) {
    return <video src={GUIDE_VIDEO_URL} controls className="hm-video" />;
  }
  return (
    <div className="hm-video-frame">
      <iframe
        src={GUIDE_VIDEO_URL}
        title="How to start with dynR"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; picture-in-picture"
        allowFullScreen
      />
    </div>
  );
}

export default function MembershipInfo() {
  return (
    <div className="hm">
      <section className="hm-page-hero">
        <div className="hm-wrap hm-price-grid">
          <div>
            <p className="hm-eyebrow">Membership</p>
            <h1>
              Make room for
              <br />
              <span>more regulars.</span>
            </h1>
            <p className="hm-lead">
              Bring your guest relationships together. Try dynR for two months before your first payment, then continue for £79/month.
            </p>
            <p className="hm-lead">Explore it with real service, your own team and your own guests. Decide whether it fits the way you work.</p>
            <div className="hm-cta-row">
              <Link to="/contact" className="hm-btn hm-btn-ghost">
                Request a 15-minute chat
              </Link>
            </div>
            <p className="hm-fine">Prefer to talk first? The chat is free.</p>
          </div>

          <div className="hm-price-card">
            <div className="hm-price-top">
              <span>dynR membership</span>
              <span>2 months free</span>
            </div>
            <div className="hm-price-body">
              <p className="hm-eyebrow">Then one simple price</p>
              <p className="hm-price">
                <b>£79</b> / month
              </p>
              <p className="hm-price-sub">Your tools for lasting guest relationships.</p>
              <ul>
                {INCLUDED.map((x) => (
                  <li key={x}>
                    <i>✓</i>
                    {x}
                  </li>
                ))}
              </ul>
              <TrialButton block />
              <p className="hm-fine">{TRIAL_FINE}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="hm-section hm-section-tight">
        <div className="hm-wrap">
          <p className="hm-eyebrow">What we offer</p>
          <h2>Everything in one place.</h2>
          <div className="hm-features">
            {OFFERS.map((o) => (
              <div key={o.t} className="hm-feature">
                <h3>{o.t}</h3>
                <p>{o.d}</p>
              </div>
            ))}
            <div className="hm-feature hm-feature-dark">
              <h3>How your restaurant benefits</h3>
              <ul className="hm-mini-list">
                {BENEFITS.map((b) => (
                  <li key={b}>
                    <i>✓</i>
                    {b}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section className="hm-tint">
        <div className="hm-wrap">
          <p className="hm-eyebrow">Getting started</p>
          <h2>From signup to your first guest.</h2>
          <ol className="hm-steps">
            {STEPS.map((s, i) => (
              <li key={s.t}>
                <small>{String(i + 1).padStart(2, "0")}</small>
                <h3>{s.t}</h3>
                <p>{s.d}</p>
              </li>
            ))}
          </ol>
          {GUIDE_VIDEO_URL && (
            <div className="hm-video-wrap">
              <GuideVideo />
            </div>
          )}
        </div>
      </section>

      <section className="hm-section">
        <div className="hm-wrap hm-faq-grid">
          <div>
            <h2>
              Clear terms.
              <br />
              Time to try it.
            </h2>
            <p className="hm-lead hm-lead-sm">Explore dynR in your restaurant before your first payment. You can cancel anytime.</p>
            <Link to="/faq" className="hm-link">
              Read all FAQs <i>↗</i>
            </Link>
          </div>
          <Accordion items={FAQS} />
        </div>
      </section>

      <FinalCta />
    </div>
  );
}
