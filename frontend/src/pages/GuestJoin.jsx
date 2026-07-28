import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { API_URL } from "../api";
import "./GuestJoin.css";

const months = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export default function GuestJoin() {
  const { slug } = useParams();
  const [restaurant, setRestaurant] = useState(null);
  const [loadingRestaurant, setLoadingRestaurant] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [form, setForm] = useState({
    name: "",
    birthdayDay: "",
    birthdayMonth: "",
    email: "",
    phone: "",
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

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/api/public/guests`, {
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
          <p>This sign-up page couldn't be found.</p>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="join-page">
        <div className="join-card">
          <p className="join-eyebrow">{restaurant.name}</p>
          <h1 className="join-title">You're in!</h1>
          <p className="join-sub">
            Thanks for joining — check your inbox for a welcome message from{" "}
            {restaurant.name}.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="join-page">
      <div className="join-card">
        <p className="join-eyebrow">{restaurant.name}</p>
        <h1 className="join-title">Join and become part of our family.</h1>
        <p className="join-sub">
          Sign up in seconds and become one of ours — members get first
          access to offers, deals, and things happening here before anyone
          else.
        </p>

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
              <label htmlFor="birthdayDay">Birthday — day</label>
              <input
                id="birthdayDay"
                name="birthdayDay"
                type="number"
                min="1"
                max="31"
                placeholder="15"
                value={form.birthdayDay}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="birthdayMonth">Birthday — month</label>
              <select
                id="birthdayMonth"
                name="birthdayMonth"
                value={form.birthdayMonth}
                onChange={handleChange}
                required
              >
                <option value="" disabled>
                  Select
                </option>
                {months.map((m, i) => (
                  <option key={m} value={i + 1}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
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
            <label htmlFor="phone">Phone number</label>
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

          <button type="submit" className="join-btn" disabled={loading}>
            {loading ? "Joining…" : "Join"}
          </button>

          <p className="join-fineprint">
            By joining, you'll get a short welcome message from{" "}
            {restaurant.name}. No spam, unsubscribe anytime.
          </p>
        </form>
      </div>
    </div>
  );
}