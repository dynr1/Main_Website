import { useEffect, useMemo, useState } from "react";
import { useOutletContext, useSearchParams } from "react-router-dom";
import { MessageModal, NoteModal } from "../components/DashModals";
import { ago, daysSince, fmtShort, initials, parseDbTime, relationship } from "../components/dashUtils";

const FILTERS = [
  ["all", "All members"],
  ["new", "Not visited yet"],
  ["first", "First visit"],
  ["returning", "Returning"],
  ["regular", "Regulars"],
];

export default function DashMembers() {
  const { api, guests, loading, reload, openQR } = useOutletContext();
  const [params, setParams] = useSearchParams();
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState("all");
  const [selected, setSelected] = useState([]);
  const [active, setActive] = useState(null);
  const [msg, setMsg] = useState(null);
  const [noteFor, setNoteFor] = useState(null);
  const [flash, setFlash] = useState("");

  // Open a profile straight from a link such as /dashboard/members?guest=12
  useEffect(() => {
    const id = Number(params.get("guest"));
    if (id && guests.length) {
      const g = guests.find((x) => x.id === id);
      if (g) setActive(g);
    }
  }, [params, guests]);

  // Keep the open profile fresh after reloads.
  const activeGuest = active ? guests.find((g) => g.id === active.id) || active : null;

  const stats = useMemo(
    () => ({
      total: guests.length,
      week: guests.filter((g) => {
        const d = daysSince(g.created_at);
        return d != null && d < 7;
      }).length,
      returning: guests.filter((g) => (g.visit_count ?? 0) >= 2).length,
      regular: guests.filter((g) => (g.visit_count ?? 0) >= 3).length,
    }),
    [guests]
  );

  const list = useMemo(() => {
    const term = q.trim().toLowerCase();
    return guests.filter(
      (g) =>
        (filter === "all" || relationship(g).key === filter) &&
        (!term ||
          g.name?.toLowerCase().includes(term) ||
          g.email?.toLowerCase().includes(term) ||
          g.phone?.toLowerCase().includes(term) ||
          g.membership_number?.toLowerCase().includes(term))
    );
  }, [guests, q, filter]);

  const allShown = list.length > 0 && list.every((g) => selected.includes(g.id));
  const toggle = (id) => setSelected((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  function closeProfile() {
    setActive(null);
    if (params.get("guest")) setParams({}, { replace: true });
  }

  async function markVisited(g) {
    try {
      await api(`/api/guests/${g.id}/visit`, { method: "POST" });
      setFlash(`Visit recorded for ${g.name}. Their thank-you email is queued.`);
      await reload();
    } catch (err) {
      setFlash(err.message);
    }
  }
  async function saveNote(g, text) {
    try {
      await api(`/api/guests/${g.id}/notes`, { method: "POST", body: { noteText: text } });
      setNoteFor(null);
      setFlash(`Note saved for ${g.name}.`);
      await reload();
    } catch (err) {
      setNoteFor(null);
      setFlash(err.message);
    }
  }

  return (
    <>
      <div className="dx-head">
        <div>
          <h1>Your guest community</h1>
          <p className="dx-muted">New connections, returning guests and regulars, all in one place.</p>
        </div>
        <div className="dx-head-actions">
          <button type="button" className="dx-btn dx-btn-primary" onClick={() => openQR("join")}>
            + Invite guests (QR)
          </button>
        </div>
      </div>

      <div className="dx-stats">
        <div className="dx-stat"><span>Total members</span><b>{stats.total}</b><small>Your restaurant guest community</small></div>
        <div className="dx-stat"><span>Joined last 7 days</span><b>{stats.week}</b><small>New connections, ready for a welcome</small></div>
        <div className="dx-stat"><span>Returning members</span><b>{stats.returning}</b><small>2 or more recorded visits</small></div>
        <div className="dx-stat"><span>Your regulars</span><b>{stats.regular}</b><small>3 or more recorded visits</small></div>
      </div>

      <section className="dx-card dx-card-flush">
        <div className="dx-card-head dx-pad">
          <div>
            <h2>Your guest relationships</h2>
            <p className="dx-muted">Find the person, remember the details, plan the next welcome.</p>
          </div>
        </div>

        <div className="dx-toolbar">
          <input className="dx-input" placeholder="Search members by name, email or phone…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search members" />
          <select className="dx-input dx-select" value={filter} onChange={(e) => setFilter(e.target.value)} aria-label="Filter members">
            {FILTERS.map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
        </div>

        <div className="dx-selbar">
          <span>{selected.length} selected</span>
          <button type="button" className="dx-btn dx-btn-sm" disabled={selected.length === 0} onClick={() => setMsg({ title: `Email ${selected.length} ${selected.length === 1 ? "guest" : "guests"}`, ids: selected, text: "" })}>
            ✉ Compose email
          </button>
          {selected.length > 0 && (
            <button type="button" className="dx-link" onClick={() => setSelected([])}>Clear selection</button>
          )}
          <span className="dx-muted dx-right">{list.length} members in this view</span>
        </div>

        {flash && <p className="dx-flash">{flash}</p>}

        <div className="dx-tablewrap">
          <table className="dx-table">
            <thead>
              <tr>
                <th className="dx-check-col">
                  <input type="checkbox" aria-label="Select all shown" checked={allShown} onChange={() => setSelected(allShown ? [] : list.map((g) => g.id))} />
                </th>
                <th>Member</th>
                <th>Relationship</th>
                <th>Visits</th>
                <th>Last visit</th>
                <th>Joined</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="7" className="dx-empty">Loading…</td></tr>
              ) : list.length === 0 ? (
                <tr>
                  <td colSpan="7" className="dx-empty">
                    {guests.length === 0 ? "No guests yet. Once guests scan your QR code, they'll appear here." : "No members match your search."}
                  </td>
                </tr>
              ) : (
                list.map((g) => {
                  const rel = relationship(g);
                  const last = parseDbTime(g.last_visit);
                  const joined = parseDbTime(g.created_at);
                  const joinedDays = daysSince(g.created_at);
                  return (
                    <tr key={g.id} className={selected.includes(g.id) ? "is-sel" : ""}>
                      <td className="dx-check-col">
                        <input type="checkbox" aria-label={`Select ${g.name}`} checked={selected.includes(g.id)} onChange={() => toggle(g.id)} />
                      </td>
                      <td>
                        <div className="dx-person">
                          <span className="dx-avatar">{initials(g.name)}</span>
                          <div>
                            <b>{g.name}</b>
                            <p className="dx-muted dx-small">{g.email || g.phone || "No contact details"}{g.unsubscribed_at ? " · unsubscribed from emails" : ""}</p>
                          </div>
                        </div>
                      </td>
                      <td><span className={`dx-pill r-${rel.key}`}>{rel.label}</span></td>
                      <td>{g.visit_count ?? 0}</td>
                      <td>
                        {last ? (
                          <>
                            {fmtShort(last)}
                            <p className="dx-muted dx-small">{ago(daysSince(g.last_visit))}</p>
                          </>
                        ) : (
                          "No visit recorded"
                        )}
                      </td>
                      <td>
                        {joined ? fmtShort(joined) : "—"}
                        {joinedDays != null && joinedDays < 7 && <p className="dx-accent dx-small">New this week</p>}
                      </td>
                      <td>
                        <button type="button" className="dx-link" onClick={() => setActive(g)}>View profile →</button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        <p className="dx-tablefoot dx-muted">Relationships use recorded visits. Emails are sent from your own address, and only to guests with an email on file.</p>
      </section>

      {activeGuest && (
        <div className="dx-overlay dx-overlay-side" onClick={closeProfile} role="presentation">
          <aside className="dx-drawer" role="dialog" aria-modal="true" aria-label="Guest profile" onClick={(e) => e.stopPropagation()}>
            <div className="dx-modal-head">
              <p className="dx-label">Guest profile</p>
              <button type="button" className="dx-x" onClick={closeProfile} aria-label="Close">×</button>
            </div>
            <div className="dx-person dx-person-lg">
              <span className="dx-avatar dx-avatar-lg">{initials(activeGuest.name)}</span>
              <div>
                <h3>{activeGuest.name}</h3>
                <span className={`dx-pill r-${relationship(activeGuest).key}`}>{relationship(activeGuest).label}</span>
              </div>
            </div>
            <dl className="dx-facts">
              <div><dt>Email</dt><dd>{activeGuest.email || "None on file"}</dd></div>
              <div><dt>Phone</dt><dd>{activeGuest.phone || "None on file"}</dd></div>
              <div><dt>Member number</dt><dd>#{activeGuest.membership_number}</dd></div>
              <div><dt>Joined</dt><dd>{parseDbTime(activeGuest.created_at) ? fmtShort(parseDbTime(activeGuest.created_at)) : "—"}</dd></div>
              {activeGuest.birthday_day && activeGuest.birthday_month ? (
                <div><dt>Birthday</dt><dd>{activeGuest.birthday_day} {new Date(2000, activeGuest.birthday_month - 1, 1).toLocaleString("en-GB", { month: "long" })}</dd></div>
              ) : null}
              <div>
                <dt>Visits</dt>
                <dd>{activeGuest.visit_count ?? 0} · last seen {activeGuest.last_visit ? ago(daysSince(activeGuest.last_visit)) : "never"}</dd>
              </div>
            </dl>
            <h4>Latest note</h4>
            <div className="dx-note-box">{activeGuest.latest_note || "No notes yet."}</div>
            <div className="dx-stack-full">
              <button type="button" className="dx-btn dx-btn-primary" onClick={() => markVisited(activeGuest)}>Mark visited today</button>
              <button type="button" className="dx-btn" disabled={!activeGuest.email} onClick={() => setMsg({ title: `Message ${activeGuest.name}`, ids: [activeGuest.id], text: "" })}>
                ✉ Send email
              </button>
              <button type="button" className="dx-btn" onClick={() => setNoteFor(activeGuest)}>+ Add a note</button>
            </div>
          </aside>
        </div>
      )}

      {msg && (
        <MessageModal api={api} title={msg.title} guestIds={msg.ids} initialText={msg.text} onClose={() => setMsg(null)} onSent={() => { setSelected([]); reload(); }} />
      )}
      {noteFor && <NoteModal guest={noteFor} onClose={() => setNoteFor(null)} onSave={(t) => saveNote(noteFor, t)} />}
    </>
  );
}
