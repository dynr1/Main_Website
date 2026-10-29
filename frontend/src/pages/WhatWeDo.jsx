import { Link } from "react-router-dom";

export default function WhatWeDo() {
  return (
    <>
      <section>
        <div className="container center-block">
          <span className="eyebrow">What we do</span>
          <h1>
            Service is getting faster.
            <br />
            Hospitality is getting lost.
          </h1>
          <p style={{ marginTop: "24px" }}>
            Everywhere you look, the industry is optimising for speed — faster
            ordering, faster tables turned, faster everything. Efficient, but
            rarely personal. Somewhere in that shift, hospitality quietly
            became service — and guests can tell the difference, even if they
            can't always name it.
          </p>
        </div>
      </section>

      <section className="section-alt">
        <div className="container content-block wide">
          <h2>
            We help independent restaurants turn first-time guests into
            regulars.
          </h2>
          <p style={{ marginTop: "24px" }}>
            A guest becomes a member in seconds. From then on, every visit,
            any member of staff can see who they are, what they like, and
            what matters to them — automatically. Not a screen replacing a
            conversation. Just enough, quietly, in the background, so
            hospitality doesn't depend on which staff member happens to
            remember.
          </p>
        </div>
      </section>

      <section>
        <div className="container center-block">
          <h2>Why this matters</h2>
          <div className="stat-number" style={{ marginTop: "32px" }}>
            5x
          </div>
          <div className="bars">
            <div className="bar-col">
              <div className="bar tall"></div>
              <div className="bar-label">New customer</div>
            </div>
            <div className="bar-col">
              <div className="bar short"></div>
              <div className="bar-label">Returning customer</div>
            </div>
          </div>
          <p>
            Studies show it costs roughly 5 times more to win a new customer
            than to keep one you already have.
          </p>
        </div>
      </section>

      <section className="section-dark">
        <div className="container center-block">
          <h2 style={{ color: "#fff" }}>
            Free 15-minute chat. No pitch, no pressure.
          </h2>
          <div className="hero-actions" style={{ justifyContent: "center", marginTop: "28px" }}>
            <Link to="/register-as-member" className="btn">
              Become a member
            </Link>
            <Link to="/contact" className="btn btn-ghost btn-ghost--light">
              Book a 15-minute chat
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}