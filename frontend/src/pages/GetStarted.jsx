const FEATURES = [
  {
    title: "Guest Membership System",
    desc: "Build your own guest database and collect valuable customer information.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="100%" height="100%">
        <circle cx="12" cy="8" r="4" />
        <path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8" />
      </svg>
    ),
  },
  {
    title: "Unlimited Customer Profiles",
    desc: "Store unlimited guest profiles and visit history.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="100%" height="100%">
        <path d="M7 12a3 3 0 106 0 3 3 0 106 0 3 3 0 10-6 0 3 3 0 10-6 0z" />
      </svg>
    ),
  },
  {
    title: "QR Guest Sign-Up",
    desc: "Guests can join instantly by scanning your unique QR code.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="100%" height="100%">
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <path d="M14 14h3v3h-3zM19 14h2M14 19h2M19 19h2" />
      </svg>
    ),
  },
  {
    title: "Visit Tracking",
    desc: "Track every visit and build a complete guest history.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="100%" height="100%">
        <rect x="3" y="5" width="18" height="16" rx="2" />
        <path d="M3 10h18M8 3v4M16 3v4" />
      </svg>
    ),
  },
  {
    title: "Guest Visit History",
    desc: "See how often guests visit and when they last dined with you.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="100%" height="100%">
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 3" />
      </svg>
    ),
  },
  {
    title: "Personal Guest Notes",
    desc: "Add notes, preferences and special dates to personalise their experience.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="100%" height="100%">
        <path d="M6 3h9l4 4v14a1 1 0 01-1 1H6a1 1 0 01-1-1V4a1 1 0 011-1z" />
        <path d="M9 12h6M9 16h6" />
      </svg>
    ),
  },
  {
    title: "Automated Thank You Emails",
    desc: "Automatically send thank you emails after each visit.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="100%" height="100%">
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <path d="M3 6l9 7 9-7" />
      </svg>
    ),
  },
  {
    title: "Automated Google Review Requests",
    desc: "Get more 5-star reviews with automated review requests.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="100%" height="100%">
        <path d="M12 3l2.8 5.9 6.2.9-4.5 4.5 1.1 6.4L12 17.8 6.4 20.7l1.1-6.4L3 9.8l6.2-.9z" />
      </svg>
    ),
  },
  {
    title: "Marketing Email Campaigns",
    desc: "Send updates, promotions and newsletters to your guests.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="100%" height="100%">
        <path d="M22 2L11 13M22 2l-7 20-4-9-9-4z" />
      </svg>
    ),
  },
  {
    title: "Full Onboarding Included",
    desc: "We'll set everything up and help you get started.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="100%" height="100%">
        <path d="M3 13a9 9 0 0118 0" />
        <rect x="3" y="13" width="4" height="6" rx="1" />
        <rect x="17" y="13" width="4" height="6" rx="1" />
      </svg>
    ),
  },
  {
    title: "No Setup Fee",
    desc: "Get started today with zero upfront costs.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="100%" height="100%">
        <path d="M12 2l8 4v6c0 5-3.4 8.7-8 10-4.6-1.3-8-5-8-10V6z" />
        <path d="M9 12l2 2 4-4" />
      </svg>
    ),
  },
  {
    title: "Cancel Anytime",
    desc: "No long-term contract – leave anytime.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="100%" height="100%">
        <path d="M6 6l12 12M18 6L6 18" />
      </svg>
    ),
  },
];

export default function GetStarted() {
  return (
    <section className="section-alt" style={{ paddingTop: 48, paddingBottom: 48 }}>
      <div className="container" style={{ maxWidth: 720 }}>
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <h1 style={{ marginBottom: 16 }}>
            Get Started
          </h1>
          <p style={{ opacity: 0.85, maxWidth: 560, margin: "0 auto" }}>
            Our all-in-one platform helps you build stronger connections,
            encourage repeat visits, generate{" "}
            <span style={{ color: "var(--accent)", fontWeight: 600 }}>
              more Google reviews
            </span>
            , and grow your restaurant.
          </p>
        </div>

        <div
          style={{
            background: "#fff",
            borderRadius: 16,
            boxShadow: "0 4px 24px rgba(0,0,0,0.06)",
            padding: "8px 28px",
          }}
        >
          {FEATURES.map((f, i) => (
            <div
              key={f.title}
              style={{
                display: "flex",
                gap: 18,
                alignItems: "center",
                padding: "18px 0",
                borderBottom:
                  i === FEATURES.length - 1 ? "none" : "1px solid #eee",
              }}
            >
              <div
                style={{
                  width: 26,
                  height: 26,
                  flexShrink: 0,
                  color: "var(--accent)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {f.icon}
              </div>
              <div>
                <h4 style={{ marginBottom: 4 }}>{f.title}</h4>
                <p style={{ opacity: 0.8, margin: 0 }}>{f.desc}</p>
              </div>
            </div>
          ))}

          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: 16,
              padding: "24px 0 12px",
            }}
          >
            <div>
              <span style={{ opacity: 0.75 }}>Only </span>
              <span style={{ fontSize: "2rem", fontWeight: 700, color: "var(--accent)" }}>
                £49
              </span>
              <span style={{ opacity: 0.75 }}> /month</span>
            </div>

            <a
              href="mailto:hello@dynr.co.uk?subject=Book%20a%20Free%20Demo"
              className="btn"
              style={{ textDecoration: "none" }}
            >
              Book a Free Demo →
            </a>
          </div>
        </div>

        <p
          style={{
            textAlign: "center",
            opacity: 0.6,
            fontSize: 13,
            marginTop: 20,
          }}
        >
          🔒 We respect your privacy. Your information will never be shared with anyone.
        </p>
      </div>
    </section>
  );
}
