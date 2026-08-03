import { DatabaseSync } from 'node:sqlite'
import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const dataDir = path.join(__dirname, 'data')

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir)
}

const db = new DatabaseSync(path.join(dataDir, 'members.db'))

db.exec(`
  CREATE TABLE IF NOT EXISTS members (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    restaurant_name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    phone TEXT,
    password_hash TEXT NOT NULL,
    is_paid INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )
`)

// Safely add a column only if it doesn't already exist —
// prevents "duplicate column" errors on every server restart.
function addColumnIfMissing(table, column, type) {
  try {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`)
  } catch (err) {
    // Column already exists — safe to ignore
  }
}

addColumnIfMissing('members', 'smtp_host', 'TEXT')
addColumnIfMissing('members', 'smtp_port', 'TEXT')
addColumnIfMissing('members', 'smtp_user', 'TEXT')
addColumnIfMissing('members', 'smtp_pass', 'TEXT')
addColumnIfMissing('members', 'google_review_url', 'TEXT')
addColumnIfMissing('members', 'slug', 'TEXT')
addColumnIfMissing('members', 'payment_status', "TEXT NOT NULL DEFAULT 'unpaid'")
addColumnIfMissing('members', 'stripe_customer_id', 'TEXT')
addColumnIfMissing('members', 'stripe_subscription_id', 'TEXT')
addColumnIfMissing('members', 'welcome_email_text', 'TEXT')
addColumnIfMissing('members', 'followup_email_text', 'TEXT')

db.exec(`
  CREATE TABLE IF NOT EXISTS guests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    restaurant_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    birthday_day INTEGER,
    birthday_month INTEGER,
    membership_number TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (restaurant_id) REFERENCES members(id)
  )
`)

db.exec(`
  CREATE TABLE IF NOT EXISTS visits (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guest_id INTEGER NOT NULL,
    visited_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (guest_id) REFERENCES guests(id)
  )
`)

db.exec(`
  CREATE TABLE IF NOT EXISTS guest_notes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guest_id INTEGER NOT NULL,
    note_text TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (guest_id) REFERENCES guests(id)
  )
`)

db.exec(`
  CREATE TABLE IF NOT EXISTS scheduled_emails (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guest_id INTEGER NOT NULL,
    restaurant_id INTEGER NOT NULL,
    send_at TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (guest_id) REFERENCES guests(id),
    FOREIGN KEY (restaurant_id) REFERENCES members(id)
  )
`)

db.exec(`
  CREATE TABLE IF NOT EXISTS password_resets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    member_id INTEGER NOT NULL,
    token TEXT NOT NULL UNIQUE,
    expires_at TEXT NOT NULL,
    used INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (member_id) REFERENCES members(id)
  )
`)

export default db