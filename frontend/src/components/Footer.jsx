import { Link } from "react-router-dom";

// Fill these in when you have them; they only show once set.
// e.g. "dynR Ltd · Registered in England and Wales, company no. 12345678"
const COMPANY_LINE = "";

export default function Footer() {
  return (
    <footer className="foot">
      <div className="container">
        <div className="foot-grid">
          <div className="foot-brand">
            <img src="/dynR_logo.png" alt="dynR" />
            <p>
              Guest relationships.
              <br />
              Better hospitality.
            </p>
            <a href="mailto:hello@dynr.co.uk">hello@dynr.co.uk</a>
          </div>

          <nav aria-label="Explore">
            <h4>Explore</h4>
            <Link to="/">Home</Link>
            <Link to="/what-we-do">The platform</Link>
            <Link to="/for-restaurants">For restaurants</Link>
          </nav>

          <nav aria-label="Get to know dynR">
            <h4>Get to know dynR</h4>
            <Link to="/our-story">Our story</Link>
            <Link to="/membership">Membership</Link>
            <Link to="/faq">FAQs</Link>
          </nav>

          <nav aria-label="Let's talk">
            <h4>Let&rsquo;s talk</h4>
            <Link to="/contact">Request a 15-minute chat</Link>
            <a href="mailto:hello@dynr.co.uk">hello@dynr.co.uk</a>
            <Link to="/login">Restaurant login</Link>
          </nav>
        </div>

        <div className="foot-base">
          <span>© {new Date().getFullYear()} dynR. All rights reserved.</span>
          <span>
            <Link to="/privacy">Privacy policy</Link> · <Link to="/terms">Terms of service</Link>
            {COMPANY_LINE ? ` · ${COMPANY_LINE}` : ""}
          </span>
        </div>
      </div>
    </footer>
  );
}
