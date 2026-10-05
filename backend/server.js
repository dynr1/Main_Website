import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import rateLimit from 'express-rate-limit'
import nodemailer from 'nodemailer'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import crypto from 'crypto'
import db, {
  tenant,
  tenantByMemberId,
  registerRestaurant,
  resetFolderPassword,
  folderInfo,
} from './db.js'

dotenv.config()

// Safety net: log and keep running instead of the whole server dying on an
// unexpected error somewhere. This is what let /api/register and
// /api/guests/message go down when an unrelated part of the app crashed.
process.on('unhandledRejection', (err) => {
  console.error('Unhandled promise rejection (server kept running):', err)
})
process.on('uncaughtException', (err) => {
  console.error('Uncaught exception (server kept running):', err)
})

const app = express()
const PORT = process.env.PORT || 4000

app.use(cors())
app.use(express.json())

// Basic abuse protection: 5 submissions per IP per 15 minutes
const contactLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please try again later.' },
})

// Mail transport — configure via .env (see .env.example)
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT) || 587,
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
})

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

function slugify(text) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

function generateMembershipNumber(restaurantName, count) {
  // First letter or digit of each word. (Taking the raw first character broke
  // on names containing emoji, which are stored as two halves.)
  const initials = restaurantName
    .split(' ')
    .map((w) => Array.from(w).find((ch) => /[\p{L}\p{N}]/u.test(ch)) || '')
    .join('')
    .toUpperCase()
    .slice(0, 3)
  return `${initials || 'MEM'}-${String(count).padStart(5, '0')}`
}

// Escapes values before they're interpolated into an HTML email body.
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

// A small "click here to leave a review" button used in guest-facing emails,
// instead of ever showing the raw Google review URL.
function reviewButtonHtml(googleReviewUrl) {
  if (!googleReviewUrl) return ''
  return `
    <p style="text-align: center; margin: 28px 0;">
      <a href="${escapeHtml(googleReviewUrl)}" style="background: #e2672a; color: #ffffff; text-decoration: none; font-weight: bold; padding: 12px 24px; border-radius: 8px; display: inline-block; font-family: Arial, sans-serif; font-size: 15px;">
        Click here to leave a review
      </a>
    </p>
  `
}

function reviewLineText(googleReviewUrl, lead) {
  return googleReviewUrl ? `\n\n${lead} ${googleReviewUrl}` : ''
}

app.post('/api/contact', contactLimiter, async (req, res) => {
  const { name, email, restaurant, message } = req.body || {}

  if (!name || !email) {
    return res.status(400).json({ error: 'Name and email are required.' })
  }

  if (!isValidEmail(email)) {
    return res.status(400).json({ error: 'Please enter a valid email address.' })
  }

  const mailBody = `
New contact request from dynr.co.uk

Name: ${name}
Email: ${email}
Restaurant: ${restaurant || '—'}

Message:
${message || '—'}
`.trim()

  try {
    await transporter.sendMail({
      from: process.env.MAIL_FROM || '"dynR Website" <no-reply@dynr.co.uk>',
      to: process.env.MAIL_TO || 'hello@dynr.co.uk',
      replyTo: email,
      subject: `New 15-min chat request — ${name}${restaurant ? ` (${restaurant})` : ''}`,
      text: mailBody,
    })

    return res.status(200).json({ ok: true })
  } catch (err) {
    console.error('Failed to send contact email:', err)
    return res.status(500).json({ error: 'Failed to send your message. Please try again shortly.' })
  }
})

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' })
})

// ---------- Admin auth middleware ----------
function requireAdmin(req, res, next) {
  const authHeader = req.headers.authorization || ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null

  if (!token) {
    return res.status(401).json({ error: 'Not authenticated.' })
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET)
    if (payload.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized.' })
    }
    next()
  } catch (err) {
    return res.status(401).json({ error: 'Session expired. Please sign in again.' })
  }
}

// ---------- Restaurant auth middleware ----------
// Besides checking the login, this attaches req.tenant: a handle to THIS
// restaurant's own folder in the database. Every guest / visit / note /
// reservation query goes through it, so a restaurant can only ever reach its own data.
async function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization || ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null

  if (!token) {
    return res.status(401).json({ error: 'Not authenticated.' })
  }

  let payload
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET)
  } catch (err) {
    return res.status(401).json({ error: 'Session expired. Please sign in again.' })
  }

  try {
    const folder = await tenantByMemberId(payload.memberId)
    if (!folder) {
      return res.status(401).json({ error: 'Account not available. Please sign in again.' })
    }
    req.memberId = payload.memberId
    req.tenant = folder
    next()
  } catch (err) {
    console.error('Failed to load restaurant folder:', err)
    return res.status(500).json({ error: 'Something went wrong. Please try again.' })
  }
}

// ---------- Admin: Login ----------
app.post('/api/admin/login', (req, res) => {
  const { email, password } = req.body || {}

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' })
  }

  if (email !== process.env.ADMIN_EMAIL || password !== process.env.ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Invalid email or password.' })
  }

  const adminToken = jwt.sign({ role: 'admin' }, process.env.JWT_SECRET, {
    expiresIn: '12h',
  })

  return res.json({ adminToken })
})

// ---------- Membership: Register a restaurant (admin only) ----------
app.post('/api/register', requireAdmin, async (req, res) => {
  const { restaurantName, email, phone, password } = req.body || {}

  if (!restaurantName || !email || !password) {
    return res.status(400).json({ error: 'Restaurant name, email, and password are required.' })
  }

  if (!isValidEmail(email)) {
    return res.status(400).json({ error: 'Please enter a valid email address.' })
  }

  if (password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters.' })
  }

  const existing = await db.prepare('SELECT id FROM members WHERE email = ?').get(email)
  if (existing) {
    return res.status(409).json({ error: 'An account with this email already exists.' })
  }

  try {
    const passwordHash = await bcrypt.hash(password, 10)
    const slug = slugify(restaurantName)

    // Creates the account AND the restaurant's own folder + database login together.
    const { id: restaurantId, folder } = await registerRestaurant({
      restaurantName,
      email,
      phone: phone || null,
      passwordHash,
      slug,
    })

    // Email the restaurant their dashboard login details
    try {
      await transporter.sendMail({
        from: process.env.MAIL_FROM || '"dynR" <no-reply@dynr.co.uk>',
        to: email,
        bcc: 'abdul@dynr.co.uk',
        subject: 'Your dynR dashboard is ready',
        text: `Hi ${restaurantName},

Your dynR account has been created. Here are your dashboard login details:

Login page: ${process.env.APP_URL || 'https://dynr.co.uk'}/login
Email: ${email}
Password: ${password}

We'd recommend changing your password after your first login.

Welcome aboard,
The dynR team`,
      })

      await db.prepare('UPDATE members SET welcome_email_sent = 1 WHERE id = ?').run(restaurantId)
    } catch (mailErr) {
      // Don't fail the whole registration if the email fails to send —
      // the account is already created, just log it so you notice.
      // welcome_email_sent stays 0, which is what the admin list shows.
      console.error('Failed to send welcome email to restaurant:', mailErr)
    }

    // The folder's database password is shown to the admin exactly once (it is
    // not stored anywhere readable — use "reset" to get a new one).
    return res.status(201).json({
      ok: true,
      restaurantId,
      database: {
        ...folderInfo({ schema_name: folder.schema, db_role: folder.role }),
        password: folder.password,
      },
    })
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'An account with this email already exists.' })
    }
    console.error('Registration failed:', err)
    return res.status(500).json({ error: 'Registration failed. Please try again.' })
  }
})

// ---------- Admin: List all registered restaurants ----------
// This reads directly from `members` every time, so it always reflects the
// live state — including payment_status, which only this endpoint (and the
// one below it) can change. A restaurant editing their own email/password
// via /api/login-protected routes never touches payment_status.
app.get('/api/admin/restaurants', requireAdmin, async (req, res) => {
  const restaurants = await db
    .prepare(
      `SELECT id, restaurant_name, email, phone, payment_status, welcome_email_sent,
              password_changed_at, schema_name, db_role, created_at
       FROM members
       ORDER BY created_at DESC, id DESC`
    )
    .all()

  return res.json({ restaurants })
})

// ---------- Admin: Set a restaurant's payment status ----------
app.put('/api/admin/restaurants/:id/payment', requireAdmin, async (req, res) => {
  const { paymentStatus } = req.body || {}

  if (!['paid', 'unpaid'].includes(paymentStatus)) {
    return res.status(400).json({ error: "paymentStatus must be 'paid' or 'unpaid'." })
  }

  const existing = await db.prepare('SELECT id FROM members WHERE id = ?').get(req.params.id)
  if (!existing) {
    return res.status(404).json({ error: 'Restaurant not found.' })
  }

  await db.prepare('UPDATE members SET payment_status = ? WHERE id = ?').run(paymentStatus, req.params.id)

  return res.json({ ok: true })
})

// ---------- Admin: Open a restaurant's dashboard as that restaurant ----------
// Lets dynR step into any restaurant's dashboard without knowing its password.
// The token is short-lived (1 hour) and marked as issued by an admin.
app.post('/api/admin/restaurants/:id/open-dashboard', requireAdmin, async (req, res) => {
  const memberId = Number(req.params.id)

  const member = await db
    .prepare('SELECT id, restaurant_name FROM members WHERE id = ?')
    .get(memberId)
  if (!member) {
    return res.status(404).json({ error: 'Restaurant not found.' })
  }

  const token = jwt.sign({ memberId: member.id, viewAs: 'admin' }, process.env.JWT_SECRET, {
    expiresIn: '1h',
  })

  console.log(`Admin opened the dashboard for restaurant #${member.id} (${member.restaurant_name}).`)

  return res.json({ ok: true, token })
})

// ---------- Admin: Give a restaurant's folder login a new password ----------
app.post('/api/admin/restaurants/:id/database-password', requireAdmin, async (req, res) => {
  try {
    const database = await resetFolderPassword(Number(req.params.id))
    if (!database) {
      return res.status(404).json({ error: 'Restaurant folder not found.' })
    }
    return res.json({ ok: true, database })
  } catch (err) {
    console.error('Failed to reset folder password:', err)
    return res.status(500).json({ error: 'Failed to reset the password. Please try again.' })
  }
})

// ---------- Membership: Restaurant Sign In ----------
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body || {}

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' })
  }

  const member = await db.prepare('SELECT * FROM members WHERE email = ?').get(email)
  if (!member) {
    return res.status(401).json({ error: 'Invalid email or password.' })
  }

  const valid = await bcrypt.compare(password, member.password_hash)
  if (!valid) {
    return res.status(401).json({ error: 'Invalid email or password.' })
  }

  const token = jwt.sign({ memberId: member.id }, process.env.JWT_SECRET, { expiresIn: '7d' })

  return res.json({ token })
})

// ---------- Membership: Forgot password ----------
// Always responds the same way whether or not the email exists, so this
// endpoint can't be used to check which emails are registered.
app.post('/api/forgot-password', async (req, res) => {
  const { email } = req.body || {}

  if (!email || !isValidEmail(email)) {
    return res.status(400).json({ error: 'Please enter a valid email address.' })
  }

  const genericResponse = {
    ok: true,
    message: 'If an account exists for that email, a reset link has been sent.',
  }

  const member = await db.prepare('SELECT * FROM members WHERE email = ?').get(email)
  if (!member) {
    return res.json(genericResponse)
  }

  const token = crypto.randomBytes(32).toString('hex')
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString() // 1 hour

  await db.prepare(
    'INSERT INTO password_resets (member_id, token, expires_at) VALUES (?, ?, ?)'
  ).run(member.id, token, expiresAt)

  const resetUrl = `${process.env.APP_URL || 'https://dynr.co.uk'}/reset-password?token=${token}`

  try {
    await transporter.sendMail({
      from: process.env.MAIL_FROM || '"dynR" <no-reply@dynr.co.uk>',
      to: email,
      subject: 'Reset your dynR password',
      text: `Hi ${member.restaurant_name},

We received a request to reset your dynR dashboard password. Click the link below to choose a new one — it's valid for 1 hour:

${resetUrl}

If you didn't request this, you can safely ignore this email.

The dynR team`,
    })
  } catch (mailErr) {
    console.error('Failed to send password reset email:', mailErr)
    // Still return the generic success response — don't reveal send failures to the caller.
  }

  return res.json(genericResponse)
})

// ---------- Membership: Reset password with token ----------
app.post('/api/reset-password', async (req, res) => {
  const { token, newPassword } = req.body || {}

  if (!token || !newPassword) {
    return res.status(400).json({ error: 'Token and new password are required.' })
  }

  if (newPassword.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters.' })
  }

  const resetRow = await db.prepare('SELECT * FROM password_resets WHERE token = ?').get(token)

  if (!resetRow || resetRow.used || new Date(resetRow.expires_at) < new Date()) {
    return res.status(400).json({ error: 'This reset link is invalid or has expired. Please request a new one.' })
  }

  const passwordHash = await bcrypt.hash(newPassword, 10)

  await db
    .prepare(
      `UPDATE members
       SET password_hash = ?,
           password_changed_at = to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD HH24:MI:SS')
       WHERE id = ?`
    )
    .run(passwordHash, resetRow.member_id)
  await db.prepare('UPDATE password_resets SET used = 1 WHERE id = ?').run(resetRow.id)

  return res.json({ ok: true })
})

// ---------- Membership: Current member info (for dashboard) ----------
app.get('/api/member/me', requireAuth, async (req, res) => {
  const member = await db
    .prepare('SELECT id, restaurant_name, email, phone, slug, created_at FROM members WHERE id = ?')
    .get(req.memberId)

  if (!member) {
    return res.status(404).json({ error: 'Member not found.' })
  }

  return res.json({ member })
})

// ---------- Public: Get restaurant name by slug (for guest sign-up page) ----------
app.get('/api/public/restaurant/:slug', async (req, res) => {
  const restaurant = await db
    .prepare('SELECT id, restaurant_name, google_review_url FROM members WHERE slug = ?')
    .get(req.params.slug)

  if (!restaurant) {
    return res.status(404).json({ error: 'Restaurant not found.' })
  }

  return res.json({
    id: restaurant.id,
    name: restaurant.restaurant_name,
  })
})

// ---------- Public: Guest sign-up ----------
app.post('/api/public/guests', async (req, res) => {
  const { slug, name, birthdayDay, birthdayMonth, email, phone } = req.body || {}

  if (!slug || !name || !birthdayDay || !birthdayMonth || !email || !phone) {
    return res.status(400).json({ error: 'All fields are required.' })
  }

  if (!isValidEmail(email)) {
    return res.status(400).json({ error: 'Please enter a valid email address.' })
  }

  const restaurant = await db.prepare('SELECT * FROM members WHERE slug = ?').get(slug)
  if (!restaurant) {
    return res.status(404).json({ error: 'Restaurant not found.' })
  }

  try {
    // Count + insert happen together inside this restaurant's own folder.
    const membershipNumber = await tenant(restaurant).transaction(async (t) => {
      const countRow = await t.prepare('SELECT COUNT(*)::int as count FROM guests').get()

      const number = generateMembershipNumber(restaurant.restaurant_name, countRow.count + 1)

      await t
        .prepare(
          `INSERT INTO guests (name, email, phone, birthday_day, birthday_month, membership_number)
           VALUES (?, ?, ?, ?, ?, ?)`
        )
        .run(name, email, phone, birthdayDay, birthdayMonth, number)

      return number
    })

    // Send welcome email using the restaurant's own SMTP if they've set it up.
    // If not configured yet, skip silently — guest is still created either way.
    if (restaurant.smtp_host && restaurant.smtp_user && restaurant.smtp_pass) {
      try {
        const restaurantTransporter = nodemailer.createTransport({
          host: restaurant.smtp_host,
          port: Number(restaurant.smtp_port) || 587,
          secure: false,
          auth: {
            user: restaurant.smtp_user,
            pass: restaurant.smtp_pass,
          },
        })

        const firstName = name.split(' ')[0]

        await restaurantTransporter.sendMail({
          from: restaurant.smtp_user,
          to: email,
          subject: `You're one of ours now, ${firstName}`,
          text: `Welcome to the family, ${firstName}!

Thank you for becoming part of the ${restaurant.restaurant_name} family — we're so glad to have you. Keep an eye on your inbox for exciting member-only offers and news, just for members like you.

Your membership number: ${membershipNumber}${reviewLineText(restaurant.google_review_url, "If you'd like, we'd love a quick review here:")}

Warmly,
The ${restaurant.restaurant_name} team`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; color: #2b2b2b;">
              <h2 style="color: #171717; margin-bottom: 16px;">Welcome to the family, ${escapeHtml(firstName)}!</h2>
              <p>Thank you for becoming part of the <strong>${escapeHtml(restaurant.restaurant_name)}</strong> family — we're so glad to have you. Keep an eye on your inbox for exciting member-only offers and news, just for members like you.</p>
              <p>Your membership number: <strong>${escapeHtml(membershipNumber)}</strong></p>
              ${reviewButtonHtml(restaurant.google_review_url)}
              <p>Warmly,<br/>The ${escapeHtml(restaurant.restaurant_name)} team</p>
            </div>
          `,
        })
      } catch (mailErr) {
        console.error('Failed to send guest welcome email:', mailErr)
      }
    }

    return res.status(201).json({ ok: true, membershipNumber })
  } catch (err) {
    console.error('Guest sign-up failed:', err)
    return res.status(500).json({ error: 'Something went wrong. Please try again.' })
  }
})

// ---------- Public: Table reservation submission ----------
app.post('/api/public/reservations', async (req, res) => {
  const {
    slug,
    name,
    email,
    phone,
    partySize,
    reservationDate,
    reservationTime,
    notes,
  } = req.body || {}

  if (!slug || !name || !phone || !partySize || !reservationDate || !reservationTime) {
    return res.status(400).json({ error: 'Please fill in all required fields.' })
  }

  if (email && !isValidEmail(email)) {
    return res.status(400).json({ error: 'Please enter a valid email address.' })
  }

  const partySizeNum = Number(partySize)
  if (!Number.isInteger(partySizeNum) || partySizeNum < 1 || partySizeNum > 30) {
    return res.status(400).json({ error: 'Please enter a valid party size.' })
  }

  const restaurant = await db.prepare('SELECT * FROM members WHERE slug = ?').get(slug)
  if (!restaurant) {
    return res.status(404).json({ error: 'Restaurant not found.' })
  }

  try {
    const result = await tenant(restaurant)
      .prepare(
        `INSERT INTO reservations (name, email, phone, party_size, reservation_date, reservation_time, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?) RETURNING id`
      )
      .run(name, email || null, phone, partySizeNum, reservationDate, reservationTime, notes || null)

    // Notify the restaurant of the new reservation, via their own SMTP.
    // If they haven't set it up yet, the reservation is still saved and
    // visible in their dashboard either way.
    if (restaurant.smtp_host && restaurant.smtp_user && restaurant.smtp_pass) {
      try {
        const restaurantTransporter = nodemailer.createTransport({
          host: restaurant.smtp_host,
          port: Number(restaurant.smtp_port) || 587,
          secure: false,
          auth: { user: restaurant.smtp_user, pass: restaurant.smtp_pass },
        })

        const notesLineText = notes ? `\nSpecial requests: ${notes}` : ''

        await restaurantTransporter.sendMail({
          from: restaurant.smtp_user,
          to: restaurant.smtp_user,
          replyTo: email || undefined,
          subject: `New table reservation — ${name} (party of ${partySizeNum}) on ${reservationDate}`,
          text: `You have a new table reservation via dynR:

Name: ${name}
Party size: ${partySizeNum}
Date: ${reservationDate}
Time: ${reservationTime}
Phone: ${phone}
Email: ${email || '—'}${notesLineText}

This reservation is also saved in your dynR dashboard under Reservations.`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; color: #2b2b2b;">
              <h2 style="color: #171717; margin-bottom: 16px;">New table reservation</h2>
              <table style="width: 100%; border-collapse: collapse; font-size: 15px;">
                <tr><td style="padding: 6px 0; color: #6f6f6f;">Name</td><td style="padding: 6px 0;"><strong>${escapeHtml(name)}</strong></td></tr>
                <tr><td style="padding: 6px 0; color: #6f6f6f;">Party size</td><td style="padding: 6px 0;">${escapeHtml(String(partySizeNum))}</td></tr>
                <tr><td style="padding: 6px 0; color: #6f6f6f;">Date</td><td style="padding: 6px 0;">${escapeHtml(reservationDate)}</td></tr>
                <tr><td style="padding: 6px 0; color: #6f6f6f;">Time</td><td style="padding: 6px 0;">${escapeHtml(reservationTime)}</td></tr>
                <tr><td style="padding: 6px 0; color: #6f6f6f;">Phone</td><td style="padding: 6px 0;">${escapeHtml(phone)}</td></tr>
                <tr><td style="padding: 6px 0; color: #6f6f6f;">Email</td><td style="padding: 6px 0;">${email ? escapeHtml(email) : '—'}</td></tr>
                ${notes ? `<tr><td style="padding: 6px 0; color: #6f6f6f; vertical-align: top;">Notes</td><td style="padding: 6px 0;">${escapeHtml(notes)}</td></tr>` : ''}
              </table>
              <p style="margin-top: 20px; color: #6f6f6f; font-size: 13px;">This reservation is also saved in your dynR dashboard under Reservations.</p>
            </div>
          `,
        })
      } catch (mailErr) {
        console.error('Failed to send reservation notification email:', mailErr)
      }
    }

    return res.status(201).json({ ok: true, reservationId: result.lastInsertRowid })
  } catch (err) {
    console.error('Reservation submission failed:', err)
    return res.status(500).json({ error: 'Something went wrong. Please try again.' })
  }
})

// ---------- Reservations: list for the logged-in restaurant ----------
app.get('/api/reservations', requireAuth, async (req, res) => {
  const reservations = await req.tenant
    .prepare(
      `SELECT id, name, email, phone, party_size, reservation_date, reservation_time, notes, status, created_at
       FROM reservations
       ORDER BY reservation_date ASC, reservation_time ASC`
    )
    .all()

  return res.json({ reservations })
})

// ---------- Reservations: update status (confirm/cancel) ----------
app.put('/api/reservations/:id/status', requireAuth, async (req, res) => {
  const { status } = req.body || {}

  if (!['pending', 'confirmed', 'cancelled'].includes(status)) {
    return res.status(400).json({ error: "status must be 'pending', 'confirmed', or 'cancelled'." })
  }

  const existing = await req.tenant.prepare('SELECT id FROM reservations WHERE id = ?').get(req.params.id)

  if (!existing) {
    return res.status(404).json({ error: 'Reservation not found.' })
  }

  await req.tenant.prepare('UPDATE reservations SET status = ? WHERE id = ?').run(status, req.params.id)

  return res.json({ ok: true })
})

// ---------- Guests: list all guests for the logged-in restaurant ----------
app.get('/api/guests', requireAuth, async (req, res) => {
  const guests = await req.tenant
    .prepare(
      `SELECT
        g.id,
        g.name,
        g.email,
        g.phone,
        g.membership_number,
        g.created_at,
        (SELECT COUNT(*)::int FROM visits WHERE guest_id = g.id) as visit_count,
        (SELECT visited_at FROM visits WHERE guest_id = g.id ORDER BY visited_at DESC LIMIT 1) as last_visit,
        (SELECT note_text FROM guest_notes WHERE guest_id = g.id ORDER BY created_at DESC LIMIT 1) as latest_note
      FROM guests g
      ORDER BY g.created_at DESC`
    )
    .all()

  return res.json({ guests })
})

// ---------- Guests: mark a visit ----------
app.post('/api/guests/:id/visit', requireAuth, async (req, res) => {
  const guest = await req.tenant.prepare('SELECT id FROM guests WHERE id = ?').get(req.params.id)

  if (!guest) {
    return res.status(404).json({ error: 'Guest not found.' })
  }

  // Queue a "thanks for visiting" follow-up email for 1 hour from now.
  // A background poller (see below) picks this up and sends it — using a
  // DB row instead of setTimeout means it still gets sent even if the
  // server restarts or redeploys in the meantime.
  const sendAt = new Date(Date.now() + 60 * 60 * 1000).toISOString()

  await req.tenant.transaction(async (t) => {
    await t.prepare('INSERT INTO visits (guest_id) VALUES (?)').run(guest.id)
    await t
      .prepare('INSERT INTO scheduled_emails (guest_id, send_at, status) VALUES (?, ?, ?)')
      .run(guest.id, sendAt, 'pending')
  })

  return res.json({ ok: true })
})

// ---------- Guests: add a note ----------
app.post('/api/guests/:id/notes', requireAuth, async (req, res) => {
  const { noteText } = req.body || {}

  if (!noteText || !noteText.trim()) {
    return res.status(400).json({ error: 'Note text is required.' })
  }

  const guest = await req.tenant.prepare('SELECT id FROM guests WHERE id = ?').get(req.params.id)

  if (!guest) {
    return res.status(404).json({ error: 'Guest not found.' })
  }

  await req.tenant
    .prepare('INSERT INTO guest_notes (guest_id, note_text) VALUES (?, ?)')
    .run(guest.id, noteText.trim())

  return res.json({ ok: true })
})

// ---------- Guests: send email to one or more guests ----------
app.post('/api/guests/message', requireAuth, async (req, res) => {
  const { guestIds, message } = req.body || {}

  if (!Array.isArray(guestIds) || guestIds.length === 0 || !message || !message.trim()) {
    return res.status(400).json({ error: 'Guest IDs and a message are required.' })
  }

  const restaurant = await db.prepare('SELECT * FROM members WHERE id = ?').get(req.memberId)

  if (!restaurant.smtp_host || !restaurant.smtp_user || !restaurant.smtp_pass) {
    return res.status(400).json({
      error: 'Please set up your email in Settings before sending messages.',
    })
  }

  const placeholders = guestIds.map(() => '?').join(',')
  const guests = await req.tenant
    .prepare(`SELECT id, name, email FROM guests WHERE id IN (${placeholders})`)
    .all(...guestIds)

  if (guests.length === 0) {
    return res.status(404).json({ error: 'No matching guests found.' })
  }

  try {
    const restaurantTransporter = nodemailer.createTransport({
      host: restaurant.smtp_host,
      port: Number(restaurant.smtp_port) || 587,
      secure: false,
      auth: {
        user: restaurant.smtp_user,
        pass: restaurant.smtp_pass,
      },
    })

    for (const guest of guests) {
      if (!guest.email) continue

      await restaurantTransporter.sendMail({
        from: restaurant.smtp_user,
        to: guest.email,
        subject: `A message from ${restaurant.restaurant_name}`,
        text: `Hi ${guest.name.split(' ')[0]},\n\n${message}\n\nWarmly,\n${restaurant.restaurant_name}`,
      })
    }

    return res.json({ ok: true, sent: guests.length })
  } catch (err) {
    console.error('Failed to send guest message:', err)
    return res.status(500).json({ error: 'Failed to send message. Please check your email settings.' })
  }
})
// ---------- Settings: Get current restaurant settings ----------
app.get('/api/settings', requireAuth, async (req, res) => {
  const member = await db
    .prepare(
      'SELECT smtp_host, smtp_port, smtp_user, smtp_pass, google_review_url FROM members WHERE id = ?'
    )
    .get(req.memberId)

  if (!member) {
    return res.status(404).json({ error: 'Restaurant not found.' })
  }

  return res.json({ settings: member })
})

// ---------- Settings: Update SMTP + Google review link ----------
app.put('/api/settings', requireAuth, async (req, res) => {
  const { smtpHost, smtpPort, smtpUser, smtpPass, googleReviewUrl } = req.body || {}

  try {
    await db.prepare(
      `UPDATE members
       SET smtp_host = ?, smtp_port = ?, smtp_user = ?, smtp_pass = ?, google_review_url = ?
       WHERE id = ?`
    ).run(
      smtpHost || null,
      smtpPort || null,
      smtpUser || null,
      smtpPass || null,
      googleReviewUrl || null,
      req.memberId
    )

    return res.json({ ok: true })
  } catch (err) {
    console.error('Failed to update settings:', err)
    return res.status(500).json({ error: 'Failed to save settings. Please try again.' })
  }
})

// ---------- Background pollers ----------
// Both pollers go restaurant by restaurant, opening each one's own folder in turn.

async function listRestaurantsWithFolders() {
  return db
    .prepare(
      `SELECT id, restaurant_name, smtp_host, smtp_port, smtp_user, smtp_pass, google_review_url,
              schema_name, db_role
       FROM members
       WHERE schema_name IS NOT NULL AND db_role IS NOT NULL`
    )
    .all()
}

// ---------- Background poller: send due "thanks for visiting" emails ----------
let visitPollRunning = false

async function sendDueScheduledEmails() {
  // If the previous run is still busy (e.g. a slow mail server), don't start a
  // second one on top of it — that could send the same email twice.
  if (visitPollRunning) return
  visitPollRunning = true

  try {
    let restaurants
    try {
      restaurants = await listRestaurantsWithFolders()
    } catch (err) {
      console.error('Failed to list restaurants — skipping this poll cycle:', err)
      return
    }

    const nowIso = new Date().toISOString()

    for (const restaurant of restaurants) {
      const folder = tenant(restaurant)

      let due
      try {
        due = await folder
          .prepare(
            `SELECT se.id as scheduled_id, g.id as guest_id, g.name, g.email
             FROM scheduled_emails se
             JOIN guests g ON g.id = se.guest_id
             WHERE se.status = 'pending' AND se.send_at <= ?`
          )
          .all(nowIso)
      } catch (err) {
        console.error(`Failed to query scheduled_emails for restaurant ${restaurant.id} — skipping:`, err)
        continue
      }

      for (const row of due) {
        // No email on file, or restaurant hasn't set up their SMTP yet — skip, don't retry forever.
        if (!row.email || !restaurant.smtp_host || !restaurant.smtp_user || !restaurant.smtp_pass) {
          try {
            await folder.prepare('UPDATE scheduled_emails SET status = ? WHERE id = ?').run('skipped', row.scheduled_id)
          } catch (err) {
            console.error(`Failed to mark scheduled_emails id ${row.scheduled_id} as skipped:`, err)
          }
          continue
        }

        try {
          const restaurantTransporter = nodemailer.createTransport({
            host: restaurant.smtp_host,
            port: Number(restaurant.smtp_port) || 587,
            secure: false,
            auth: { user: restaurant.smtp_user, pass: restaurant.smtp_pass },
          })

          const firstName = row.name.split(' ')[0]

          await restaurantTransporter.sendMail({
            from: restaurant.smtp_user,
            to: row.email,
            subject: `Thanks for visiting ${restaurant.restaurant_name}!`,
            text: `Hi ${firstName},\n\nThanks so much for visiting ${restaurant.restaurant_name} today — we hope you had a great time.${reviewLineText(restaurant.google_review_url, "If you enjoyed your visit, we'd love a quick review here:")}\n\nSee you again soon,\nThe ${restaurant.restaurant_name} team`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; color: #2b2b2b;">
                <h2 style="color: #171717; margin-bottom: 16px;">Thanks for visiting, ${escapeHtml(firstName)}!</h2>
                <p>Thanks so much for visiting <strong>${escapeHtml(restaurant.restaurant_name)}</strong> today — we hope you had a great time.</p>
                ${reviewButtonHtml(restaurant.google_review_url)}
                <p>See you again soon,<br/>The ${escapeHtml(restaurant.restaurant_name)} team</p>
              </div>
            `,
          })

          await folder.prepare('UPDATE scheduled_emails SET status = ? WHERE id = ?').run('sent', row.scheduled_id)
        } catch (err) {
          console.error(`Failed to send visit follow-up email (scheduled_emails id ${row.scheduled_id}):`, err)
          try {
            await folder.prepare('UPDATE scheduled_emails SET status = ? WHERE id = ?').run('failed', row.scheduled_id)
          } catch (markErr) {
            console.error(`Failed to mark scheduled_emails id ${row.scheduled_id} as failed:`, markErr)
          }
        }
      }
    }
  } finally {
    visitPollRunning = false
  }
}

// ---------- Background poller: send birthday emails ----------
// Runs hourly rather than once a day, so a guest's birthday email still goes
// out even if the server happens to restart/redeploy at the "usual" time.
// last_birthday_email_year makes repeated runs on the same day harmless.
let birthdayPollRunning = false

async function sendBirthdayEmails() {
  if (birthdayPollRunning) return
  birthdayPollRunning = true

  try {
    const now = new Date()
    const todayMonth = now.getUTCMonth() + 1
    const todayDay = now.getUTCDate()
    const todayYear = now.getUTCFullYear()

    let restaurants
    try {
      restaurants = await listRestaurantsWithFolders()
    } catch (err) {
      console.error('Failed to list restaurants — skipping this birthday poll cycle:', err)
      return
    }

    for (const restaurant of restaurants) {
      const folder = tenant(restaurant)

      let dueGuests
      try {
        dueGuests = await folder
          .prepare(
            `SELECT id as guest_id, name, email
             FROM guests
             WHERE birthday_month = ? AND birthday_day = ?
               AND (last_birthday_email_year IS NULL OR last_birthday_email_year <> ?)
               AND email IS NOT NULL`
          )
          .all(todayMonth, todayDay, todayYear)
      } catch (err) {
        console.error(`Failed to query birthday guests for restaurant ${restaurant.id} — skipping:`, err)
        continue
      }

      for (const row of dueGuests) {
        // Restaurant hasn't set up SMTP yet — mark this year as handled so we
        // don't keep re-querying the same guest every hour, but don't pretend
        // an email actually went out.
        if (!restaurant.smtp_host || !restaurant.smtp_user || !restaurant.smtp_pass) {
          try {
            await folder
              .prepare('UPDATE guests SET last_birthday_email_year = ? WHERE id = ?')
              .run(todayYear, row.guest_id)
          } catch (err) {
            console.error(`Failed to mark birthday email as skipped for guest ${row.guest_id}:`, err)
          }
          continue
        }

        try {
          const restaurantTransporter = nodemailer.createTransport({
            host: restaurant.smtp_host,
            port: Number(restaurant.smtp_port) || 587,
            secure: false,
            auth: { user: restaurant.smtp_user, pass: restaurant.smtp_pass },
          })

          const firstName = row.name.split(' ')[0]

          await restaurantTransporter.sendMail({
            from: restaurant.smtp_user,
            to: row.email,
            subject: `Happy Birthday from ${restaurant.restaurant_name}!`,
            text: `Hi ${firstName},\n\nHappy birthday from all of us at ${restaurant.restaurant_name}! We'd love to help you celebrate — come see us this month.${reviewLineText(restaurant.google_review_url, "And if you enjoy your visit, we'd love a quick review here:")}\n\nSee you soon,\nThe ${restaurant.restaurant_name} team`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; color: #2b2b2b;">
                <h2 style="color: #171717; margin-bottom: 16px;">Happy Birthday, ${escapeHtml(firstName)}!</h2>
                <p>Happy birthday from all of us at <strong>${escapeHtml(restaurant.restaurant_name)}</strong>! We'd love to help you celebrate — come see us this month.</p>
                ${reviewButtonHtml(restaurant.google_review_url)}
                <p>See you soon,<br/>The ${escapeHtml(restaurant.restaurant_name)} team</p>
              </div>
            `,
          })

          await folder
            .prepare('UPDATE guests SET last_birthday_email_year = ? WHERE id = ?')
            .run(todayYear, row.guest_id)
        } catch (err) {
          console.error(`Failed to send birthday email to guest ${row.guest_id}:`, err)
          // Don't mark as sent — this guest will simply be retried on the next poll today.
        }
      }
    }
  } finally {
    birthdayPollRunning = false
  }
}

// Check every minute for visit follow-ups (needs to be timely, within the hour).
setInterval(sendDueScheduledEmails, 60 * 1000)

// Check hourly for birthdays — no need to poll more often than that.
setInterval(sendBirthdayEmails, 60 * 60 * 1000)

app.listen(PORT, () => {
  console.log(`dynR backend listening on http://localhost:${PORT}`)
  sendDueScheduledEmails() // catch anything that was due while the server was down
  sendBirthdayEmails() // catch today's birthdays even if the server just started
})