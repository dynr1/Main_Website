import { Link } from "react-router-dom";
import logo from "/dynR_logo.png";

export default function Home() {
  return (
    <>
      <section>
        <div className="container center-block">
          <div className="hero-logo">
            <img src={logo} alt="dynR" />
          </div>

          <span className="eyebrow">
            Guest relationship platform for restaurants
          </span>

          <h1>Know every guest.</h1>

          <p style={{ marginTop: "20px" }}>
            dynR helps independent restaurants remember every guest who walks
            through the door — so every visit feels personal, and every guest
            has a reason to come back.
          </p>

          <Link to="/contact" className="btn" style={{ marginTop: "12px" }}>
            Book a 15-Minute Chat
          </Link>
        </div>
      </section>

      <section className="section-alt">
  <div className="container center-block">
    <h2>How many regulars walked out today and never came back?</h2>

    <p style={{ marginTop: "27px" }}>
      The restaurants that thrive aren't chasing new customers. They're the ones guests call "my place."
    </p>

    <blockquote>
      Mr. Johnson walks in. You already know his usual table, his
      drink, his allergy, and that he's celebrating this weekend.
      That's the moment a customer becomes a regular for life.
    </blockquote>
  </div>
</section>

<section>
  <div className="container">
    <div className="steps">
      <div className="step">
        <span className="step-number">1</span>
        <h3>They Feel Known</h3>
        <p>Not just served, remembered, by name, every visit.</p>
      </div>

      <div className="step">
        <span className="step-number">2</span>
        <h3>Service Feels Personal</h3>
        <p>
          Preferences, allergies, and little details, right when staff
          need them.
        </p>
      </div>

      <div className="step">
        <span className="step-number">3</span>
        <h3>They Keep Coming Back</h3>
        <p>Because it's not just food. It's their place.</p>
      </div>
    </div>
  </div>
</section>

      <section className="mid-cta">
        <div className="container">
          <h2>Empty tables don't have to stay empty.</h2>

          <div className="mid-cta-cards">
            <Link to="/contact" className="mid-cta-card">
              Know your regulars.
            </Link>
            <Link to="/contact" className="mid-cta-card">
              Fill your quiet nights.
            </Link>
            <Link to="/contact" className="mid-cta-card">
              Grow without chasing new customers.
            </Link>
          </div>
        </div>
      </section>

      <section className="section-dark">
        <div className="container center-block">
          <h2 style={{ color: "#fff" }}>
            Free 15-minute chat. No pitch, no pressure.
          </h2>

          <p style={{ color: "#eee", marginTop: "16px" }}>We'll come to you.</p>

          <p className="contact-line">
            <a href="mailto:hello@dynr.co.uk">hello@dynr.co.uk</a>
          </p>
        </div>
      </section>
    </>
  );
}