import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { API_URL } from "../api";

const initialForm = {
  restaurantName: "",
  email: "",
  phone: "",
  password: "",
};

export default function Membership() {
  const navigate = useNavigate();
  const [openingId, setOpeningId] = useState(null);
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const [restaurants, setRestaurants] = useState([]);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState("");
  const [togglingId, setTogglingId] = useState(null);

  // Database login for a restaurant's folder — shown once after creating a
  // restaurant, or after generating a new password.
  const [dbInfo, setDbInfo] = useState(null);
  const [resettingId, setResettingId] = useState(null);
  const [copied, setCopied] = useState(false);

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

  async function resetDbPassword(restaurant) {
    const sure = window.confirm(
      `Generate a new database password for ${restaurant.restaurant_name}'s folder? The old one will stop working.`
    );
    if (!sure) return;

    setResettingId(restaurant.id);
    setListError("");
    try {
      const res = await fetch(
        `${API_URL}/api/admin/restaurants/${restaurant.id}/database-password`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${adminToken}` },
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to reset the password.");
      setCopied(false);
      setDbInfo({ name: restaurant.restaurant_name, ...data.database });
    } catch (err) {
      setListError(err.message);
    } finally {
      setResettingId(null);
    }
  }

  // Signs this tab in as the restaurant (for 1 hour) and opens its dashboard.
  // Your admin session stays in place, so you can come straight back here.
  async function openDashboard(restaurant) {
    setOpeningId(restaurant.id);
    setListError("");
    try {
      const res = await fetch(
        `${API_URL}/api/admin/restaurants/${restaurant.id}/open-dashboard`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${adminToken}` },
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Could not open the dashboard.");
      sessionStorage.setItem("dynr_token", data.token);
      navigate("/dashboard");
    } catch (err) {
      setListError(err.message);
      setOpeningId(null);
    }
  }

  async function copyDbInfo() {
    if (!dbInfo) return;
    const text = [
      `Restaurant: ${dbInfo.name}`,
      `Host: ${dbInfo.host || "—"}`,
      `Database: ${dbInfo.database || "—"}`,
      `Folder (schema): ${dbInfo.schema}`,
      `Login: ${dbInfo.role}`,
      `Password: ${dbInfo.password || "—"}`,
    ].join("\n");
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
    } catch (err) {
      // Clipboard not available — the details are still selectable on screen.
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
      if (data.database) {
        setCopied(false);
        setDbInfo({ name: form.restaurantName, ...data.database });
      }
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

        {dbInfo && (
          <div
            className="form-error"
            style={{
              background: "#fff8e6",
              color: "#5c4400",
              borderColor: "#f0dca0",
              marginBottom: "24px",
            }}
          >
            <strong>Database login for {dbInfo.name}</strong>
            <div style={{ margin: "6px 0 10px" }}>
              Save this now — the password is shown only once. (You can always generate a
              new one from the table below.)
            </div>
            <div
              style={{
                fontFamily: "monospace",
                fontSize: "13px",
                lineHeight: 1.7,
                userSelect: "all",
                wordBreak: "break-all",
              }}
            >
              <div>Host: {dbInfo.host || "—"}</div>
              <div>Database: {dbInfo.database || "—"}</div>
              <div>Folder (schema): {dbInfo.schema}</div>
              <div>Login: {dbInfo.role}</div>
              <div>Password: {dbInfo.password || "— (unchanged)"}</div>
            </div>
            <div style={{ marginTop: "12px", display: "flex", gap: "8px" }}>
              <button type="button" className="btn" onClick={copyDbInfo}>
                {copied ? "Copied ✓" : "Copy details"}
              </button>
              <button type="button" className="btn" onClick={() => setDbInfo(null)}>
                Dismiss
              </button>
            </div>
          </div>
        )}

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
                <th>Welcome Email</th>
                <th>Password</th>
                <th>Database folder</th>
                <th>Payment</th>
              </tr>
            </thead>
            <tbody>
              {restaurants.map((r) => (
                <tr key={r.id}>
                  <td>
                    {r.restaurant_name}
                    <div>
                      <button
                        type="button"
                        className="dash-tag"
                        style={{ cursor: "pointer", border: "none", marginTop: "6px" }}
                        onClick={() => openDashboard(r)}
                        disabled={openingId === r.id || !r.schema_name}
                      >
                        {openingId === r.id ? "Opening…" : "Open dashboard →"}
                      </button>
                    </div>
                  </td>
                  <td>{r.email}</td>
                  <td>{r.phone || "—"}</td>
                  <td>{r.created_at?.slice(0, 10)}</td>
                  <td>
                    <span
                      className="dash-tag"
                      style={{
                        background: r.welcome_email_sent ? "#eaf7ec" : "#fdeceb",
                        color: r.welcome_email_sent ? "#1e7a34" : "#b3261e",
                      }}
                    >
                      {r.welcome_email_sent ? "Sent" : "Failed"}
                    </span>
                  </td>
                  <td>
                    {r.password_changed_at ? (
                      <span
                        className="dash-tag"
                        style={{ background: "#eaf7ec", color: "#1e7a34" }}
                      >
                        Changed {r.password_changed_at.slice(0, 10)}
                      </span>
                    ) : (
                      <span className="dash-tag" style={{ whiteSpace: "nowrap" }}>
                        No change recorded
                      </span>
                    )}
                  </td>
                  <td>
                    {r.schema_name ? (
                      <>
                        <div style={{ fontFamily: "monospace", fontSize: "12px" }}>
                          {r.schema_name}
                        </div>
                        <button
                          type="button"
                          className="dash-tag"
                          style={{ cursor: "pointer", border: "none", marginTop: "4px" }}
                          onClick={() => resetDbPassword(r)}
                          disabled={resettingId === r.id}
                        >
                          {resettingId === r.id ? "Working…" : "New DB password"}
                        </button>
                      </>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td>
                    <button
                      type="button"
                      className="dash-tag"
                      style={{
                        cursor: "pointer",
                        border: "none",
                        whiteSpace: "nowrap",
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
                        : "Unpaid — mark paid"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <span className="eyebrow">Admin — Add Member Restaurant</span>
        <h1 style={{ marginTop: "14px", marginBottom: "32px" }}>
          Create a restaurant account
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
            Restaurant account created — a welcome email with their dashboard
            login has been sent.
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

          <div className="form-group">
            <label htmlFor="password">Dashboard Password</label>
            <input
              id="password"
              name="password"
              type="password"
              placeholder="At least 8 characters"
              value={form.password}
              onChange={handleChange}
              required
              minLength={8}
            />
          </div>

          <button type="submit" className="btn" disabled={loading}>
            {loading ? "Creating account…" : "Create Account & Send Login"}
          </button>
        </form>
      </div>
    </section>
  );
}