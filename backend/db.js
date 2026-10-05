import dotenv from 'dotenv'
dotenv.config()

import crypto from 'crypto'
import pg from 'pg'

const { Pool } = pg

// POSTGRES_URL comes from your Postgres provider (Vercel Postgres / Neon).
// Locally against a plain Postgres install, no SSL is needed; hosted
// providers require it.
const connectionString = process.env.POSTGRES_URL

const pool = new Pool({
  connectionString,
  ssl:
    connectionString && !connectionString.includes('localhost')
      ? { rejectUnauthorized: false }
      : false,
})

// ---------------------------------------------------------------------------
// Query helpers
// ---------------------------------------------------------------------------

// Converts SQLite-style '?' placeholders to Postgres-style '$1, $2, ...'
// placeholders, so the rest of the app can keep writing '?'.
function toPgQuery(sql) {
  let i = 0
  return sql.replace(/\?/g, () => `$${++i}`)
}

// Gives server.js its familiar db.prepare(sql).get/.all/.run(...) shape on top
// of any "run this query" function (the shared pool, or one open transaction).
function makeStatement(exec, sql) {
  const pgSql = toPgQuery(sql)
  return {
    async get(...params) {
      const result = await exec(pgSql, params)
      return result.rows[0]
    },
    async all(...params) {
      const result = await exec(pgSql, params)
      return result.rows
    },
    async run(...params) {
      const result = await exec(pgSql, params)
      return {
        // Only populated for INSERT queries that end in "RETURNING id".
        lastInsertRowid: result.rows[0]?.id,
        changes: result.rowCount,
      }
    },
  }
}

// Central queries (restaurant accounts, password resets) run as the main app user.
const prepare = (sql) => makeStatement((s, p) => pool.query(s, p), sql)

// Names that end up inside SQL (schema + role names) can't be passed as
// parameters, so they're strictly validated and quoted instead.
const IDENT = /^[a-z0-9_]{1,63}$/
function quoteIdent(name) {
  if (!IDENT.test(name)) throw new Error(`Unsafe database identifier: ${name}`)
  return `"${name}"`
}

// Matches the "YYYY-MM-DD HH:MM:SS" string format the app has always stored,
// so existing .slice(0, 10) calls etc. keep working.
const NOW_UTC = `to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD HH24:MI:SS')`

// Safely add a column only if it doesn't already exist —
// prevents errors on every server restart.
async function addColumnIfMissing(table, column, type) {
  try {
    await pool.query(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`)
  } catch (err) {
    // Column already exists — safe to ignore
  }
}

// ---------------------------------------------------------------------------
// Central tables (live in the main "public" area — dynR's own records)
// ---------------------------------------------------------------------------

async function setupCentral() {
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
  await addColumnIfMissing('members', 'welcome_email_sent', 'INTEGER NOT NULL DEFAULT 0')
  // When the restaurant last changed its own dashboard password (empty = no change recorded).
  await addColumnIfMissing('members', 'password_changed_at', 'TEXT')
  // Which folder (schema) and database login (role) belong to this restaurant.
  await addColumnIfMissing('members', 'schema_name', 'TEXT')
  await addColumnIfMissing('members', 'db_role', 'TEXT')

  await pool.query(
    'CREATE UNIQUE INDEX IF NOT EXISTS members_schema_name_key ON members (schema_name)'
  )

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
}

// ---------------------------------------------------------------------------
// Restaurant folders: one schema + one database login per restaurant
// ---------------------------------------------------------------------------

// The tables every restaurant folder contains. No restaurant_id column is
// needed — everything in a folder belongs to that one restaurant.
function folderTablesDdl(schema) {
  return [
    `CREATE TABLE IF NOT EXISTS ${schema}.guests (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT,
      phone TEXT,
      birthday_day INTEGER,
      birthday_month INTEGER,
      membership_number TEXT NOT NULL,
      last_birthday_email_year INTEGER,
      created_at TEXT NOT NULL DEFAULT ${NOW_UTC}
    )`,
    `CREATE TABLE IF NOT EXISTS ${schema}.visits (
      id SERIAL PRIMARY KEY,
      guest_id INTEGER NOT NULL REFERENCES ${schema}.guests(id),
      visited_at TEXT NOT NULL DEFAULT ${NOW_UTC}
    )`,
    `CREATE TABLE IF NOT EXISTS ${schema}.guest_notes (
      id SERIAL PRIMARY KEY,
      guest_id INTEGER NOT NULL REFERENCES ${schema}.guests(id),
      note_text TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT ${NOW_UTC}
    )`,
    `CREATE TABLE IF NOT EXISTS ${schema}.scheduled_emails (
      id SERIAL PRIMARY KEY,
      guest_id INTEGER NOT NULL REFERENCES ${schema}.guests(id),
      send_at TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at TEXT NOT NULL DEFAULT ${NOW_UTC}
    )`,
    `CREATE TABLE IF NOT EXISTS ${schema}.reservations (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT,
      phone TEXT NOT NULL,
      party_size INTEGER NOT NULL,
      reservation_date TEXT NOT NULL,
      reservation_time TEXT NOT NULL,
      notes TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at TEXT NOT NULL DEFAULT ${NOW_UTC}
    )`,
  ]
}

const FOLDER_TABLES = ['guests', 'visits', 'guest_notes', 'scheduled_emails', 'reservations']

function randomPassword() {
  return crypto.randomBytes(18).toString('base64url')
}

function newFolderNames(member) {
  const slugPart =
    String(member.slug || 'restaurant')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 30) || 'restaurant'

  return {
    // Restaurant name + id, so two restaurants with the same name never clash.
    schema: `r_${member.id}_${slugPart}`,
    // Database logins are shared across every database on the same Postgres
    // server, so a short random suffix keeps this one unique.
    role: `dynr_r${member.id}_${crypto.randomBytes(3).toString('hex')}`,
  }
}

// Runs a statement that is allowed to fail without aborting the whole transaction.
async function tryQuery(client, sql) {
  await client.query('SAVEPOINT try_query')
  try {
    await client.query(sql)
    await client.query('RELEASE SAVEPOINT try_query')
    return true
  } catch (err) {
    await client.query('ROLLBACK TO SAVEPOINT try_query')
    return false
  }
}

async function tableExists(client, tableName) {
  const { rows } = await client.query('SELECT to_regclass($1::text) IS NOT NULL AS ok', [
    `public.${tableName}`,
  ])
  return rows[0].ok
}

async function legacyColumns(client, tableName) {
  const { rows } = await client.query(
    `SELECT column_name FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = $1`,
    [tableName]
  )
  return new Set(rows.map((r) => r.column_name))
}

// One-time move of a restaurant's existing rows out of the old shared tables
// (guests/visits/... in "public") into its own folder. IDs are preserved so
// everything keeps pointing at the right guest. The old tables are left
// untouched as a safety net.
async function copyLegacyRows(client, memberId, schemaName) {
  const s = quoteIdent(schemaName)

  const guestCols = await legacyColumns(client, 'guests')
  if (guestCols.size > 0 && guestCols.has('restaurant_id')) {
    const yearCol = guestCols.has('last_birthday_email_year') ? 'last_birthday_email_year,' : ''
    await client.query(
      `INSERT INTO ${s}.guests
         (id, name, email, phone, birthday_day, birthday_month, membership_number, ${yearCol} created_at)
       SELECT id, name, email, phone, birthday_day, birthday_month, membership_number, ${yearCol} created_at
       FROM public.guests WHERE restaurant_id = $1 ORDER BY id`,
      [memberId]
    )

    if (await tableExists(client, 'visits')) {
      await client.query(
        `INSERT INTO ${s}.visits (id, guest_id, visited_at)
         SELECT v.id, v.guest_id, v.visited_at
         FROM public.visits v JOIN public.guests g ON g.id = v.guest_id
         WHERE g.restaurant_id = $1 ORDER BY v.id`,
        [memberId]
      )
    }

    if (await tableExists(client, 'guest_notes')) {
      await client.query(
        `INSERT INTO ${s}.guest_notes (id, guest_id, note_text, created_at)
         SELECT n.id, n.guest_id, n.note_text, n.created_at
         FROM public.guest_notes n JOIN public.guests g ON g.id = n.guest_id
         WHERE g.restaurant_id = $1 ORDER BY n.id`,
        [memberId]
      )
    }
  }

  if (await tableExists(client, 'scheduled_emails')) {
    await client.query(
      `INSERT INTO ${s}.scheduled_emails (id, guest_id, send_at, status, created_at)
       SELECT id, guest_id, send_at, status, created_at
       FROM public.scheduled_emails WHERE restaurant_id = $1 ORDER BY id`,
      [memberId]
    )
  }

  if (await tableExists(client, 'reservations')) {
    await client.query(
      `INSERT INTO ${s}.reservations
         (id, name, email, phone, party_size, reservation_date, reservation_time, notes, status, created_at)
       SELECT id, name, email, phone, party_size, reservation_date, reservation_time, notes, status, created_at
       FROM public.reservations WHERE restaurant_id = $1 ORDER BY id`,
      [memberId]
    )
  }

  // Copied rows kept their old ids, so move each counter past the highest one.
  for (const table of FOLDER_TABLES) {
    await client.query(
      `SELECT setval(
         pg_get_serial_sequence($1::text, 'id'),
         COALESCE((SELECT MAX(id) FROM ${s}.${table}), 1),
         (SELECT MAX(id) FROM ${s}.${table}) IS NOT NULL
       )`,
      [`${s}.${table}`]
    )
  }
}

// Makes sure a restaurant has its folder, its database login, its tables and
// the right permissions. Safe to run again and again — it only creates what is
// missing, and re-applies permissions so tables added in the future are covered.
// Must be called inside an open transaction (on `client`).
async function provisionFolder(client, member, { copyLegacy = false } = {}) {
  const firstTime = !member.schema_name || !member.db_role
  const names = firstTime
    ? newFolderNames(member)
    : { schema: member.schema_name, role: member.db_role }
  const schema = quoteIdent(names.schema)
  const role = quoteIdent(names.role)

  // 1. The restaurant's own database login (created once, with a random password).
  let password = null
  const roleExists =
    (await client.query('SELECT 1 FROM pg_roles WHERE rolname = $1', [names.role])).rowCount > 0

  if (!roleExists) {
    password = randomPassword()
    const { rows } = await client.query(
      `SELECT format('CREATE ROLE %I LOGIN PASSWORD %L NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT',
                     $1::text, $2::text) AS sql`,
      [names.role, password]
    )
    await client.query(rows[0].sql)
  }

  // The app connects as one main user, and "steps into" a restaurant's login
  // for the duration of each request. That needs permission to switch to it.
  const { rows: ver } = await client.query('SHOW server_version_num')
  await tryQuery(
    client,
    Number(ver[0].server_version_num) >= 160000
      ? `GRANT ${role} TO CURRENT_USER WITH INHERIT FALSE, SET TRUE`
      : `GRANT ${role} TO CURRENT_USER`
  )

  // 2. The folder and its tables.
  await client.query(`CREATE SCHEMA IF NOT EXISTS ${schema}`)
  for (const ddl of folderTablesDdl(schema)) {
    await client.query(ddl)
  }

  // 3. The login may use ONLY this folder (it gets no access to anything else).
  await client.query(`GRANT USAGE ON SCHEMA ${schema} TO ${role}`)
  await client.query(`GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA ${schema} TO ${role}`)
  await client.query(`GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA ${schema} TO ${role}`)

  // 4. First time only: bring over any data from the old shared tables, then
  //    record the folder on the restaurant's account.
  if (firstTime) {
    if (copyLegacy) await copyLegacyRows(client, member.id, names.schema)
    await client.query('UPDATE members SET schema_name = $1, db_role = $2 WHERE id = $3', [
      names.schema,
      names.role,
      member.id,
    ])
  }

  return { schema: names.schema, role: names.role, password, created: firstTime }
}

// Runs at startup: every restaurant gets a folder (existing restaurants are
// moved into theirs automatically, once), and existing folders are brought up
// to date with the current table layout.
async function provisionAllRestaurants() {
  const { rows } = await pool.query('SELECT id FROM members ORDER BY id')

  for (const { id } of rows) {
    const client = await pool.connect()
    try {
      await client.query('BEGIN')
      const { rows: found } = await client.query('SELECT * FROM members WHERE id = $1 FOR UPDATE', [id])
      const folder = await provisionFolder(client, found[0], { copyLegacy: true })
      await client.query('COMMIT')
      if (folder.created) {
        console.log(`Created folder ${folder.schema} for restaurant #${id} (existing data moved in).`)
      }
    } catch (err) {
      try {
        await client.query('ROLLBACK')
      } catch (rollbackErr) {
        // connection already gone
      }
      console.error(`Could not set up the folder for restaurant #${id}:`, err)
    } finally {
      client.release()
    }
  }
}

// Creates the restaurant's account AND its folder in a single step — either
// both exist afterwards, or neither does.
async function registerRestaurant({ restaurantName, email, phone, passwordHash, slug }) {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const { rows } = await client.query(
      `INSERT INTO members (restaurant_name, email, phone, password_hash, is_paid, slug)
       VALUES ($1, $2, $3, $4, 1, $5) RETURNING *`,
      [restaurantName, email, phone, passwordHash, slug]
    )
    const folder = await provisionFolder(client, rows[0])
    await client.query('COMMIT')
    return { id: rows[0].id, folder }
  } catch (err) {
    try {
      await client.query('ROLLBACK')
    } catch (rollbackErr) {
      // connection already gone
    }
    throw err
  } finally {
    client.release()
  }
}

// ---------------------------------------------------------------------------
// Working inside one restaurant's folder
// ---------------------------------------------------------------------------

// Runs `fn` inside a single transaction in which the database itself has been
// told to act as this restaurant's login, looking only at its folder. Anything
// outside that folder (other restaurants, the accounts table) is refused by
// Postgres, regardless of what the app code asks for.
async function withFolder(member, fn) {
  if (!member?.schema_name || !member?.db_role) {
    throw new Error('This restaurant does not have a folder yet.')
  }

  const client = await pool.connect()
  try {
    await client.query(
      `BEGIN; SET LOCAL ROLE ${quoteIdent(member.db_role)}; SET LOCAL search_path = ${quoteIdent(member.schema_name)};`
    )
    const folderDb = { prepare: (sql) => makeStatement((s, p) => client.query(s, p), sql) }
    const result = await fn(folderDb)
    await client.query('COMMIT')
    return result
  } catch (err) {
    try {
      await client.query('ROLLBACK')
    } catch (rollbackErr) {
      // connection already gone
    }
    throw err
  } finally {
    client.release()
  }
}

// tenant(member).prepare(sql).get/all/run(...) — each call is its own
// transaction; tenant(member).transaction(fn) groups several queries together.
function tenant(member) {
  return {
    transaction: (fn) => withFolder(member, fn),
    prepare(sql) {
      return {
        get: (...params) => withFolder(member, (t) => t.prepare(sql).get(...params)),
        all: (...params) => withFolder(member, (t) => t.prepare(sql).all(...params)),
        run: (...params) => withFolder(member, (t) => t.prepare(sql).run(...params)),
      }
    },
  }
}

// A restaurant's folder name never changes, so it is safe to remember it.
const folderCache = new Map()

async function tenantByMemberId(memberId) {
  let member = folderCache.get(memberId)
  if (!member) {
    member = await prepare('SELECT id, schema_name, db_role FROM members WHERE id = ?').get(memberId)
    if (!member || !member.schema_name || !member.db_role) return null
    folderCache.set(memberId, member)
  }
  return tenant(member)
}

function folderInfo(member) {
  let host = null
  let database = null
  try {
    const url = new URL(connectionString)
    host = url.hostname
    database = url.pathname.replace(/^\//, '')
  } catch (err) {
    // connection string isn't a URL — leave host/database empty
  }
  return { host, database, schema: member.schema_name, role: member.db_role }
}

// Gives a restaurant's folder login a brand-new password and returns it.
// (Postgres only stores a scrambled version, so an old password can't be looked up.)
async function resetFolderPassword(memberId) {
  const member = await prepare('SELECT id, schema_name, db_role FROM members WHERE id = ?').get(memberId)
  if (!member || !member.db_role) return null

  const password = randomPassword()
  const { rows } = await pool.query(`SELECT format('ALTER ROLE %I PASSWORD %L', $1::text, $2::text) AS sql`, [
    member.db_role,
    password,
  ])
  await pool.query(rows[0].sql)

  return { ...folderInfo(member), password }
}

// Runs once, when the module is first imported — server.js can rely on the
// schema already being in place by the time its routes start handling requests.
await setupCentral()
await provisionAllRestaurants()

const db = { prepare, pool }

export default db
export { tenant, tenantByMemberId, registerRestaurant, resetFolderPassword, folderInfo }