import {Link} from "react-router-dom";


export default function OurStory() {
  return (
    <>
      <section>
        <div className="container center-block">
          <span className="eyebrow">Our story</span>
          <h1>We got tired of losing guests. So we decided to fix it.</h1>
        </div>
      </section>

      <section style={{ paddingTop: 0 }}>
        <div className="container content-block">
          <p>
            Years on the floor of busy restaurants taught us something most
            people don't say out loud: guests don't stop coming back because
            the food or the service was bad. Most nights, everything goes
            right. They enjoy themselves. They mean it when they say "we'll
            be back."
          </p>

          <p>
            But too often, they don't — or when they do, months later,
            nothing about that visit feels any different from the first. So
            we started asking a different question: what would it actually
            take to make guests come back?
          </p>

          <blockquote className="pull-quote">
            What would it actually take to make guests come back?
          </blockquote>

          <p>
            The answer turned out to be simple, if not easy. We started
            paying proper attention — writing down who came in, what they
            liked, what mattered to them. It was hard to keep up manually.
            But it worked. Guests who came back once started coming back
            every week. They brought people with them. Quiet nights started
            filling up.
          </p>

          <p>
            That's why we built dynR — a way for any restaurant to keep that
            same guest information, accessible to anyone on the team,
            without relying on memory, habit, or one person's notebook.
          </p>
        </div>
      </section>

      <section className="section-alt">
        <div className="container center-block">
          <p style={{ fontSize: "22px", color: "var(--ink)" }}>
            If any of this sounds familiar, let's talk.
          </p>
          <a href="/contact" className="link-cta">
            Book a 15-Minute Chat
          </a>
        </div>
      </section>
    </>
  );
}