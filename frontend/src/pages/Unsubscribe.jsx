import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { API_URL } from "../api";

// Opened from the link at the bottom of a campaign email. Standalone page (no dynR menu).
export default function Unsubscribe() {
  const [params] = useSearchParams();
  const [state, setState] = useState("idle"); // idle | working | done | error
  const [name, setName] = useState("");
  const [error, setError] = useState("");

  async function confirm() {
    setState("working");
    try {
      const res = await fetch(`${API_URL}/api/public/unsubscribe`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: params.get("r"), guestId: params.get("g"), token: params.get("t") }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Something went wrong.");
      setName(data.restaurantName || "");
      setState("done");
    } catch (err) {
      setError(err.message);
      setState("error");
    }
  }

  return (
    <div className="unsub">
      <div className="unsub-card">
        {state === "done" ? (
          <>
            <h1>You're unsubscribed</h1>
            <p>{name ? `${name} won't send you any more marketing emails.` : "You won't receive any more marketing emails."}</p>
          </>
        ) : (
          <>
            <h1>Stop receiving these emails?</h1>
            <p>Press the button and we'll take you off this restaurant's mailing list.</p>
            {state === "error" && <p className="unsub-error">{error}</p>}
            <button type="button" onClick={confirm} disabled={state === "working"}>
              {state === "working" ? "Please wait…" : "Unsubscribe me"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
