import { useState, useEffect } from "react";
import { API_URL } from "../api";

export default function Dashboard() {
  const [restaurant, setRestaurant] = useState(null);
  const [guests, setGuests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selected, setSelected] = useState([]);
  const [activeGuest, setActiveGuest] = useState(null);
  const [showQR, setShowQR] = useState(false);
  const [messageTarget, setMessageTarget] = useState(null); // "single" | "bulk" | null
  const [messageText, setMessageText] = useState("");
  const [messageStatus, setMessageStatus] = useState("idle");
  const [noteText, setNoteText] = useState("");
  const [showNoteBox, setShowNoteBox] = useState(false);

  const token = sessionStorage.getItem("dynr_token");

  async function loadDashboardData() {
    setLoading(true);
    try {
      const [meRes, guestsRes] = await Promise.all([
        fetch(`${API_URL}/api/member/me`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_URL}/api/guests`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      const meData = await meRes.json();
      const guestsData = await guestsRes.json();

      if (meRes.ok) setRestaurant(meData.member);
      if (guestsRes.ok) setGuests(guestsData.guests || []);
    } catch (err) {
      console.error("Failed to load dashboard data:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDashboardData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function toggleSelect(id) {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  const filteredGuests = guests.filter((g) => {
    const term = searchTerm.toLowerCase();
    if (!term) return true;
    return (
      g.name?.toLowerCase().includes(term) ||
      g.email?.toLowerCase().includes(term) ||
      g.phone?.toLowerCase().includes(term) ||
      g.membership_number?.toLowerCase().includes(term)
    );
  });

  async function handleMarkVisited(guestId) {
    try {
      const res = await fetch(`${API_URL}/api/guests/${guestId}/visit`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        loadDashboardData();
      }
    } catch (err) {
      console.error("Failed to mark visit:", err);
    }
  }

  async function handleAddNote(guestId) {
    if (!noteText.trim()) return;
    try {
      const res = await fetch(`${API_URL}/api/guests/${guestId}/notes`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ noteText }),
      });
      if (res.ok) {
        setNoteText("");
        setShowNoteBox(false);
        loadDashboardData();
      }
    } catch (err) {
      console.error("Failed to add note:", err);
    }
  }

  async function handleSendMessage() {
    if (!messageText.trim()) return;
    setMessageStatus("sending");

    const guestIds =
      messageTarget === "single" ? [activeGuest.id] : selected;

    try {
      const res = await fetch(`${API_URL}/api/guests/message`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ guestIds, message: messageText }),
      });

      if (!res.ok) throw new Error();

      setMessageStatus("success");
      setTimeout(() => {
        setMessageTarget(null);
        setMessageText("");
        setMessageStatus("idle");
        setSelected([]);
      }, 1200);
    } catch (err) {
      setMessageStatus("error");
    }
  }

  const restaurantSlug = restaurant?.slug || "";
  const joinUrl = restaurantSlug
    ? `${window.location.origin}/join/${restaurantSlug}`
    : "";

  const initials =
    restaurant?.restaurant_name
      ?.split(" ")
      .map((w) => w[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "??";

  return (
    <div className="dash-page">
      <div className="dash-shell">
        <div className="dash-topbar">
          <div className="dash-topbar-logo">
            dyn<span>R</span>
          </div>
          <div className="dash-topbar-right">
            {restaurantSlug && (
              <button
                type="button"
                className="dash-sidebar-btn"
                style={{ width: "auto", padding: "10px 18px", marginBottom: 0 }}
                onClick={() => setShowQR(true)}
              >
                Generate QR
              </button>
            )}
            <span>{restaurant?.restaurant_name || "..."}</span>
            <div className="dash-avatar">{initials}</div>
          </div>
        </div>

        <div className="dash-body">
          <div className="dash-main">
            <h2>Guests</h2>
            <p className="dash-subtitle">
              {guests.length} members · {restaurant?.restaurant_name || ""}
            </p>

            <div className="dash-search-row">
              <input
                type="text"
                placeholder="Search by name, phone, email, or membership number..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <button type="button">Search</button>
            </div>

            {selected.length > 0 && (
              <div className="dash-selection-bar">
                <span>{selected.length} guests selected</span>
                <button type="button" onClick={() => setMessageTarget("bulk")}>
                  ✉ Send email or message
                </button>
              </div>
            )}

            {loading ? (
              <div className="dash-table">
                <div className="dash-empty">Loading guests…</div>
              </div>
            ) : filteredGuests.length === 0 ? (
              <div className="dash-table">
                <div className="dash-empty">
                  {guests.length === 0
                    ? "No guests yet. Once your QR sign-up page is live, guests will start showing up here."
                    : "No guests match your search."}
                </div>
              </div>
            ) : (
              <table className="dash-table">
                <thead>
                  <tr>
                    <th></th>
                    <th>Name</th>
                    <th>Visits</th>
                    <th>Last Visit</th>
                    <th>Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredGuests.map((g) => (
                    <tr
                      key={g.id}
                      className={selected.includes(g.id) ? "is-selected" : ""}
                    >
                      <td>
                        <input
                          type="checkbox"
                          checked={selected.includes(g.id)}
                          onChange={() => toggleSelect(g.id)}
                        />
                      </td>
                      <td>
                        <span
                          className="dash-guest-name"
                          onClick={() => setActiveGuest(g)}
                          style={{ cursor: "pointer" }}
                        >
                          {g.name}
                        </span>
                      </td>
                      <td>{g.visit_count ?? 0}</td>
                      <td>{g.last_visit || "—"}</td>
                      <td>
                        {g.latest_note && (
                          <span className="dash-tag is-accent">
                            {g.latest_note.length > 24
                              ? g.latest_note.slice(0, 24) + "…"
                              : g.latest_note}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className="dash-sidebar">
            {!activeGuest ? (
              <>
                <p className="dash-sidebar-label">Guest Profile</p>
                <div className="dash-sidebar-empty">
                  Select a guest from the list to see their profile, notes,
                  and visit history here.
                </div>
              </>
            ) : (
              <>
                <p className="dash-sidebar-label">Guest Profile</p>
                <h3>{activeGuest.name}</h3>
                <p className="dash-sidebar-meta">
                  Member #{activeGuest.membership_number} · Joined{" "}
                  {activeGuest.created_at?.slice(0, 10)}
                </p>

                <h4>Notes</h4>
                <div className="dash-notes-box">
                  {activeGuest.latest_note || "No notes yet."}
                </div>

                <h4>Visit history</h4>
                <p className="dash-visit-history">
                  {activeGuest.visit_count ?? 0} visits · Last seen{" "}
                  {activeGuest.last_visit || "never"}
                </p>

                <button
                  type="button"
                  className="dash-sidebar-btn is-primary"
                  onClick={() => handleMarkVisited(activeGuest.id)}
                >
                  Mark visited today
                </button>
                <button
                  type="button"
                  className="dash-sidebar-btn"
                  onClick={() => setMessageTarget("single")}
                >
                  ✉ Send email or message
                </button>
                <button
                  type="button"
                  className="dash-sidebar-btn"
                  onClick={() => setShowNoteBox(true)}
                >
                  + Add a note
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* QR Modal */}
      {showQR && (
        <div className="dash-modal-overlay" onClick={() => setShowQR(false)}>
          <div className="dash-modal" onClick={(e) => e.stopPropagation()}>
            <img
              src={`https://api.qrserver.com/v1/create-qr-code/?size=280x280&data=${encodeURIComponent(
                joinUrl
              )}`}
              alt="QR code"
            />
            <p className="dash-modal-url">{joinUrl}</p>
            <button
              type="button"
              className="dash-sidebar-btn"
              onClick={() => setShowQR(false)}
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Add Note Modal */}
      {showNoteBox && activeGuest && (
        <div
          className="dash-modal-overlay"
          onClick={() => setShowNoteBox(false)}
        >
          <div className="dash-modal" onClick={(e) => e.stopPropagation()}>
            <h4 style={{ marginBottom: 12 }}>Add a note — {activeGuest.name}</h4>
            <textarea
              className="dash-modal-textarea"
              placeholder="e.g. Usually sits at Table 4. Nut allergy. Ordered the sea bass last visit."
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              rows={5}
            />
            <div className="dash-modal-actions">
              <button
                type="button"
                className="dash-sidebar-btn"
                onClick={() => setShowNoteBox(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="dash-sidebar-btn is-primary"
                onClick={() => handleAddNote(activeGuest.id)}
              >
                Save Note
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Send Message Modal */}
      {messageTarget && (
        <div
          className="dash-modal-overlay"
          onClick={() => setMessageTarget(null)}
        >
          <div className="dash-modal" onClick={(e) => e.stopPropagation()}>
            <h4 style={{ marginBottom: 12 }}>
              {messageTarget === "single"
                ? `Message ${activeGuest?.name}`
                : `Message ${selected.length} guests`}
            </h4>
            <textarea
              className="dash-modal-textarea"
              placeholder="Type your message here..."
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              rows={5}
            />
            {messageStatus === "error" && (
              <p style={{ color: "#b3261e", fontSize: 13, marginTop: 8 }}>
                Failed to send. Please try again.
              </p>
            )}
            {messageStatus === "success" && (
              <p style={{ color: "#1e7a34", fontSize: 13, marginTop: 8 }}>
                Message sent!
              </p>
            )}
            <div className="dash-modal-actions">
              <button
                type="button"
                className="dash-sidebar-btn"
                onClick={() => setMessageTarget(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="dash-sidebar-btn is-primary"
                onClick={handleSendMessage}
                disabled={messageStatus === "sending"}
              >
                {messageStatus === "sending" ? "Sending…" : "Send Email"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}