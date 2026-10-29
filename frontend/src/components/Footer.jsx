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
              A guest relationship platform for independent restaurants.
            </p>
            <a href="mailto:hello@dynr.co.uk">hello@dynr.co.uk</a>
          </div>

          <nav aria-label="Product">
            <h4>Product</h4>
            <Link to="/what-we-do">What we do</Link>
            <Link to="/membership">Membership</Link>
            <Link to="/for-restaurants">For restaurants</Link>
            <Link to="/faq">FAQ</Link>
          </nav>

          <nav aria-label="Company">
            <h4>Company</h4>
            <Link to="/our-story">Our story</Link>
            <Link to="/contact">Contact</Link>
            <Link to="/login">Restaurant login</Link>
          </nav>

          <nav aria-label="Legal">
            <h4>Legal</h4>
            <Link to="/privacy">Privacy policy</Link>
            <Link to="/terms">Terms of service</Link>
          </nav>
        </div>

        <div className="foot-base">
          <span>© {new Date().getFullYear()} dynR. All rights reserved.</span>
          {COMPANY_LINE && <span>{COMPANY_LINE}</span>}
        </div>
      </div>
    </footer>
  );
}
