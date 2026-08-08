import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { API_URL } from "../api";

export default function AccountCreated() {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get("session_id");

  const [status, setStatus] = useState("loading"); // "loading" | "success" | "error"
  const [error, setError] = useState("");
  const [restaurantName, setRestaurantName] = useState("");

  useEffect(() => {
    if (!sessionId) {
      setStatus("error");
      setError("No payment session found.");
      return;
    }

    async function confirm() {
      try {
        const res = await fetch(
          `${API_URL}/api/confirm-payment?session_id=${encodeURIComponent(sessionId)}`
        );
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data?.error || "Failed to confirm payment.");
        }

        setRestaurantName(data.restaurantName || "");
        setStatus("success");
      } catch (err) {
        setStatus("error");
        setError(err.message);
      }
    }

    confirm();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  return (
    <section>
      <div className="container content-block" style={{ textAlign: "center" }}>
        {status === "loading" && (
          <>
            <h1 style={{ marginBottom: 16 }}>Confirming payment…</h1>
            <p style={{ opacity: 0.8 }}>Just a moment while we finish setting things up.</p>
          </>
        )}

        {status === "success" && (
          <>
            <h1 style={{ marginBottom: 16 }}>Account successfully created</h1>
            <p style={{ opacity: 0.85 }}>
              {restaurantName ? `${restaurantName}, check` : "Check"} your email
              for your login ID and password.
            </p>
          </>
        )}

        {status === "error" && (
          <>
            <h1 style={{ marginBottom: 16 }}>Something went wrong</h1>
            <p style={{ opacity: 0.85 }}>
              {error || "We couldn't confirm this payment."} If you were charged,
              please contact dynR and we'll sort it out.
            </p>
          </>
        )}
      </div>
    </section>
  );
}
