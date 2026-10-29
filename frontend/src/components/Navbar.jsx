import { useState, useEffect } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";

const links = [
  { to: "/what-we-do", label: "What we do" },
  { to: "/our-story", label: "Our story" },
  { to: "/for-restaurants", label: "For restaurants" },
  { to: "/membership", label: "Membership" },
  { to: "/faq", label: "FAQ" },
  { to: "/contact", label: "Contact" },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const closeMenu = () => setOpen(false);
    document.addEventListener("click", closeMenu);
    return () => document.removeEventListener("click", closeMenu);
  }, []);

  // Close the phone menu after moving to another page.
  useEffect(() => setOpen(false), [location.pathname]);

  const isActive = (path) => (location.pathname === path ? "is-active" : "");

  return (
    <header className="site-header">
      <div className="header-inner">
        <button
          className="nav-toggle"
          aria-label="Open menu"
          aria-expanded={open}
          onClick={(e) => {
            e.stopPropagation();
            setOpen(!open);
          }}
        >
          <span></span>
          <span></span>
          <span></span>
        </button>

        <Link to="/" className="logo">
          <img src="/dynR_logo.png" alt="dynR" />
        </Link>

        {/* Laptop and desktop: links always visible */}
        <nav className="nav-bar" aria-label="Main">
          {links.map((l) => (
            <NavLink key={l.to} to={l.to} className={({ isActive }) => (isActive ? "is-active" : "")}>
              {l.label}
            </NavLink>
          ))}
        </nav>

        <Link className="btn btn-sm header-cta" to="/register-as-member">
          Become a member
        </Link>
      </div>

      {/* Phones: the same links in a dropdown */}
      <nav
        className={`nav-dropdown ${open ? "is-open" : ""}`}
        onClick={(e) => e.stopPropagation()}
        aria-label="Menu"
      >
        <Link className={isActive("/")} to="/">
          Home
        </Link>
        {links.map((l) => (
          <Link key={l.to} className={isActive(l.to)} to={l.to}>
            {l.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
