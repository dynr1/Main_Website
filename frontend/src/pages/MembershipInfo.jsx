import { Link } from "react-router-dom";

// Put your guide video here. Either:
//  - a YouTube/Vimeo EMBED link, e.g. "https://www.youtube.com/embed/XXXXXXXXXXX"
//  - or a file in frontend/public, e.g. "/videos/become-a-member.mp4"
// Leave empty to show a "coming soon" placeholder.
const GUIDE_VIDEO_URL = "";

const offers = [
  {
    title: "Guest sign-up by QR code",
    text: "Guests join in seconds from a QR code on the table or at the door. No app to download.",
  },
  {
    title: "Guest profiles",
    text: "Every visit, preference and note in one place, so any member of staff knows who is walking in.",
  },
  {
    title: "Table reservations",
    text: "Your own booking page, with reservations landing straight in your dashboard.",
  },
  {
    title: "Automatic follow-ups",
    text: "A thank-you after each visit and birthday messages, sent from your own email address.",
  },
  {
    title: "Your own private space",
    text: "Your guests' data lives in its own protected folder, separate from every other restaurant.",
  },
];

const benefits = [
  "Turn first-time guests into regulars",
  "Fill your quiet nights with the people who already love you",
  "Make hospitality personal without relying on one person's memory",
  "Keep your guest list yours, with emails sent from your own address",
  "Set up in minutes, with no technical skills needed",
];

const steps = [
  "Press “Become a member”, fill in your restaurant details and add your card. Nothing is charged for two months.",
  "Once your card is confirmed, your dashboard login arrives by email.",
  "Sign in and add your email settings (the video shows how).",
  "Print your QR code and welcome your first guests.",
];

function GuideVideo() {
  if (!GUIDE_VIDEO_URL) {
    return (
      <div
        style={{
          aspectRatio: "16 / 9",
          background: "var(--dark-bg)",
          color: "#fff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "var(--font-sans)",
          borderRadius: "8px",
          textAlign: "center",
          padding: "24px",
        }}
      >
        Guide video coming soon
      </div>
    );
  }

  if (GUIDE_VIDEO_URL.match(/\.(mp4|webm|mov)$/i)) {
    return (
      <video
        src={GUIDE_VIDEO_URL}
        controls
        style={{ width: "100%", borderRadius: "8px", background: "#000" }}
      />
    );
  }

  return (
    <div style={{ aspectRatio: "16 / 9" }}>
      <iframe
        src={GUIDE_VIDEO_URL}
        title="How to become a dynR member"
        style={{ width: "100%", height: "100%", border: 0, borderRadius: "8px" }}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; picture-in-picture"
        allowFullScreen
      />
    </div>
  );
}

export default function MembershipInfo() {
  return (
    <>
      <section>
        <div className="container center-block">
          <span className="eyebrow">Membership</span>
          <h1>Hospitality your guests remember</h1>
          <p style={{ marginTop: "24px" }}>
            dynR gives independent restaurants a simple way to know their
            guests, bring them back, and make every visit feel personal.
          </p>
          <Link className="btn" to="/register-as-member">
            Become a member
          </Link>
        </div>
      </section>

      <section className="section-alt">
        <div className="container content-block wide">
          <h2>What we offer</h2>
          <ul className="check-list" style={{ marginTop: "32px" }}>
            {offers.map((o) => (
              <li key={o.title}>
                <span className="icon">✓</span>
                <span>
                  <strong>{o.title}.</strong> {o.text}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section>
        <div className="container content-block wide">
          <h2>How your restaurant benefits</h2>
          <ul className="check-list" style={{ marginTop: "32px" }}>
            {benefits.map((b) => (
              <li key={b}>
                <span className="icon">✓</span>
                {b}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="section-alt">
        <div className="container center-block">
          <span className="eyebrow">Pricing</span>
          <h2 style={{ marginTop: "14px" }}>One simple price</h2>
          <div
            style={{
              margin: "32px auto 0",
              maxWidth: "460px",
              border: "1px solid var(--border)",
              borderRadius: "10px",
              padding: "36px 28px",
              background: "var(--bg)",
            }}
          >
            {/* <p style={{ margin: "0 0 8px", fontFamily: "var(--font-sans)", fontWeight: 600, color: "var(--accent)" }}>
              First 2 months free
            </p> */}
            <div className="stat-number" style={{ marginBottom: 0 }}>£79</div>
            {/* <p style={{ margin: "0 0 24px", fontFamily: "var(--font-sans)", fontWeight: 600 }}>
              per month after that
            </p> */}
            <ul className="check-list" style={{ textAlign: "left", marginBottom: "28px" }}>
              {offers.map((o) => (
                <li key={o.title}>
                  <span className="icon">✓</span>
                  {o.title}
                </li>
              ))}
            </ul>
            <p style={{ fontSize: "16px", color: "var(--muted)", marginBottom: "24px" }}>
              Add your card now. Nothing is charged for two months, then £79 is taken
              automatically. Cancel any time.
            </p>
            <Link className="btn" to="/register-as-member">
              Experience your 2 months free trial
            </Link>
          </div>
        </div>
      </section>

      <section>
        <div className="container content-block wide">
          <h2>How to become a member</h2>
          <div style={{ margin: "32px 0" }}>
            <GuideVideo />
          </div>
          <ol style={{ fontSize: "18px", lineHeight: 1.8, paddingLeft: "22px" }}>
            {steps.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ol>
        </div>
      </section>

      <section className="section-dark">
        <div className="container center-block">
          <h2 style={{ color: "#fff", marginBottom: "32px" }}>Ready to get started?</h2>
          <Link className="btn" to="/register-as-member">
            Become a member
          </Link>
        </div>
      </section>
    </>
  );
}
