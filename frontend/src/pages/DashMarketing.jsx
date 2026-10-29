import { useCallback, useEffect, useState } from "react";
import { Link, useOutletContext } from "react-router-dom";
import { parseDbTime, fmtShort } from "../components/dashUtils";

const STARTERS = {
  second_visit: {
    subject: "It was lovely to see you at {restaurant}",
    message: "Hi {first_name},\n\nThank you for visiting us recently. We'd love to welcome you back, and your table is always waiting.",
  },
  regulars: {
    subject: "Thank you for being one of our regulars",
    message: "Hi {first_name},\n\nWe've loved having you with us lately. Thank you for making us part of your routine. We always look forward to seeing you.",
  },
  reconnect: {
    subject: "We'd love to see you again",
    message: "Hi {first_name},\n\nIt's been a little while, and we'd love to welcome you back. Whenever you're ready, a table is waiting for you.",
  },
  new_members: {
    subject: "Welcome to {restaurant}",
    message: "Hi {first_name},\n\nA warm welcome from all of us. We're so glad you joined, and we look forward to seeing you soon.",
  },
  everyone: { subject: "", message: "Hi {first_name},\n\n" },
};

const CARDS = [
  { key: "second_visit", title: "Encourage the second visit", text: "A considered invitation after a guest's first recorded visit." },
  { key: "regulars", title: "Appreciate your regulars", text: "Recognise familiar faces with a personal note or invitation." },
  { key: "reconnect", title: "Reconnect thoughtfully", text: "Welcome back guests who have visited before and have no booking ahead." },
];

const STATUS_LABEL = { sending: "Sending…", sent: "Sent", "partly sent": "Partly sent", failed: "Failed" };
const QUEUE_LABEL = { pending: "Scheduled", sent: "Sent", skipped: "Skipped", failed: "Failed" };

function CampaignModal({ api, restaurantName, audiences, start, onClose, onSent }) {
  const first = start || "second_visit";
  const [audience, setAudience] = useState(first);
  const [subject, setSubject] = useState((STARTERS[first].subject || "").replace("{restaurant}", restaurantName));
  const [message, setMessage] = useState(STARTERS[first].message);
  const [confirm, setConfirm] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  const current = audiences.find((a) => a.key === audience);

  function pick(key) {
    setAudience(key);
    setSubject((STARTERS[key].subject || "").replace("{restaurant}", restaurantName));
    setMessage(STARTERS[key].message);
    setConfirm(false);
  }

  async function send() {
    setSending(true);
    setError("");
    try {
      await api("/api/marketing/campaigns", { method: "POST", body: { audience, subject, message, name: subject } });
      onSent();
    } catch (err) {
      setError(err.message);
      setSending(false);
      setConfirm(false);
    }
  }

  const preview = message.replace(/\{first_name\}/gi, "Alex");

  return (
    <div className="dx-overlay" onClick={onClose} role="presentation">
      <div className="dx-modal dx-modal-wide" role="dialog" aria-modal="true" aria-label="Create campaign" onClick={(e) => e.stopPropagation()}>
        <div className="dx-modal-head">
          <h3>Create campaign</h3>
          <button type="button" className="dx-x" onClick={onClose} aria-label="Close">×</button>
        </div>
        <p className="dx-muted">Start with an audience. Make the message personal.</p>

        <div className="dx-form">
          <label>
            Who is this for?
            <select className="dx-input" value={audience} onChange={(e) => pick(e.target.value)}>
              {audiences.map((a) => (
                <option key={a.key} value={a.key}>
                  {a.label} ({a.count})
                </option>
              ))}
            </select>
            <span className="dx-hint">{current?.blurb}</span>
          </label>
          <label>
            Subject
            <input className="dx-input" value={subject} onChange={(e) => setSubject(e.target.value)} maxLength={150} />
          </label>
          <label>
            Message
            <textarea className="dx-textarea dx-textarea-flush" rows={7} value={message} onChange={(e) => setMessage(e.target.value)} maxLength={5000} />
            <span className="dx-hint">
              Use {"{first_name}"} to add each guest's first name. Your restaurant name and an unsubscribe link are added at the bottom automatically.
            </span>
          </label>
          <div className="dx-preview">
            <small>Preview for “Alex”</small>
            <b>{subject.replace(/\{first_name\}/gi, "Alex") || "(no subject)"}</b>
            <p>{preview}</p>
            <p>Warmly, {restaurantName}</p>
          </div>
        </div>

        {error && <p className="dx-error">{error}</p>}

        {!confirm ? (
          <div className="dx-actions">
            <button type="button" className="dx-btn" onClick={onClose}>Cancel</button>
            <button
              type="button"
              className="dx-btn dx-btn-primary"
              disabled={!subject.trim() || !message.trim() || !current?.count}
              onClick={() => setConfirm(true)}
            >
              {current?.count ? `Review and send (${current.count})` : "Nobody in this group yet"}
            </button>
          </div>
        ) : (
          <div className="dx-confirm">
            <p>
              This will email <b>{current.count} {current.count === 1 ? "guest" : "guests"}</b> from your own email address right away. It can't be undone.
            </p>
            <div className="dx-actions">
              <button type="button" className="dx-btn" onClick={() => setConfirm(false)} disabled={sending}>Back</button>
              <button type="button" className="dx-btn dx-btn-primary" onClick={send} disabled={sending}>
                {sending ? "Sending…" : "Send now"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function DashMarketing() {
  const { api, name } = useOutletContext();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [modal, setModal] = useState(null); // audience key or "new"
  const [flash, setFlash] = useState("");

  const load = useCallback(async () => {
    try {
      setData(await api("/api/marketing/overview"));
      setError("");
    } catch (err) {
      setError(err.message);
    }
  }, [api]);

  useEffect(() => {
    load();
  }, [load]);

  // While a campaign is going out, keep refreshing so the numbers move.
  const sending = data?.campaigns?.some((c) => c.status === "sending");
  useEffect(() => {
    if (!sending) return undefined;
    const t = setInterval(load, 4000);
    return () => clearInterval(t);
  }, [sending, load]);

  const count = (key) => data?.audiences?.find((a) => a.key === key)?.count ?? 0;
  const aud = (key) => data?.audiences?.find((a) => a.key === key)?.label || key;

  return (
    <>
      <div className="dx-head">
        <div>
          <h1>Bring guests back</h1>
          <p className="dx-muted">Thoughtful campaigns and personal reasons to return.</p>
        </div>
      </div>

      {error && <div className="dx-banner">{error}</div>}

      {data && !data.emailReady && (
        <div className="dx-banner dx-banner-soft">
          Connect your email in <Link to="/settings" className="dx-link">Settings</Link> before sending. Campaigns go out from your own email address.
        </div>
      )}
      {flash && <p className="dx-flash dx-flash-flush">{flash}</p>}

      <div className="dx-stats">
        {[
          ["second_visit", "Second-visit invitations", "Eligible members ready for a personal invite"],
          ["regulars", "Regulars to appreciate", "Eligible members with 3+ visits in 90 days"],
          ["reconnect", "Time to reconnect", "Eligible guests with no booking ahead"],
          ["new_members", "New member welcomes", "Eligible members who joined in 7 days"],
        ].map(([k, t, s]) => (
          <div key={k} className="dx-stat">
            <span>{t}</span>
            <b>{data ? count(k) : "–"}</b>
            <small>{s}</small>
          </div>
        ))}
      </div>

      <div className="dx-head dx-head-sub">
        <div>
          <h2>A thoughtful reason to return</h2>
          <p className="dx-muted">Start with an audience. Make the message personal.</p>
        </div>
        <button type="button" className="dx-btn dx-btn-primary" disabled={!data} onClick={() => setModal("new")}>
          + Create campaign
        </button>
      </div>

      <div className="dx-grid3">
        {CARDS.map((c) => (
          <section key={c.key} className="dx-card dx-aud">
            <h3>{c.title}</h3>
            <p className="dx-muted">{c.text}</p>
            <button type="button" className="dx-link" disabled={!data} onClick={() => setModal(c.key)}>
              Create invitation →
            </button>
          </section>
        ))}
      </div>

      <section className="dx-card dx-card-flush dx-gap">
        <div className="dx-card-head dx-pad">
          <h2>Campaigns &amp; offers</h2>
        </div>
        <div className="dx-tablewrap">
          <table className="dx-table">
            <thead>
              <tr>
                <th>Campaign</th>
                <th>Audience</th>
                <th>Recipients</th>
                <th>Sent</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {!data ? (
                <tr><td colSpan="5" className="dx-empty">Loading…</td></tr>
              ) : data.campaigns.length === 0 ? (
                <tr>
                  <td colSpan="5" className="dx-empty">
                    Your first campaign starts with a familiar face.
                    <br />
                    Create a campaign to email a group of guests.
                  </td>
                </tr>
              ) : (
                data.campaigns.map((c) => {
                  const d = parseDbTime(c.created_at);
                  return (
                    <tr key={c.id}>
                      <td>
                        <b>{c.name}</b>
                        <p className="dx-muted dx-small">{d ? fmtShort(d) : ""}</p>
                      </td>
                      <td>{aud(c.audience)}</td>
                      <td>{c.recipients_count}</td>
                      <td>{c.sent_count} of {c.recipients_count}</td>
                      <td><span className={`dx-pill c-${String(c.status).replace(" ", "-")}`}>{STATUS_LABEL[c.status] || c.status}</span></td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="dx-card dx-gap">
        <div className="dx-card-head">
          <div>
            <h2>Automatic guest journeys</h2>
            <p className="dx-muted">These go out by themselves from your own email address.</p>
          </div>
        </div>
        <div className="dx-grid4">
          {[
            ["After signup", "A warm welcome", "Sent as soon as a guest joins your list.", true],
            ["After a completed visit", "A thoughtful thank-you", data?.reviewLinkSet ? "About an hour after you mark a visit, with your Google review link." : "About an hour after you mark a visit. Add your Google review link in Settings to include it.", true],
            ["On their birthday", "A birthday message", "Sent on the day, once a year, to each guest.", true],
            ["No visit in 30+ days", "A reason to return", "Coming soon. For now, use “Time to reconnect” above to send it yourself.", false],
          ].map(([tag, title, text, live]) => (
            <div key={title} className="dx-journey">
              <span className="dx-tag">{tag}</span>
              <h3>{title}</h3>
              <p className="dx-muted">{text}</p>
              <span className={"dx-status-dot " + (live ? (data?.emailReady ? "on" : "warn") : "off")}>
                {live ? (data?.emailReady ? "Active" : "Needs email set up") : "Coming soon"}
              </span>
            </div>
          ))}
        </div>
      </section>

      <section className="dx-card dx-card-flush dx-gap">
        <div className="dx-card-head dx-pad">
          <div>
            <h2>Keep the relationship going</h2>
            <p className="dx-muted">Your latest thank-you emails.</p>
          </div>
        </div>
        <div className="dx-tablewrap">
          <table className="dx-table dx-table-narrow">
            <thead>
              <tr><th>Guest</th><th>Message</th><th>When</th><th>Status</th></tr>
            </thead>
            <tbody>
              {!data ? (
                <tr><td colSpan="4" className="dx-empty">Loading…</td></tr>
              ) : data.queue.length === 0 ? (
                <tr><td colSpan="4" className="dx-empty">Mark a member's visit complete and their thank-you will appear here.</td></tr>
              ) : (
                data.queue.map((q) => {
                  const d = q.send_at ? new Date(q.send_at) : null;
                  return (
                    <tr key={q.id}>
                      <td><b>{q.name}</b></td>
                      <td>Thank-you after visit</td>
                      <td>{d && !Number.isNaN(d.getTime()) ? d.toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "—"}</td>
                      <td><span className={`dx-pill q-${q.status}`}>{QUEUE_LABEL[q.status] || q.status}</span></td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      {modal && data && (
        <CampaignModal
          api={api}
          restaurantName={name}
          audiences={data.audiences}
          start={modal === "new" ? "second_visit" : modal}
          onClose={() => setModal(null)}
          onSent={async () => {
            setModal(null);
            setFlash("Your campaign is on its way. The numbers below update as it sends.");
            await load();
          }}
        />
      )}
    </>
  );
}
