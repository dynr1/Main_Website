import { useState } from "react";

function Modal({ title, onClose, children }) {
  return (
    <div className="dx-overlay" onClick={onClose} role="presentation">
      <div className="dx-modal" role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()}>
        <div className="dx-modal-head">
          <h3>{title}</h3>
          <button type="button" className="dx-x" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function QRModal({ title, url, onClose }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (e) {
      /* clipboard not available */
    }
  }
  return (
    <Modal title={title} onClose={onClose}>
      <div className="dx-qr">
        <img
          src={`https://api.qrserver.com/v1/create-qr-code/?size=280x280&data=${encodeURIComponent(url)}`}
          alt={`QR code for ${title}`}
          width="220"
          height="220"
        />
        <p className="dx-url">{url}</p>
        <button type="button" className="dx-btn" onClick={copy}>
          {copied ? "Copied" : "Copy link"}
        </button>
      </div>
    </Modal>
  );
}

export function NewReservationModal({ api, defaultDate, onClose, onSaved }) {
  const [f, setF] = useState({ name: "", partySize: 2, reservationDate: defaultDate, reservationTime: "19:00", phone: "", email: "", notes: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const set = (k) => (e) => setF((p) => ({ ...p, [k]: e.target.value }));

  async function submit(e) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      await api("/api/reservations", { method: "POST", body: f });
      onSaved(f.reservationDate);
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  }

  return (
    <Modal title="New reservation" onClose={onClose}>
      <p className="dx-muted">Make room for a great experience.</p>
      <form onSubmit={submit} className="dx-form">
        <label>
          Guest name
          <input value={f.name} onChange={set("name")} required autoFocus />
        </label>
        <div className="dx-form-row">
          <label>
            Party size
            <input type="number" min="1" max="30" value={f.partySize} onChange={set("partySize")} required />
          </label>
          <label>
            Date
            <input type="date" value={f.reservationDate} onChange={set("reservationDate")} required />
          </label>
          <label>
            Arrival time
            <input type="time" value={f.reservationTime} onChange={set("reservationTime")} required />
          </label>
        </div>
        <div className="dx-form-row">
          <label>
            Phone <span className="dx-opt">(optional)</span>
            <input type="tel" value={f.phone} onChange={set("phone")} />
          </label>
          <label>
            Email <span className="dx-opt">(optional)</span>
            <input type="email" value={f.email} onChange={set("email")} />
          </label>
        </div>
        <label>
          Notes <span className="dx-opt">(optional)</span>
          <input value={f.notes} onChange={set("notes")} placeholder="e.g. Prefers a quiet window table" />
        </label>
        {error && <p className="dx-error">{error}</p>}
        <div className="dx-actions">
          <button type="button" className="dx-btn" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="dx-btn dx-btn-primary" disabled={saving}>
            {saving ? "Saving…" : "Create reservation"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export function MessageModal({ api, title, guestIds, initialText = "", onClose, onSent }) {
  const [text, setText] = useState(initialText);
  const [state, setState] = useState("idle");
  const [error, setError] = useState("");

  async function send() {
    if (!text.trim()) return;
    setState("sending");
    setError("");
    try {
      await api("/api/guests/message", { method: "POST", body: { guestIds, message: text } });
      setState("sent");
      setTimeout(() => {
        onSent && onSent();
        onClose();
      }, 1100);
    } catch (err) {
      setError(err.message);
      setState("idle");
    }
  }

  return (
    <Modal title={title} onClose={onClose}>
      <p className="dx-muted">This is sent from your restaurant's own email address. Guests without an email on file are skipped.</p>
      <textarea className="dx-textarea" rows={6} value={text} onChange={(e) => setText(e.target.value)} placeholder="Type your message here…" autoFocus />
      {error && <p className="dx-error">{error}</p>}
      {state === "sent" && <p className="dx-ok">Message sent.</p>}
      <div className="dx-actions">
        <button type="button" className="dx-btn" onClick={onClose}>
          Cancel
        </button>
        <button type="button" className="dx-btn dx-btn-primary" onClick={send} disabled={state === "sending" || !text.trim()}>
          {state === "sending" ? "Sending…" : "Send email"}
        </button>
      </div>
    </Modal>
  );
}

export function NoteModal({ guest, onClose, onSave }) {
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);
  return (
    <Modal title={`Add a note — ${guest.name}`} onClose={onClose}>
      <textarea
        className="dx-textarea"
        rows={5}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="e.g. Usually sits at Table 4. Nut allergy. Ordered the sea bass last visit."
        autoFocus
      />
      <div className="dx-actions">
        <button type="button" className="dx-btn" onClick={onClose}>
          Cancel
        </button>
        <button
          type="button"
          className="dx-btn dx-btn-primary"
          disabled={saving || !text.trim()}
          onClick={async () => {
            setSaving(true);
            await onSave(text);
          }}
        >
          {saving ? "Saving…" : "Save note"}
        </button>
      </div>
    </Modal>
  );
}
