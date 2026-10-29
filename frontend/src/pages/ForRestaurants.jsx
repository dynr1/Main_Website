import { Link } from "react-router-dom";

const points = [
  "You're an independent restaurant",
  "You want to build real relationships with your guests",
  "You've watched guests come once and never come back",
  "You want a simple way to fill your quiet nights",
  "You care about hospitality",
];

const week = [
  {
    title: "A guest scans your QR code",
    text: "It sits on the table or by the door. They enter their name, email, phone and birthday on their own phone. They don't download anything or make a password.",
  },
  {
    title: "Your team sees who's walking in",
    text: "Open a guest's profile and you can see their visits, what they like, and any allergies or notes you've added. Anyone on shift can use it, not only the person with the best memory.",
  },
  {
    title: "You mark the visit, we send the thank-you",
    text: "When a guest has been in, one tap logs the visit. About an hour later they get a friendly thank-you email, with a link to review you on Google if you've added yours.",
  },
  {
    title: "Birthdays take care of themselves",
    text: "On a guest's birthday, a message goes out automatically, so a nice touch never depends on someone remembering.",
  },
  {
    title: "Quiet Tuesday? Write to your regulars",
    text: "Pick the guests you want and send them a message. It goes from your own email address, so it reads like it came from you, because it did.",
  },
];

const different = [
  {
    title: "Nothing for guests to install",
    text: "Everything runs in the phone's browser. If a guest can scan a QR code, they can join.",
  },
  {
    title: "Emails come from you, not from us",
    text: "Your guests hear from your restaurant's own email address. dynR is never mentioned to them.",
  },
  {
    title: "Your guest list stays yours",
    text: "Each restaurant's guests sit in their own protected space. We don't share, sell or reuse them.",
  },
];

export default function ForRestaurants() {
  return (
    <>
      <section className="hero page-hero">
        <div className="container">
          <h1>Made for independent restaurants</h1>
          <p className="hero-lede">
            dynR is for owners and managers who want to know their guests by
            name, without adding work to a busy service.
          </p>
          <div className="hero-actions">
            <Link to="/register-as-member" className="btn">
              Become a member
            </Link>
            <Link to="/contact" className="btn btn-ghost">
              Book a 15-minute chat
            </Link>
          </div>
        </div>
      </section>

      <section className="section-alt">
        <div className="container">
          <div className="features">
            <div className="features-intro">
              <h2>This is for you if...</h2>
            </div>
            <ul className="check-list" style={{ margin: 0, maxWidth: "none" }}>
              {points.map((item) => (
                <li key={item}>
                  <span className="icon">✓</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section>
        <div className="container">
          <div className="features">
            <div className="features-intro">
              <h2>What it looks like in practice</h2>
              <p>
                No new routine to learn. dynR fits around how your team
                already works.
              </p>
            </div>

            <ol className="flow">
              {week.map((w, i) => (
                <li key={w.title}>
                  <span className="flow-n">{i + 1}</span>
                  <div>
                    <h3>{w.title}</h3>
                    <p>{w.text}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      <section className="section-alt">
        <div className="container">
          <div className="features">
            <div className="features-intro">
              <h2>Why restaurants choose dynR</h2>
              <p>
                Questions? The <Link to="/faq" style={{ textDecoration: "underline" }}>FAQ</Link>{" "}
                answers the common ones.
              </p>
            </div>

            <ul className="features-list">
              {different.map((d) => (
                <li key={d.title}>
                  <h3>{d.title}</h3>
                  <p>{d.text}</p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section>
        <div className="container">
          <div className="price-strip">
            <div>
              <h2>£79 a month. First 2 months free.</h2>
              <p>
                One plan with everything included. Add your card now, nothing is
                charged for two months, and you can cancel any time.
              </p>
            </div>
            <Link to="/register-as-member" className="btn">
              Become a member
            </Link>
          </div>
        </div>
      </section>

      <section className="section-dark">
        <div className="container center-block">
          <h2 style={{ color: "#fff" }}>Not sure yet? Book a 15-minute chat.</h2>
          <p style={{ color: "#eee", marginTop: "16px" }}>
            No pitch, no pressure. We'll come to you.
          </p>
          <Link className="btn" to="/contact">
            Book a 15-minute chat
          </Link>
        </div>
      </section>
    </>
  );
}
