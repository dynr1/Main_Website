import { useState } from "react";
import { Link } from "react-router-dom";

export const TRIAL_CTA = "Start your 2 months free trial";
export const TRIAL_FINE = "Card required. Nothing charged for two months, then £79/month automatically. Cancel anytime.";

export function TrialButton({ block = false, className = "" }) {
  return (
    <Link to="/register-as-member" className={`hm-btn hm-btn-primary ${block ? "hm-btn-block" : ""} ${className}`}>
      {TRIAL_CTA} <i>↗</i>
    </Link>
  );
}

// The dark "Make the next visit feel like a welcome back" band used at the bottom of every page.
export function FinalCta() {
  return (
    <section className="hm-dark hm-final">
      <div className="hm-wrap hm-final-grid">
        <div>
          <h2>
            Make the next visit
            <br />
            feel like a welcome back.
          </h2>
          <p className="hm-lead">Start with your next guest. Build the relationship from there.</p>
        </div>
        <div>
          <TrialButton />
          <p className="hm-fine">{TRIAL_FINE}</p>
        </div>
      </div>
    </section>
  );
}

// Accordion of questions. `items` is [{ q, a }].
export function Accordion({ items, startOpen = 0 }) {
  const [open, setOpen] = useState(startOpen);
  return (
    <div className="hm-faq">
      {items.map((f, i) => (
        <div key={f.q} className={"hm-faq-item" + (open === i ? " open" : "")}>
          <button type="button" aria-expanded={open === i} onClick={() => setOpen(open === i ? -1 : i)}>
            <span>{f.q}</span>
            <i>{open === i ? "–" : "+"}</i>
          </button>
          {open === i && <p>{f.a}</p>}
        </div>
      ))}
    </div>
  );
}
