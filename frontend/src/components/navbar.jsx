import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(
  () => !!sessionStorage.getItem("dynr_admin_token")
);
  const location = useLocation();

  useEffect(() => {
    const closeMenu = () => setOpen(false);
    document.addEventListener("click", closeMenu);
    return () => document.removeEventListener("click", closeMenu);
  }, []);

  useEffect(() => {
  function checkAdmin() {
    setIsAdmin(!!sessionStorage.getItem("dynr_admin_token"));
  }
  checkAdmin();
  window.addEventListener("dynr-admin-unlock", checkAdmin);
  return () => window.removeEventListener("dynr-admin-unlock", checkAdmin);
}, [location.pathname]);

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
      </div>

      <nav
        className={`nav-dropdown ${open ? "is-open" : ""}`}
        onClick={(e) => e.stopPropagation()}
      >
        <Link className={isActive("/")} to="/">
          Home
        </Link>
        <Link className={isActive("/what-we-do")} to="/what-we-do">
          What We Do
        </Link>
        <Link className={isActive("/our-story")} to="/our-story">
          Our Story
        </Link>
        <Link className={isActive("/for-restaurants")} to="/for-restaurants">
          For Restaurants
        </Link>

        {isAdmin && (
          <Link className={isActive("/membership")} to="/membership">
            Membership
          </Link>
        )}

        <Link className={isActive("/contact")} to="/contact">
          Contact
        </Link>
      </nav>
    </header>
  );
}