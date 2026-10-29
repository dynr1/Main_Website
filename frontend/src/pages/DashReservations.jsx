import { useMemo, useState } from "react";
import { Link, useOutletContext } from "react-router-dom";
import { addDays, fmtLong, initials, parseYmd, relationship, makeGuestMatcher, statusLabel, ymd } from "../components/dashUtils";

const FILTERS = [
  ["all", "All"],
  ["pending", "Awaiting confirmation"],
  ["confirmed", "Confirmed"],
  ["seated", "Seated"],
  ["completed", "Completed"],
  ["cancelled", "Cancelled"],
];

function dayLabel(d, i) {
  if (i === 0) return "Today";
  if (i === 1) return "Tomorrow";
  return d.toLocaleDateString("en-GB", { weekday: "long" });
}

export default function DashReservations() {
  const { api, guests, reservations, loading, reload, openNewReservation } = useOutletContext();
  const todayKey = ymd(new Date());
  const [day, setDay] = useState(todayKey);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState("all");
  const [sort, setSort] = useState({ key: "time", dir: 1 });
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(null);

  const match = useMemo(() => makeGuestMatcher(guests), [guests]);

  const strip = useMemo(() => {
    const start = new Date();
    return Array.from({ length: 7 }, (_, i) => {
      const d = addDays(start, i);
      const key = ymd(d);
      const count = reservations.filter((r) => r.reservation_date === key && r.status !== "cancelled").length;
      return { d, key, count, label: dayLabel(d, i) };
    });
  }, [reservations]);

  const dayRows = reservations.filter((r) => r.reservation_date === day);
  const rows = useMemo(() => {
    const term = q.trim().toLowerCase();
    const list = dayRows.filter(
      (r) =>
        (filter === "all" || r.status === filter) &&
        (!term || r.name.toLowerCase().includes(term) || (r.phone || "").includes(term) || (r.email || "").toLowerCase().includes(term))
    );
    const val = {
      time: (r) => r.reservation_time,
      pax: (r) => r.party_size,
      name: (r) => r.name.toLowerCase(),
      table: (r) => (r.table_label || "~").toLowerCase(),
    }[sort.key];
    return [...list].sort((a, b) => (val(a) > val(b) ? 1 : val(a) < val(b) ? -1 : 0) * sort.dir);
  }, [dayRows, q, filter, sort]);

  const active = dayRows.filter((r) => r.status !== "cancelled");
  const guestCount = active.reduce((n, r) => n + (r.party_size || 0), 0);

  function toggleSort(key) {
    setSort((s) => (s.key === key ? { key, dir: -s.dir } : { key, dir: 1 }));
  }
  const arrow = (key) => (sort.key === key ? (sort.dir === 1 ? " ↑" : " ↓") : " ↕");

  async function run(r, fn, okMsg) {
    setBusy(r.id);
    setNote("");
    try {
      const out = await fn();
      setNote(typeof okMsg === "function" ? okMsg(out) : okMsg || "");
      await reload();
    } catch (err) {
      setNote(err.message);
    } finally {
      setBusy(null);
    }
  }
  const setStatus = (r, status, msg) =>
    run(r, () => api(`/api/reservations/${r.id}/status`, { method: "PUT", body: { status } }), msg);
  const complete = (r) =>
    run(
      r,
      () => api(`/api/reservations/${r.id}/complete`, { method: "POST" }),
      (out) =>
        out.recorded
          ? `Visit recorded for ${r.name}. Their thank-you email is queued.`
          : `Marked complete. ${r.name} isn't on your guest list yet (no matching email or phone), so no visit was added.`
    );
  async function saveTable(r, value) {
    const v = value.trim();
    if (v === (r.table_label || "")) return;
    run(r, () => api(`/api/reservations/${r.id}/table`, { method: "PUT", body: { tableLabel: v } }), "");
  }

  function exportCsv() {
    const esc = (s) => `"${String(s ?? "").replace(/"/g, '""')}"`;
    const lines = [["Time", "Party", "Name", "Phone", "Email", "Table", "Status", "Notes"].join(",")].concat(
      rows.map((r) => [r.reservation_time, r.party_size, r.name, r.phone, r.email, r.table_label, r.status, r.notes].map(esc).join(","))
    );
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `reservations-${day}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  return (
    <>
      <div className="dx-head">
        <div>
          <h1>Reservation book</h1>
          <p className="dx-muted">Every day organised. Every arrival easy to manage.</p>
        </div>
        <div className="dx-head-actions">
          <span className="dx-chip">{fmtLong(parseYmd(day))}</span>
          <button type="button" className="dx-btn dx-btn-primary" onClick={() => openNewReservation(day, setDay)}>
            + New reservation
          </button>
        </div>
      </div>

      <section className="dx-card dx-card-flush">
        <div className="dx-card-head dx-pad">
          <div>
            <h2>Reservation book</h2>
            <p className="dx-muted">Assign a table, seat your guests, and record their visit.</p>
          </div>
          <button type="button" className="dx-btn" onClick={exportCsv} disabled={rows.length === 0}>
            Export
          </button>
        </div>

        <div className="dx-days">
          {strip.map((s) => (
            <button key={s.key} type="button" className={"dx-day" + (day === s.key ? " on" : "")} onClick={() => setDay(s.key)}>
              <small>{s.label}</small>
              <b>{s.d.toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</b>
              <span>
                {s.count} {s.count === 1 ? "booking" : "bookings"}
              </span>
            </button>
          ))}
          <label className={"dx-day dx-day-cal" + (strip.every((s) => s.key !== day) ? " on" : "")}>
            <small>Calendar</small>
            <b>Choose date</b>
            <input type="date" value={day} onChange={(e) => e.target.value && setDay(e.target.value)} />
          </label>
        </div>

        <div className="dx-sumline">
          <span>
            {fmtLong(parseYmd(day))} · {active.length} {active.length === 1 ? "reservation" : "reservations"} · {guestCount} guests
          </span>
          <span className="dx-muted">Click a column heading to sort</span>
        </div>

        <div className="dx-toolbar">
          <input className="dx-input" placeholder="Search guest name…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search guests" />
          <select className="dx-input dx-select" value={filter} onChange={(e) => setFilter(e.target.value)} aria-label="Filter by status">
            {FILTERS.map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </div>

        {note && <p className="dx-flash">{note}</p>}

        <div className="dx-tablewrap">
          <table className="dx-table">
            <thead>
              <tr>
                <th>
                  <button type="button" onClick={() => toggleSort("time")}>Time{arrow("time")}</button>
                </th>
                <th>
                  <button type="button" onClick={() => toggleSort("pax")}>Pax{arrow("pax")}</button>
                </th>
                <th>
                  <button type="button" onClick={() => toggleSort("name")}>Guest name{arrow("name")}</button>
                </th>
                <th>
                  <button type="button" onClick={() => toggleSort("table")}>Table{arrow("table")}</button>
                </th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="6" className="dx-empty">Loading…</td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan="6" className="dx-empty">
                    {dayRows.length === 0
                      ? "No bookings for this day. Share your booking link or add one yourself."
                      : "No bookings match your search."}
                  </td>
                </tr>
              ) : (
                rows.map((r) => {
                  const g = match(r);
                  const rel = g ? relationship(g) : null;
                  const b = busy === r.id;
                  return (
                    <tr key={r.id} className={r.status === "cancelled" ? "is-dim" : ""}>
                      <td className="dx-strong">{r.reservation_time.slice(0, 5)}</td>
                      <td>
                        <span className="dx-pax">{r.party_size}</span>
                      </td>
                      <td>
                        <div className="dx-person">
                          <span className="dx-avatar">{initials(r.name)}</span>
                          <div>
                            <b>{r.name}</b>
                            {g && (
                              <>
                                {" "}
                                <span className="dx-tag">Member</span>{" "}
                                <Link to={`/dashboard/members?guest=${g.id}`} className="dx-link dx-small">
                                  View profile
                                </Link>
                              </>
                            )}
                            <p className="dx-muted dx-small">
                              {rel
                                ? `${rel.label} · ${g.visit_count} recorded ${g.visit_count === 1 ? "visit" : "visits"}`
                                : r.phone || r.email || "Not on your guest list yet"}
                            </p>
                            {r.notes && <p className="dx-note dx-small">{r.notes}</p>}
                          </div>
                        </div>
                      </td>
                      <td>
                        <input
                          className="dx-input dx-table-input"
                          defaultValue={r.table_label || ""}
                          placeholder="Unassigned"
                          maxLength={20}
                          aria-label={`Table for ${r.name}`}
                          onBlur={(e) => saveTable(r, e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
                          key={`${r.id}-${r.table_label || ""}`}
                        />
                      </td>
                      <td>
                        <span className={`dx-pill s-${r.status}`}>{statusLabel(r.status)}</span>
                      </td>
                      <td>
                        <div className="dx-actions-row">
                          {r.status === "pending" && (
                            <button type="button" className="dx-btn dx-btn-sm dx-btn-primary" disabled={b} onClick={() => setStatus(r, "confirmed", `${r.name} confirmed.`)}>
                              Confirm
                            </button>
                          )}
                          {(r.status === "pending" || r.status === "confirmed") && (
                            <button type="button" className="dx-btn dx-btn-sm" disabled={b} onClick={() => setStatus(r, "seated", `${r.name} seated.`)}>
                              Seat
                            </button>
                          )}
                          {(r.status === "confirmed" || r.status === "seated") && (
                            <button
                              type="button"
                              className={"dx-btn dx-btn-sm" + (r.status === "seated" ? " dx-btn-primary" : "")}
                              disabled={b}
                              onClick={() => complete(r)}
                            >
                              Mark visit
                            </button>
                          )}
                          {r.status === "cancelled" && (
                            <button type="button" className="dx-btn dx-btn-sm" disabled={b} onClick={() => setStatus(r, "confirmed", `${r.name} reinstated.`)}>
                              Reinstate
                            </button>
                          )}
                          {(r.status === "pending" || r.status === "confirmed") && (
                            <button type="button" className="dx-link dx-danger" disabled={b} onClick={() => setStatus(r, "cancelled", `${r.name} cancelled.`)}>
                              Cancel
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        <div className="dx-tablefoot">
          <span>
            {active.length} {active.length === 1 ? "reservation" : "reservations"} · {guestCount} guests
          </span>
          <span className="dx-muted">Table assignments are made by your team.</span>
        </div>
      </section>
    </>
  );
}
