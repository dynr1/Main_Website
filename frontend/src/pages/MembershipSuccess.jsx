import { Link } from "react-router-dom";

export default function MembershipSuccess() {
  return (
    <section>
      <div className="container center-block">
        <div className="success-icon">✓</div>
        <h1 style={{ marginBottom: "12px" }}>
          Thank you for becoming a member with us.
        </h1>
        <p style={{ marginBottom: "32px" }}>
          Your dynR account is ready. Click below to view your dashboard.
        </p>
        <Link to="/dashboard" className="btn">
          View Your Dashboard
        </Link>
      </div>
    </section>
  );
}