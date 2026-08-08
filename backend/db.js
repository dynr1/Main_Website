import dotenv from 'dotenv'
dotenv.config()

import pg from 'pg'

const { Pool } = pg

if (!process.env.POSTGRES_URL) {
  throw new Error('POSTGRES_URL is not set. Add it to your .env (see .env.example).')
}

const pool = new Pool({
  connectionString: process.env.POSTGRES_URL,
  ssl: { rejectUnauthorized: false },
})

pool.on('error', (err) => {
  console.error('Unexpected Postgres pool error:', err)
})

// Converts a SQLite-style '?' placeholder query into Postgres '$1, $2, ...'
// style, so the rest of the codebase didn't need every query rewritten.
function toPgQuery(sql) {
  let i = 0
  return sql.replace(/\?/g, () => `$${++i}`)
}

// Thin compatibility layer mimicking the synchronous better-sqlite3-style
// API (`db.prepare(sql).get(...)`, `.all(...)`, `.run(...)`) that the rest
// of the app already uses — but async, since Postgres queries are async.
// Every call site elsewhere in the codebase now needs `await` in front of
// these, since they return Promises instead of values directly.
const db = {
  prepare(sql) {
    const pgSql = toPgQuery(sql)

    return {
      async get(...params) {
        const result = await pool.query(pgSql, params)
        return result.rows[0] || undefined
      },
      async all(...params) {
        const result = await pool.query(pgSql, params)
        return result.rows
      },
      async run(...params) {
        // Emulate better-sqlite3's `lastInsertRowid` for INSERTs by
        // appending RETURNING id, unless the caller already specified one.
        const isInsert = /^\s*INSERT/i.test(pgSql)
        const alreadyReturning = /RETURNING/i.test(pgSql)
        const finalSql = isInsert && !alreadyReturning ? `${pgSql} RETURNING id` : pgSql

        const result = await pool.query(finalSql, params)
        return {
          lastInsertRowid: result.rows[0]?.id,
          changes: result.rowCount,
        }
      },
    }
  },
}

// Runs a series of CREATE TABLE / ALTER TABLE statements directly (no
// placeholders needed here, so it bypasses the .prepare() shim above).
async function exec(sql) {
  await pool.query(sql)
}

async function addColumnIfMissing(table, column, type) {
  try {
    await exec(`ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS ${column} ${type}`)
  } catch (err) {
    console.error(`Failed to ensure column ${table}.${column}:`, err)
  }
}

// Creates all tables if they don't exist yet, and adds any columns that
// were added over time. Call this once at startup and await it before the
// server starts accepting requests.
async function initDb() {
  await exec(`
    CREATE TABLE IF NOT EXISTS members (
      id SERIAL PRIMARY KEY,
      restaurant_name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      phone TEXT,
      password_hash TEXT NOT NULL,
      is_paid INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT to_char(now() AT TIME ZONE 'utc', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
    )
  `)

  await addColumnIfMissing('members', 'smtp_host', 'TEXT')
  await addColumnIfMissing('members', 'smtp_port', 'TEXT')
  await addColumnIfMissing('members', 'smtp_user', 'TEXT')
  await addColumnIfMissing('members', 'smtp_pass', 'TEXT')
  await addColumnIfMissing('members', 'google_review_url', 'TEXT')
  await addColumnIfMissing('members', 'slug', 'TEXT')
  await addColumnIfMissing('members', 'payment_status', "TEXT NOT NULL DEFAULT 'unpaid'")
  await addColumnIfMissing('members', 'stripe_customer_id', 'TEXT')
  await addColumnIfMissing('members', 'stripe_subscription_id', 'TEXT')
  await addColumnIfMissing('members', 'welcome_email_text', 'TEXT')
  await addColumnIfMissing('members', 'followup_email_text', 'TEXT')
  await addColumnIfMissing('members', 'pending_password', 'TEXT')

  await exec(`
    CREATE TABLE IF NOT EXISTS guests (
      id SERIAL PRIMARY KEY,
      restaurant_id INTEGER NOT NULL REFERENCES members(id),
      name TEXT NOT NULL,
      email TEXT,
      phone TEXT,
      birthday_day INTEGER,
      birthday_month INTEGER,
      membership_number TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT to_char(now() AT TIME ZONE 'utc', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
    )
  `)

  await exec(`
    CREATE TABLE IF NOT EXISTS visits (
      id SERIAL PRIMARY KEY,
      guest_id INTEGER NOT NULL REFERENCES guests(id),
      visited_at TEXT NOT NULL DEFAULT to_char(now() AT TIME ZONE 'utc', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
    )
  `)

  await exec(`
    CREATE TABLE IF NOT EXISTS guest_notes (
      id SERIAL PRIMARY KEY,
      guest_id INTEGER NOT NULL REFERENCES guests(id),
      note_text TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT to_char(now() AT TIME ZONE 'utc', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
    )
  `)

  await exec(`
    CREATE TABLE IF NOT EXISTS scheduled_emails (
      id SERIAL PRIMARY KEY,
      guest_id INTEGER NOT NULL REFERENCES guests(id),
      restaurant_id INTEGER NOT NULL REFERENCES members(id),
      send_at TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at TEXT NOT NULL DEFAULT to_char(now() AT TIME ZONE 'utc', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
    )
  `)

  await exec(`
    CREATE TABLE IF NOT EXISTS password_resets (
      id SERIAL PRIMARY KEY,
      member_id INTEGER NOT NULL REFERENCES members(id),
      token TEXT NOT NULL UNIQUE,
      expires_at TEXT NOT NULL,
      used INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT to_char(now() AT TIME ZONE 'utc', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
    )
  `)
}

export default db
export { initDb }