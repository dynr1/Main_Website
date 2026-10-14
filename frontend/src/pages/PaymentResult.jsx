import { Link } from "react-router-dom";

export default function PaymentResult({ success }) {
  return (
    <section>
      <div className="container content-block">
        <span className="eyebrow">{success ? "Payment received" : "Payment not completed"}</span>
        <h1 style={{ marginTop: "14px", marginBottom: "24px" }}>
          {success ? "Thank you — you're all set" : "No payment was taken"}
        </h1>
        <p>
          {success
            ? "Your 2-month free trial has started — nothing is charged until it ends. We're emailing your dashboard login details now; it can take a minute to arrive."
            : "Your dashboard has been created, but no card details were saved, so your free trial hasn't started. To start it, sign in with the email and password you registered with and press “Start free trial” in Settings."}
        </p>
        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
          <Link className="btn" to="/login">
            Go to login
          </Link>
        </div>
      </div>
    </section>
  );
}
