import { Link } from "react-router-dom";
import { FinalCta } from "../components/PageBits";

export default function OurStory() {
  return (
    <div className="hm">
      <section className="hm-page-hero">
        <div className="hm-wrap">
          <p className="hm-eyebrow">Our story</p>
          <h1>
            Built from the floor up.
            <br />
            <span>For the welcome back.</span>
          </h1>
          <p className="hm-lead">
            dynR began with a question familiar to anyone who has worked in hospitality: how do we make guests feel remembered when they return?
          </p>
        </div>
      </section>

      <section className="hm-section hm-section-tight">
        <div className="hm-wrap hm-narrow hm-prose">
          <p>
            Years on busy restaurant floors taught us how much the little details matter. A favourite table. A familiar face. A small note that makes
            the next visit feel personal.
          </p>
          <p>
            Keeping track of those details was harder. Information lived in someone’s memory or a notebook. When that person wasn’t on shift, the
            connection could get lost.
          </p>
        </div>
      </section>

      <section className="hm-tint">
        <div className="hm-wrap hm-two hm-two-center">
          <div>
            <h2>
              Hospitality shouldn’t depend on who remembers.
            </h2>
          </div>
          <div className="hm-prose">
            <p>
              That is why we built dynR: a way to keep useful guest information together, accessible to the team, so thoughtful hospitality is easier
              to continue from one visit to the next.
            </p>
            <ul className="hm-beliefs">
              <li>Know the guest.</li>
              <li>Remember the details.</li>
              <li>Make the welcome personal.</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="hm-section hm-section-tight">
        <div className="hm-wrap hm-narrow hm-prose">
          <p className="hm-big-quote">Technology should support the conversation, not replace it.</p>
          <p>Your people still make the welcome. dynR helps them remember where to begin.</p>
          <div className="hm-cta-row">
            <Link to="/contact" className="hm-btn hm-btn-ghost">
              Request a 15-minute chat
            </Link>
          </div>
        </div>
      </section>

      <FinalCta />
    </div>
  );
}
