import { useCallback, useEffect, useMemo, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { makeApi, initials, fmtLong } from "./dashUtils";
import { QRModal, NewReservationModal } from "./DashModals";
import { ymd } from "./dashUtils";

const NAV = [
  { to: "/dashboard", label: "Dashboard", icon: "◫", end: true },
  { to: "/dashboard/reservations", label: "Reservations", icon: "▤" },
  { to: "/dashboard/members", label: "Members", icon: "♧" },
  { to: "/dashboard/marketing", label: "Marketing", icon: "↗" },
  { to: "/settings", label: "Settings", icon: "⚙" },
];

const TITLES = {
  "/dashboard": "Overview",
  "/dashboard/reservations": "Reservations",
  "/dashboard/members": "Members",
  "/dashboard/marketing": "Marketing",
  "/settings": "Settings",
};

export default function DashboardLayout() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const token = sessionStorage.getItem("dynr_token");
  const api = useMemo(() => makeApi(token), [token]);

  const [restaurant, setRestaurant] = useState(null);
  const [guests, setGuests] = useState([]);
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [qr, setQr] = useState(null); // "join" | "reserve" | null
  const [newRes, setNewRes] = useState(null); // default date string, or null
  const [afterSave, setAfterSave] = useState(null);

  const reload = useCallback(async () => {
    try {
      const [me, g, r] = await Promise.all([api("/api/member/me"), api("/api/guests"), api("/api/reservations")]);
      setRestaurant(me.member);
      setGuests(g.guests || []);
      setReservations(r.reservations || []);
      setLoadError("");
    } catch (err) {
      setLoadError(err.message);
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    if (!token) {
      navigate("/login", { replace: true });
      return;
    }
    reload();
  }, [token, navigate, reload]);

  function signOut() {
    sessionStorage.removeItem("dynr_token");
    navigate("/login");
  }

  const slug = restaurant?.slug || "";
  const joinUrl = slug ? `${window.location.origin}/join/${slug}` : "";
  const reserveUrl = slug ? `${window.location.origin}/table/${slug}` : "";
  const name = restaurant?.restaurant_name || "Your restaurant";

  const openNewReservation = useCallback((date, then) => {
    setAfterSave(() => then || null);
    setNewRes(date || ymd(new Date()));
  }, []);

  if (!token) return null;

  return (
    <div className="dx">
      <aside className="dx-side">
        <div className="dx-logo">
          dyn<span>R</span>
        </div>
        <div className="dx-rest">
          <b>{name}</b>
          <small>Restaurant workspace</small>
        </div>
        <p className="dx-side-label">Restaurant workspace</p>
        <nav className="dx-nav" aria-label="Dashboard">
          {NAV.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.end} className={({ isActive }) => "dx-nav-item" + (isActive ? " on" : "")}>
              <i aria-hidden="true">{n.icon}</i>
              <span>{n.label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="dx-user">
          <span className="dx-avatar">{initials(name)}</span>
          <div>
            <b>{name}</b>
            <button type="button" onClick={signOut}>
              Sign out
            </button>
          </div>
        </div>
      </aside>

      <div className="dx-main">
        <header className="dx-top">
          <div className="dx-crumb">
            Workspace / <b>{TITLES[pathname] || "Overview"}</b>
          </div>
          <div className="dx-top-actions">
            {slug && (
              <>
                <button type="button" className="dx-link" onClick={() => setQr("join")}>
                  Guest sign-up QR
                </button>
                <button type="button" className="dx-link" onClick={() => setQr("reserve")}>
                  Booking link
                </button>
              </>
            )}
          </div>
        </header>

        <main className="dx-content">
          {loadError && (
            <div className="dx-banner">
              We couldn't load your latest information. {loadError}{" "}
              <button type="button" className="dx-link" onClick={reload}>
                Try again
              </button>
            </div>
          )}
          <Outlet
            context={{ api, restaurant, guests, reservations, loading, reload, openNewReservation, openQR: setQr, name, today: fmtLong(new Date()) }}
          />
        </main>
      </div>

      {qr && (
        <QRModal
          title={qr === "join" ? "Guest sign-up QR code" : "Booking page link"}
          url={qr === "join" ? joinUrl : reserveUrl}
          onClose={() => setQr(null)}
        />
      )}
      {newRes && (
        <NewReservationModal
          api={api}
          defaultDate={newRes}
          onClose={() => setNewRes(null)}
          onSaved={async (date) => {
            setNewRes(null);
            await reload();
            if (afterSave) afterSave(date);
          }}
        />
      )}
    </div>
  );
}
