import { useState, useEffect } from "react";
import { API_URL } from "../api";

const initialForm = {
  restaurantName: "",
  email: "",
  phone: "",
  smtpHost: "",
  smtpPort: "",
  smtpUser: "",
  smtpPass: "",
  googleReviewUrl: "",
};

export default function Membership() {
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const [restaurants, setRestaurants] = useState([]);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState("");
  const [togglingId, setTogglingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const adminToken = sessionStorage.getItem("dynr_admin_token");

  async function loadRestaurants() {
    setListLoading(true);
    setListError("");
    try {
      const res = await fetch(`${API_URL}/api/admin/restaurants`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to load restaurants.");
      setRestaurants(data.restaurants || []);
    } catch (err) {
      setListError(err.message);
    } finally {
      setListLoading(false);
    }
  }

  useEffect(() => {
    loadRestaurants();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function togglePayment(restaurant) {
    const nextStatus = restaurant.payment_status === "paid" ? "unpaid" : "paid";
    setTogglingId(restaurant.id);
    try {
      const res = await fetch(`${API_URL}/api/admin/restaurants/${restaurant.id}/payment`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({ paymentStatus: nextStatus }),
      });
      if (!res.ok) throw new Error();
      setRestaurants((prev) =>
        prev.map((r) => (r.id === restaurant.id ? { ...r, payment_status: nextStatus } : r))
      );
    } catch (err) {
      setListError("Failed to update payment status. Please try again.");
    } finally {
      setTogglingId(null);
    }
  }

  async function deleteRestaurant(restaurant) {
    const confirmed = window.confirm(
      `Delete "${restaurant.restaurant_name}"? This permanently removes them and all of their guests, visits, and notes. This can't be undone.`
    );
    if (!confirmed) return;

    setDeletingId(restaurant.id);
    try {
      const res = await fetch(`${API_URL}/api/admin/restaurants/${restaurant.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      if (!res.ok) throw new Error();
      setRestaurants((prev) => prev.filter((r) => r.id !== restaurant.id));
    } catch (err) {
      setListError("Failed to delete restaurant. Please try again.");
    } finally {
      setDeletingId(null);
    }
  }

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    setSuccess(false);

    try {
      const res = await fetch(`${API_URL}/api/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify(form),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || "Something went wrong. Please try again.");
      }

      setSuccess(true);
      setForm(initialForm);
      loadRestaurants();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section>
      <div className="container content-block">
        <span className="eyebrow">Admin — Restaurants</span>
        <h1 style={{ marginTop: "14px", marginBottom: "24px" }}>
          Registered restaurants
        </h1>

        {listError && <div className="form-error">{listError}</div>}

        {listLoading ? (
          <p>Loading restaurants…</p>
        ) : restaurants.length === 0 ? (
          <p>No restaurants registered yet — add one below.</p>
        ) : (
          <table className="dash-table" style={{ marginBottom: "40px" }}>
            <thead>
              <tr>
                <th>Restaurant</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Registered</th>
                <th>Sending</th>
                <th>Payment</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {restaurants.map((r) => (
                <tr key={r.id}>
                  <td>{r.restaurant_name}</td>
                  <td>{r.email}</td>
                  <td>{r.phone || "—"}</td>
                  <td>{r.created_at?.slice(0, 10)}</td>
                  <td>
                    <span
                      className="dash-tag"
                      style={{
                        background: r.smtp_configured ? "#eaf7ec" : "#fdeceb",
                        color: r.smtp_configured ? "#1e7a34" : "#b3261e",
                      }}
                    >
                      {r.smtp_configured ? "SMTP set" : "Needs SMTP"}
                    </span>
                  </td>
                  <td>
                    <button
                      type="button"
                      className="dash-tag"
                      style={{
                        cursor: "pointer",
                        border: "none",
                        background: r.payment_status === "paid" ? "#eaf7ec" : "#fdeceb",
                        color: r.payment_status === "paid" ? "#1e7a34" : "#b3261e",
                      }}
                      onClick={() => togglePayment(r)}
                      disabled={togglingId === r.id}
                    >
                      {togglingId === r.id
                        ? "Updating…"
                        : r.payment_status === "paid"
                        ? "Paid ✓"
                        : "Unpaid — click to mark paid"}
                    </button>
                  </td>
                  <td>
                    <button
                      type="button"
                      className="dash-tag"
                      style={{
                        cursor: "pointer",
                        border: "1px solid #f3c2bd",
                        background: "#fff",
                        color: "#b3261e",
                      }}
                      onClick={() => deleteRestaurant(r)}
                      disabled={deletingId === r.id}
                    >
                      {deletingId === r.id ? "Deleting…" : "Delete"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <span className="eyebrow">Admin — Add Member Restaurant</span>
        <h1 style={{ marginTop: "14px", marginBottom: "32px" }}>
          Set up a new restaurant
        </h1>

        {error && <div className="form-error">{error}</div>}

        {success && (
          <div
            className="form-error"
            style={{
              background: "#eaf7ec",
              color: "#1e7a34",
              borderColor: "#bfe6c8",
            }}
          >
            Restaurant account created — an email with their password setup
            link and payment link has been sent.
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="restaurantName">Restaurant Name</label>
            <input
              id="restaurantName"
              name="restaurantName"
              type="text"
              placeholder="The Olive Branch"
              value={form.restaurantName}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="email">Restaurant Email</label>
            <input
              id="email"
              name="email"
              type="email"
              placeholder="jane@restaurant.com"
              value={form.email}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="phone">Contact Number</label>
            <input
              id="phone"
              name="phone"
              type="tel"
              placeholder="07123 456789"
              value={form.phone}
              onChange={handleChange}
            />
          </div>

          <h3 style={{ marginTop: "28px", marginBottom: "4px" }}>
            Email (SMTP) — optional, can be added later in their Settings
          </h3>
          <p style={{ marginBottom: "16px", opacity: 0.8 }}>
            Set this now so guest emails and visit follow-ups work immediately,
            without the restaurant needing to log in and configure it themselves.
          </p>

          <div className="form-group">
            <label htmlFor="smtpHost">SMTP Host</label>
            <input
              id="smtpHost"
              name="smtpHost"
              type="text"
              placeholder="smtp.gmail.com"
              value={form.smtpHost}
              onChange={handleChange}
            />
          </div>

          <div className="form-group">
            <label htmlFor="smtpPort">SMTP Port</label>
            <input
              id="smtpPort"
              name="smtpPort"
              type="text"
              placeholder="587"
              value={form.smtpPort}
              onChange={handleChange}
            />
          </div>

          <div className="form-group">
            <label htmlFor="smtpUser">Email Address</label>
            <input
              id="smtpUser"
              name="smtpUser"
              type="email"
              placeholder="jane@restaurant.com"
              value={form.smtpUser}
              onChange={handleChange}
            />
          </div>

          <div className="form-group">
            <label htmlFor="smtpPass">Email Password / App Password</label>
            <input
              id="smtpPass"
              name="smtpPass"
              type="password"
              placeholder="16-character app password"
              value={form.smtpPass}
              onChange={handleChange}
            />
          </div>

          <div className="form-group">
            <label htmlFor="googleReviewUrl">Google Review Link</label>
            <input
              id="googleReviewUrl"
              name="googleReviewUrl"
              type="url"
              placeholder="https://g.page/r/..."
              value={form.googleReviewUrl}
              onChange={handleChange}
            />
          </div>

          <button type="submit" className="btn" disabled={loading}>
            {loading ? "Sending…" : "Set Up Payment Method & Send Login"}
          </button>
        </form>
      </div>
    </section>
  );
}