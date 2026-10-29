import { API_URL } from "../api";

// Small helper that talks to the backend as the signed-in restaurant.
export function makeApi(token) {
  return async function api(path, { method = "GET", body } = {}) {
    const res = await fetch(`${API_URL}${path}`, {
      method,
      headers: {
        ...(body ? { "Content-Type": "application/json" } : {}),
        Authorization: `Bearer ${token}`,
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    let data = {};
    try {
      data = await res.json();
    } catch (e) {
      /* no body */
    }
    if (res.status === 401) {
      sessionStorage.removeItem("dynr_token");
      window.location.href = "/login";
    }
    if (!res.ok) throw new Error(data.error || "Something went wrong. Please try again.");
    return data;
  };
}

const pad = (n) => String(n).padStart(2, "0");

// Local calendar date as YYYY-MM-DD (matches how bookings are stored).
export function ymd(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
export function addDays(d, n) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}
export function parseYmd(s) {
  const [y, m, d] = String(s).split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}
// Database timestamps look like "2026-10-29 14:05:00" (UTC).
export function parseDbTime(s) {
  if (!s) return null;
  const d = new Date(String(s).replace(" ", "T") + (String(s).includes("Z") ? "" : "Z"));
  return Number.isNaN(d.getTime()) ? null : d;
}
export function daysSince(s) {
  const d = parseDbTime(s);
  if (!d) return null;
  return Math.floor((Date.now() - d.getTime()) / 86400000);
}
export function fmtShort(d) {
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}
export function fmtLong(d) {
  return d.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });
}
export function ago(days) {
  if (days == null) return "";
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  return `${days} days ago`;
}

export function initials(name) {
  return (
    String(name || "?")
      .trim()
      .split(/\s+/)
      .map((w) => w[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "?"
  );
}

// How a guest relates to the restaurant, from their recorded visits.
export function relationship(g) {
  const v = g?.visit_count ?? 0;
  if (v === 0) return { key: "new", label: "Not visited yet" };
  if (v === 1) return { key: "first", label: "First visit" };
  if (v === 2) return { key: "returning", label: "Returning" };
  return { key: "regular", label: "Regular" };
}

// Finds the guest a booking belongs to (same email, else same phone).
export function makeGuestMatcher(guests) {
  const byEmail = new Map();
  const byPhone = new Map();
  guests.forEach((g) => {
    if (g.email) byEmail.set(g.email.trim().toLowerCase(), g);
    if (g.phone) byPhone.set(g.phone.trim(), g);
  });
  return (r) =>
    (r.email && byEmail.get(r.email.trim().toLowerCase())) ||
    (r.phone && byPhone.get(r.phone.trim())) ||
    null;
}

// Upcoming birthdays within `withinDays` days, soonest first.
export function upcomingBirthdays(guests, withinDays = 30) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const out = [];
  guests.forEach((g) => {
    if (!g.birthday_day || !g.birthday_month) return;
    let next = new Date(today.getFullYear(), g.birthday_month - 1, g.birthday_day);
    if (next < today) next = new Date(today.getFullYear() + 1, g.birthday_month - 1, g.birthday_day);
    const inDays = Math.round((next - today) / 86400000);
    if (inDays <= withinDays) out.push({ guest: g, date: next, inDays });
  });
  return out.sort((a, b) => a.inDays - b.inDays);
}

export function statusLabel(s) {
  return (
    { pending: "Awaiting confirmation", confirmed: "Confirmed", seated: "Seated", completed: "Completed", cancelled: "Cancelled" }[
      s
    ] || s
  );
}