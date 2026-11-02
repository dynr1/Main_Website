import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { API_URL } from "../api";
import "./GuestJoin.css";

export default function ReserveTable() {
  const { slug } = useParams();
  const [restaurant, setRestaurant] = useState(null);
  const [loadingRestaurant, setLoadingRestaurant] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    partySize: "",
    reservationDate: "",
    reservationTime: "",
    notes: "",
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function fetchRestaurant() {
      try {
        const res = await fetch(`${API_URL}/api/public/restaurant/${slug}`);
        if (!res.ok) {
          setNotFound(true);
          return;
        }
        const data = await res.json();
        setRestaurant(data);
      } catch {
        setNotFound(true);
      } finally {
        setLoadingRestaurant(false);
      }
    }
    fetchRestaurant();
  }, [slug]);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  }

  const hours = restaurant?.openingHours || null;
  const dayInfo = (dateStr) => {
    if (!hours || !dateStr) return null;
    const [y, m, d] = dateStr.split("-").map(Number);
    const key = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"][new Date(y, m - 1, d).getDay()];
    return { key, ...hours[key] };
  };
  const chosenDay = dayInfo(form.reservationDate);
  const closedToday = chosenDay && !chosenDay.open;

  // Booking times in 15-minute steps, from opening to the last booking.
  const timeOptions = (() => {
    if (!chosenDay || !chosenDay.open) return [];
    const toMin = (t) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));
    const out = [];
    for (let m = toMin(chosenDay.from); m <= toMin(chosenDay.to); m += 15) {
      out.push(`${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`);
    }
    return out;
  })();

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/api/public/reservations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, ...form }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || "Something went wrong. Please try again.");
      }

      setSuccess(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (loadingRestaurant) return null;

  if (notFound) {
    return (
      <div className="join-page">
        <div className="join-card">
          <p>This reservation page couldn't be found.</p>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="join-page">
        <div className="join-card">
          <p className="join-eyebrow">{restaurant.name}</p>
          <h1 className="join-title">You're booked in!</h1>
          <p className="join-sub">
            Thanks, {form.name.split(" ")[0]} — your table request has been
            sent to {restaurant.name}. They'll be in touch if anything needs
            confirming.
          </p>
        </div>
      </div>
    );
  }

  // Opening hours summary shown under the heading.
  const DAYS = [["mon", "Mon"], ["tue", "Tue"], ["wed", "Wed"], ["thu", "Thu"], ["fri", "Fri"], ["sat", "Sat"], ["sun", "Sun"]];

  // Restrict the date picker to today onward.
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="join-page">
      <div className="join-card">
        <p className="join-eyebrow">{restaurant.name}</p>
        <h1 className="join-title">Reserve a table</h1>
        <p className="join-sub">
          Fill in your details below and {restaurant.name} will have your
          table request ready to go.
        </p>

        {hours && (
          <ul className="join-hours" aria-label="Opening hours">
            {DAYS.map(([k, l]) => (
              <li key={k}>
                <b>{l}</b>
                <span>{hours[k]?.open ? `${hours[k].from}–${hours[k].to}` : "Closed"}</span>
              </li>
            ))}
          </ul>
        )}

        {error && <div className="form-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="name">Your name</label>
            <input
              id="name"
              name="name"
              type="text"
              placeholder="e.g. Sarah Bennett"
              value={form.name}
              onChange={handleChange}
              required
            />
          </div>

          <div className="join-row">
            <div className="form-group">
              <label htmlFor="reservationDate">Date</label>
              <input
                id="reservationDate"
                name="reservationDate"
                type="date"
                min={today}
                value={form.reservationDate}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="reservationTime">Time</label>
              {hours ? (
                <select
                  id="reservationTime"
                  name="reservationTime"
                  value={form.reservationTime}
                  onChange={handleChange}
                  disabled={!form.reservationDate || closedToday}
                  required
                >
                  <option value="">{!form.reservationDate ? "Pick a date first" : closedToday ? "Closed" : "Choose a time"}</option>
                  {timeOptions.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              ) : (
                <input
                  id="reservationTime"
                  name="reservationTime"
                  type="time"
                  value={form.reservationTime}
                  onChange={handleChange}
                  required
                />
              )}
            </div>
          </div>
          {closedToday && (
            <div className="form-error">
              Sorry, {restaurant.name} is closed on that day. Please choose another date.
            </div>
          )}

          <div className="form-group">
            <label htmlFor="partySize">Party size</label>
            <input
              id="partySize"
              name="partySize"
              type="number"
              min="1"
              max="30"
              placeholder="e.g. 4"
              value={form.partySize}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="phone">Mobile number</label>
            <input
              id="phone"
              name="phone"
              type="tel"
              placeholder="07123 456789"
              value={form.phone}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              name="email"
              type="email"
              placeholder="sarah@email.com"
              value={form.email}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="notes">Special requests (optional)</label>
            <textarea
              id="notes"
              name="notes"
              placeholder="e.g. Celebrating a birthday, window seat if possible..."
              value={form.notes}
              onChange={handleChange}
              rows={3}
            />
          </div>

          <button type="submit" className="join-btn" disabled={loading}>
            {loading ? "Booking…" : "Reserve Table"}
          </button>

          <p className="join-fineprint">
            {restaurant.name} will contact you directly if anything about
            your booking needs to change.
          </p>
        </form>
      </div>
    </div>
  );
}