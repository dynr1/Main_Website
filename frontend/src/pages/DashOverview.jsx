import { useEffect, useMemo, useState } from "react";
import { Link, useOutletContext } from "react-router-dom";
import { MessageModal } from "../components/DashModals";
import { ymd, daysSince, ago, fmtShort, initials, relationship, makeGuestMatcher, upcomingBirthdays } from "../components/dashUtils";

export default function DashOverview() {
  const { api, guests, reservations, loading, name, today, openNewReservation, reload } = useOutletContext();
  const [settings, setSettings] = useState(null);
  const [msg, setMsg] = useState(null); // { title, ids, text }

  useEffect(() => {
    api("/api/settings")
      .then((d) => setSettings(d.settings))
      .catch(() => setSettings(false));
  }, [api]);

  const match = useMemo(() => makeGuestMatcher(guests), [guests]);
  const todayKey = ymd(new Date());

  const arrivals = useMemo(
    () =>
      reservations
        .filter((r) => r.reservation_date === todayKey && r.status !== "cancelled")
        .sort((a, b) => a.reservation_time.localeCompare(b.reservation_time)),
    [reservations, todayKey]
  );
  const guestsExpected = arrivals.reduce((n, r) => n + (r.party_size || 0), 0);
  const seated = arrivals.filter((r) => r.status === "seated").length;
  const completed = arrivals.filter((r) => r.status === "completed").length;
  const needTable = arrivals.filter((r) => !r.table_label && (r.status === "pending" || r.status === "confirmed")).length;

  const newThisWeek = guests.filter((g) => {
    const d = daysSince(g.created_at);
    return d != null && d < 7;
  });
  const notVisited = guests.filter((g) => (g.visit_count ?? 0) === 0).length;

  // Gentle prompts: who to invite back, and who to reconnect with.
  const prompts = useMemo(() => {
    const out = [];
    guests.forEach((g) => {
      const d = daysSince(g.last_visit);
      const v = g.visit_count ?? 0;
      if (!g.email || d == null) return;
      if (v === 1 && d >= 3 && d <= 30)
        out.push({ g, kind: "invite", line: "A second visit starts a habit", action: "Invite back", d });
      else if (v >= 2 && d >= 30)
        out.push({ g, kind: "reconnect", line: "A familiar face worth remembering", action: "Reconnect", d });
    });
    return out.slice(0, 5);
  }, [guests]);

  const birthdays = useMemo(() => upcomingBirthdays(guests, 30).slice(0, 3), [guests]);

  function startMessage(p) {
    const first = p.g.name.split(" ")[0];
    setMsg({
      title: `${p.action} — ${p.g.name}`,
      ids: [p.g.id],
      text:
        p.kind === "invite"
          ? `It was lovely to have you with us recently, ${first}. We'd love to welcome you back soon.`
          : `It's been a little while, ${first}, and we'd love to see you again. A table is always waiting for you.`,
    });
  }

  const emailReady = Boolean(settings && settings.smtp_host && settings.smtp_user && settings.smtp_pass);
  const reviewReady = Boolean(settings && settings.google_review_url);

  return (
    <>
      <div className="dx-head">
        <div>
          <h1>A great service starts here.</h1>
          <p className="dx-muted">Here's what's happening at {name} today.</p>
        </div>
        <div className="dx-head-actions">
          <span className="dx-chip">{today}</span>
          <button type="button" className="dx-btn dx-btn-primary" onClick={() => openNewReservation(todayKey)}>
            + New reservation
          </button>
        </div>
      </div>

      <div className="dx-stats">
        <div className="dx-stat">
          <span>Bookings today</span>
          <b>{arrivals.length}</b>
          <small>{guestsExpected} guests expected</small>
        </div>
        <div className="dx-stat">
          <span>Total members</span>
          <b>{guests.length}</b>
          <small>Your restaurant guest community</small>
        </div>
        <div className="dx-stat">
          <span>Joined last 7 days</span>
          <b>{newThisWeek.length}</b>
          <small>New connections, ready for a welcome</small>
        </div>
        <div className="dx-stat">
          <span>Not visited yet</span>
          <b>{notVisited}</b>
          <small>Members waiting for a first visit</small>
        </div>
      </div>

      <div className="dx-grid2">
        <section className="dx-card">
          <div className="dx-card-head">
            <h2>Bring guests back</h2>
            <Link to="/dashboard/members">View members →</Link>
          </div>
          {loading ? (
            <p className="dx-empty">Loading…</p>
          ) : prompts.length === 0 ? (
            <p className="dx-empty">
              No one to follow up with right now. When a guest has visited once, or hasn't been in for a month, they'll appear here.
            </p>
          ) : (
            <ul className="dx-list">
              {prompts.map((p) => (
                <li key={p.g.id}>
                  <span className="dx-avatar">{initials(p.g.name)}</span>
                  <div className="dx-grow">
                    <b>{p.g.name}</b>
                    <p className="dx-muted">{p.line}</p>
                    <small className="dx-muted">
                      {p.g.visit_count} recorded {p.g.visit_count === 1 ? "visit" : "visits"} · last seen {ago(p.d)}
                    </small>
                  </div>
                  <div className="dx-stack">
                    <Link to={`/dashboard/members?guest=${p.g.id}`} className="dx-link">
                      View profile →
                    </Link>
                    <button type="button" className="dx-btn dx-btn-sm" onClick={() => startMessage(p)}>
                      {p.action}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="dx-card">
          <div className="dx-card-head">
            <h2>Today's arrivals</h2>
            <Link to="/dashboard/reservations">Reservation book →</Link>
          </div>
          {loading ? (
            <p className="dx-empty">Loading…</p>
          ) : arrivals.length === 0 ? (
            <p className="dx-empty">No bookings for today yet. Share your booking link, or add one yourself.</p>
          ) : (
            <ul className="dx-list">
              {arrivals.map((r) => {
                const g = match(r);
                const rel = g ? relationship(g) : null;
                return (
                  <li key={r.id}>
                    <span className="dx-time">{r.reservation_time.slice(0, 5)}</span>
                    <div className="dx-grow">
                      <b>{r.name}</b>
                      <p className="dx-muted">
                        {rel ? `${rel.label}${g.visit_count ? ` · ${g.visit_count} recorded ${g.visit_count === 1 ? "visit" : "visits"}` : ""} · ` : ""}
                        {r.party_size} {r.party_size === 1 ? "guest" : "guests"}
                      </p>
                      {r.notes && <p className="dx-note">{r.notes}</p>}
                    </div>
                    {g && (
                      <Link to={`/dashboard/members?guest=${g.id}`} className="dx-link">
                        Profile →
                      </Link>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
          <div className="dx-foot3">
            <span>
              <b>{seated}</b> seated
            </span>
            <span>
              <b>{needTable}</b> need a table
            </span>
            <span>
              <b>{completed}</b> completed
            </span>
          </div>
        </section>
      </div>

      <div className="dx-grid3">
        <section className="dx-card">
          <div className="dx-card-head">
            <h2>New connections</h2>
            <Link to="/dashboard/members">View members →</Link>
          </div>
          <p className="dx-big">
            {newThisWeek.length} <span>joined in the last 7 days</span>
          </p>
          <p className="dx-muted">
            Start the relationship with a personal welcome.{" "}
            {notVisited > 0 ? `${notVisited} ${notVisited === 1 ? "member has" : "members have"} no visit recorded yet.` : ""}
          </p>
          <Link to="/dashboard/members" className="dx-btn">
            See who to welcome
          </Link>
        </section>

        <section className="dx-card">
          <div className="dx-card-head">
            <h2>A date to remember</h2>
          </div>
          {birthdays.length === 0 ? (
            <p className="dx-empty">No birthdays in the next 30 days.</p>
          ) : (
            <ul className="dx-list dx-list-tight">
              {birthdays.map(({ guest, date, inDays }) => (
                <li key={guest.id}>
                  <span className="dx-avatar">{initials(guest.name)}</span>
                  <div className="dx-grow">
                    <b>{guest.name}</b>
                    <p className="dx-muted">
                      {fmtShort(date)} · {inDays === 0 ? "Today" : inDays === 1 ? "Tomorrow" : `In ${inDays} days`}
                    </p>
                  </div>
                  <Link to={`/dashboard/members?guest=${guest.id}`} className="dx-link">
                    View profile →
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="dx-card">
          <div className="dx-card-head">
            <h2>Keep the connection going</h2>
          </div>
          {settings === null ? (
            <p className="dx-empty">Checking your setup…</p>
          ) : (
            <ul className="dx-check">
              <li className={emailReady ? "ok" : ""}>
                <i>{emailReady ? "✓" : "○"}</i>
                {emailReady ? "Your email is connected. Thank-yous and birthday messages go from your address." : "Connect your email so messages go from your own address."}
              </li>
              <li className={reviewReady ? "ok" : ""}>
                <i>{reviewReady ? "✓" : "○"}</i>
                {reviewReady ? "Your Google review link is added." : "Add your Google review link to invite honest reviews."}
              </li>
            </ul>
          )}
          {settings !== null && !(emailReady && reviewReady) && (
            <Link to="/settings" className="dx-btn">
              Finish setting up →
            </Link>
          )}
        </section>
      </div>

      {msg && (
        <MessageModal
          api={api}
          title={msg.title}
          guestIds={msg.ids}
          initialText={msg.text}
          onClose={() => setMsg(null)}
          onSent={reload}
        />
      )}
    </>
  );
}
