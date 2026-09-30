import dotenv from 'dotenv'
dotenv.config()

import pg from 'pg'

const { Pool } = pg

// DATABASE_URL comes from your Postgres provider (e.g. Neon). Locally against
// a plain Postgres install, no SSL is needed; hosted providers require it.
const connectionString = process.env.POSTGRES_URL

const pool = new Pool({
  connectionString,
  ssl:
    connectionString && !connectionString.includes('localhost')
      ? { rejectUnauthorized: false }
      : false,
})

// Converts SQLite-style '?' placeholders to Postgres-style '$1, $2, ...'
// placeholders, so the rest of the app can keep writing '?' like before.
function toPgQuery(sql) {
  let i = 0
  return sql.replace(/\?/g, () => `$${++i}`)
}

// A thin compatibility layer so server.js's existing
// db.prepare(sql).get/.all/.run(...) call sites keep working, just async now.
function prepare(sql) {
  const pgSql = toPgQuery(sql)
  return {
    async get(...params) {
      const result = await pool.query(pgSql, params)
      return result.rows[0]
    },
    async all(...params) {
      const result = await pool.query(pgSql, params)
      return result.rows
    },
    async run(...params) {
      const result = await pool.query(pgSql, params)
      return {
        // Only populated for INSERT queries that end in "RETURNING id".
        lastInsertRowid: result.rows[0]?.id,
        changes: result.rowCount,
      }
    },
  }
}

// Safely add a column only if it doesn't already exist —
// prevents errors on every server restart.
async function addColumnIfMissing(table, column, type) {
  try {
    await pool.query(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`)
  } catch (err) {
    // Column already exists — safe to ignore
  }
}

// Matches the "YYYY-MM-DD HH:MM:SS" string format the app previously got
// from SQLite's datetime('now'), so existing .slice(0, 10) calls etc. keep working.
const NOW_UTC = `to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD HH24:MI:SS')`

async function setup() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS members (
      id SERIAL PRIMARY KEY,
      restaurant_name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      phone TEXT,
      password_hash TEXT NOT NULL,
      is_paid INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT ${NOW_UTC}
    )
  `)

  await addColumnIfMissing('members', 'smtp_host', 'TEXT')
  await addColumnIfMissing('members', 'smtp_port', 'TEXT')
  await addColumnIfMissing('members', 'smtp_user', 'TEXT')
  await addColumnIfMissing('members', 'smtp_pass', 'TEXT')
  await addColumnIfMissing('members', 'google_review_url', 'TEXT')
  await addColumnIfMissing('members', 'slug', 'TEXT')
  await addColumnIfMissing('members', 'payment_status', "TEXT NOT NULL DEFAULT 'unpaid'")

  await pool.query(`
    CREATE TABLE IF NOT EXISTS guests (
      id SERIAL PRIMARY KEY,
      restaurant_id INTEGER NOT NULL REFERENCES members(id),
      name TEXT NOT NULL,
      email TEXT,
      phone TEXT,
      birthday_day INTEGER,
      birthday_month INTEGER,
      membership_number TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT ${NOW_UTC}
    )
  `)

  // Tracks the last year a birthday email was sent to this guest, so the
  // hourly poller never sends two birthday emails in the same year.
  await addColumnIfMissing('guests', 'last_birthday_email_year', 'INTEGER')

  await pool.query(`
    CREATE TABLE IF NOT EXISTS visits (
      id SERIAL PRIMARY KEY,
      guest_id INTEGER NOT NULL REFERENCES guests(id),
      visited_at TEXT NOT NULL DEFAULT ${NOW_UTC}
    )
  `)

  await pool.query(`
    CREATE TABLE IF NOT EXISTS guest_notes (
      id SERIAL PRIMARY KEY,
      guest_id INTEGER NOT NULL REFERENCES guests(id),
      note_text TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT ${NOW_UTC}
    )
  `)

  await pool.query(`
    CREATE TABLE IF NOT EXISTS scheduled_emails (
      id SERIAL PRIMARY KEY,
      guest_id INTEGER NOT NULL REFERENCES guests(id),
      restaurant_id INTEGER NOT NULL REFERENCES members(id),
      send_at TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at TEXT NOT NULL DEFAULT ${NOW_UTC}
    )
  `)

  await pool.query(`
    CREATE TABLE IF NOT EXISTS password_resets (
      id SERIAL PRIMARY KEY,
      member_id INTEGER NOT NULL REFERENCES members(id),
      token TEXT NOT NULL UNIQUE,
      expires_at TEXT NOT NULL,
      used INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT ${NOW_UTC}
    )
  `)

  await pool.query(`
    CREATE TABLE IF NOT EXISTS reservations (
      id SERIAL PRIMARY KEY,
      restaurant_id INTEGER NOT NULL REFERENCES members(id),
      name TEXT NOT NULL,
      email TEXT,
      phone TEXT NOT NULL,
      party_size INTEGER NOT NULL,
      reservation_date TEXT NOT NULL,
      reservation_time TEXT NOT NULL,
      notes TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at TEXT NOT NULL DEFAULT ${NOW_UTC}
    )
  `)
}

// Runs once, when the module is first imported — server.js can rely on the
// schema already being in place by the time its routes start handling requests.
await setup()

const db = { prepare, pool }

export default db