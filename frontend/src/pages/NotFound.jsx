import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <section>
      <div className="container center-block notfound">
        <h1>We can't find that page</h1>
        <p style={{ marginTop: "20px" }}>
          The link may be out of date or mistyped. Head back to the home page,
          or tell us at hello@dynr.co.uk if something should be here.
        </p>
        <Link to="/" className="btn">
          Back to the home page
        </Link>
      </div>
    </section>
  );
}
