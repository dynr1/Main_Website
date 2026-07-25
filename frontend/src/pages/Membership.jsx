import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function Membership() {
  const [tab, setTab] = useState("register");
  const navigate = useNavigate();

  const [registerForm, setRegisterForm] = useState({
    restaurantName: "",
    email: "",
    phone: "",
    password: "",
  });
  const [loginForm, setLoginForm] = useState({ email: "", password: "" });

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function handleRegisterChange(e) {
    const { name, value } = e.target;
    setRegisterForm((f) => ({ ...f, [name]: value }));
  }

  function handleLoginChange(e) {
    const { name, value } = e.target;
    setLoginForm((f) => ({ ...f, [name]: value }));
  }

  async function handleRegisterSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(registerForm),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || "Something went wrong. Please try again.");
      }

      sessionStorage.setItem("dynr_token", data.token);
      navigate("/membership/payment");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleLoginSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(loginForm),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || "Invalid email or password.");
      }

      sessionStorage.setItem("dynr_token", data.token);

      if (data.isPaid) {
        navigate("/dashboard");
      } else {
        navigate("/membership/payment");
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section>
      <div className="container content-block">
        <span className="eyebrow">Membership</span>
        <h1 style={{ marginTop: "14px", marginBottom: "32px" }}>
          Join dynR
        </h1>

        <div className="auth-tabs">
          <button
            className={`auth-tab ${tab === "register" ? "is-active" : ""}`}
            onClick={() => {
              setTab("register");
              setError("");
            }}
          >
            Register
          </button>
          <button
            className={`auth-tab ${tab === "login" ? "is-active" : ""}`}
            onClick={() => {
              setTab("login");
              setError("");
            }}
          >
            Sign In
          </button>
        </div>

        {error && <div className="form-error">{error}</div>}

        {tab === "register" ? (
          <form onSubmit={handleRegisterSubmit}>
            <div className="form-group">
              <label htmlFor="restaurantName">Restaurant Name</label>
              <input
                id="restaurantName"
                name="restaurantName"
                type="text"
                placeholder="The Olive Branch"
                value={registerForm.restaurantName}
                onChange={handleRegisterChange}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                name="email"
                type="email"
                placeholder="jane@restaurant.com"
                value={registerForm.email}
                onChange={handleRegisterChange}
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
                value={registerForm.phone}
                onChange={handleRegisterChange}
              />
            </div>

            <div className="form-group">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                name="password"
                type="password"
                placeholder="At least 8 characters"
                value={registerForm.password}
                onChange={handleRegisterChange}
                required
                minLength={8}
              />
            </div>

            <button type="submit" className="btn" disabled={loading}>
              {loading ? "Creating account…" : "Continue to Payment"}
            </button>
          </form>
        ) : (
          <form onSubmit={handleLoginSubmit}>
            <div className="form-group">
              <label htmlFor="loginEmail">Email</label>
              <input
                id="loginEmail"
                name="email"
                type="email"
                placeholder="jane@restaurant.com"
                value={loginForm.email}
                onChange={handleLoginChange}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="loginPassword">Password</label>
              <input
                id="loginPassword"
                name="password"
                type="password"
                placeholder="Your password"
                value={loginForm.password}
                onChange={handleLoginChange}
                required
              />
            </div>

            <button type="submit" className="btn" disabled={loading}>
              {loading ? "Signing in…" : "Sign In"}
            </button>
          </form>
        )}
      </div>
    </section>
  );
}