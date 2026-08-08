import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import rateLimit from 'express-rate-limit'
import nodemailer from 'nodemailer'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import crypto from 'crypto'
import Stripe from 'stripe'
import db from './db.js'

dotenv.config()

// Stripe is optional until real keys are set — the app still runs fine
// without billing configured, it just can't create checkout sessions yet.
const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2025-03-31.basil' })
  : null

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

// ---------- Stripe webhook ----------
// Must be registered BEFORE express.json() — Stripe's signature check needs
// the raw, unparsed request body, not the JSON-parsed object.
app.post(
  '/api/stripe-webhook',
  express.raw({ type: 'application/json' }),
  (req, res) => {
    if (!stripe || !process.env.STRIPE_WEBHOOK_SECRET) {
      console.error('Stripe webhook hit but Stripe is not configured.')
      return res.status(503).send('Stripe not configured')
    }

    let event
    try {
      event = stripe.webhooks.constructEvent(
        req.body,
        req.headers['stripe-signature'],
        process.env.STRIPE_WEBHOOK_SECRET
      )
    } catch (err) {
      console.error('Stripe webhook signature verification failed:', err.message)
      return res.status(400).send(`Webhook Error: ${err.message}`)
    }

    try {
      switch (event.type) {
        // Subscription started successfully via Checkout.
        case 'checkout.session.completed': {
          const session = event.data.object
          const memberId = session.client_reference_id
          if (memberId) {
            db.prepare(
              'UPDATE members SET payment_status = ?, stripe_customer_id = ?, stripe_subscription_id = ? WHERE id = ?'
            ).run('paid', session.customer, session.subscription, memberId)
          }
          break
        }
        // Each successful renewal payment — keep them marked paid.
        case 'invoice.paid': {
          const invoice = event.data.object
          if (invoice.customer) {
            db.prepare('UPDATE members SET payment_status = ? WHERE stripe_customer_id = ?').run(
              'paid',
              invoice.customer
            )
          }
          break
        }
        // A renewal payment failed or the subscription was cancelled — flip back to unpaid.
        case 'invoice.payment_failed':
        case 'customer.subscription.deleted': {
          const obj = event.data.object
          if (obj.customer) {
            db.prepare('UPDATE members SET payment_status = ? WHERE stripe_customer_id = ?').run(
              'unpaid',
              obj.customer
            )
          }
          break
        }
        default:
          break
      }
      return res.json({ received: true })
    } catch (err) {
      console.error('Failed to process Stripe webhook event:', err)
      return res.status(500).send('Webhook processing error')
    }
  }
)

app.use(express.json())

// Basic abuse protection: 5 submissions per IP per 15 minutes
const contactLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please try again later.' },
})

// Login endpoints: looser than contact (real users mistype passwords),
// but still enough to make brute-forcing impractical.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts. Please try again in a few minutes.' },
})

// Admin login: fewer legitimate retries expected, so a tighter cap.
const adminLoginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts. Please try again in a few minutes.' },
})

// Forgot-password: prevent using it to spam a restaurant's inbox.
const forgotPasswordLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many reset requests. Please try again later.' },
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

// Fills {{placeholders}} in a restaurant's custom email text.
// Unknown placeholders are left as-is rather than throwing.
function fillTemplate(template, vars) {
  return template.replace(/{{\s*(\w+)\s*}}/g, (match, key) =>
    key in vars ? String(vars[key]) : match
  )
}

function generateMembershipNumber(restaurantName, count) {
  const initials = restaurantName
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 3)
  return `${initials}-${String(count).padStart(5, '0')}`
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

// ---------- Public: "Become a member" inquiry from the Join Us page ----------
// Restaurants don't self-register — this just notifies you so you can follow
// up and create their account manually via the admin panel.
app.post('/api/membership-inquiry', contactLimiter, async (req, res) => {
  const { restaurantName, contactName, email, phone, message } = req.body || {}

  if (!restaurantName || !contactName || !email) {
    return res.status(400).json({ error: 'Restaurant name, your name, and email are required.' })
  }

  if (!isValidEmail(email)) {
    return res.status(400).json({ error: 'Please enter a valid email address.' })
  }

  const mailBody = `
New "Become a Member" inquiry from dynr.co.uk

Restaurant: ${restaurantName}
Contact name: ${contactName}
Email: ${email}
Phone: ${phone || '—'}

Message:
${message || '—'}
`.trim()

  try {
    await transporter.sendMail({
      from: process.env.MAIL_FROM || '"dynR Website" <no-reply@dynr.co.uk>',
      to: process.env.MAIL_TO || 'hello@dynr.co.uk',
      replyTo: email,
      subject: `New membership inquiry — ${restaurantName}`,
      text: mailBody,
    })

    return res.status(200).json({ ok: true })
  } catch (err) {
    console.error('Failed to send membership inquiry email:', err)
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
function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization || ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null

  if (!token) {
    return res.status(401).json({ error: 'Not authenticated.' })
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET)
    req.memberId = payload.memberId
    next()
  } catch (err) {
    return res.status(401).json({ error: 'Session expired. Please sign in again.' })
  }
}

// ---------- Admin: Login ----------
app.post('/api/admin/login', adminLoginLimiter, (req, res) => {
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
  const {
    restaurantName,
    email,
    phone,
    password,
    smtpHost,
    smtpPort,
    smtpUser,
    smtpPass,
    googleReviewUrl,
  } = req.body || {}

  if (!restaurantName || !email || !password) {
    return res.status(400).json({ error: 'Restaurant name, email, and password are required.' })
  }

  if (!isValidEmail(email)) {
    return res.status(400).json({ error: 'Please enter a valid email address.' })
  }

  if (password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters.' })
  }

  if (!stripe || !process.env.STRIPE_PRICE_ID) {
    return res.status(503).json({ error: 'Billing is not configured yet — set STRIPE_SECRET_KEY and STRIPE_PRICE_ID first.' })
  }

  const existing = db.prepare('SELECT id FROM members WHERE email = ?').get(email)
  if (existing) {
    return res.status(409).json({ error: 'An account with this email already exists.' })
  }

  try {
    const passwordHash = await bcrypt.hash(password, 10)
    const slug = slugify(restaurantName)

    // Keep the plaintext password briefly — it's needed to include in the
    // confirmation email once payment succeeds (bcrypt hashes can't be
    // reversed). Cleared immediately after that email is sent.
    const result = db
      .prepare(
        `INSERT INTO members
          (restaurant_name, email, phone, password_hash, pending_password, is_paid, slug,
           smtp_host, smtp_port, smtp_user, smtp_pass, google_review_url)
         VALUES (?, ?, ?, ?, ?, 1, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        restaurantName,
        email,
        phone || null,
        passwordHash,
        password,
        slug,
        smtpHost || null,
        smtpPort || null,
        smtpUser || null,
        smtpPass || null,
        googleReviewUrl || null
      )

    const memberId = result.lastInsertRowid
    const appUrl = process.env.APP_URL || 'https://dynr.co.uk'

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: process.env.STRIPE_PRICE_ID, quantity: 1 }],
      customer_email: email,
      client_reference_id: String(memberId),
      success_url: `${appUrl}/account-created?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/dynr-team-portal?payment=cancelled`,
    })

    return res.status(201).json({ ok: true, restaurantId: memberId, checkoutUrl: session.url })
  } catch (err) {
    console.error('Registration failed:', err)
    return res.status(500).json({ error: 'Registration failed. Please try again.' })
  }
})

// ---------- Public: Confirm a Stripe payment and send the login email ----------
// Called by the /account-created page after Stripe redirects back. Verifies
// the session directly with Stripe rather than trusting the URL blindly —
// this works even without a webhook configured.
app.get('/api/confirm-payment', async (req, res) => {
  const { session_id } = req.query || {}

  if (!session_id) {
    return res.status(400).json({ error: 'Missing session ID.' })
  }

  if (!stripe) {
    return res.status(503).json({ error: 'Billing is not configured.' })
  }

  try {
    const session = await stripe.checkout.sessions.retrieve(session_id)

    if (session.payment_status !== 'paid') {
      return res.status(402).json({ error: 'Payment has not been completed yet.' })
    }

    const memberId = session.client_reference_id
    const member = memberId ? db.prepare('SELECT * FROM members WHERE id = ?').get(memberId) : null

    if (!member) {
      return res.status(404).json({ error: 'Restaurant not found for this payment.' })
    }

    db.prepare(
      'UPDATE members SET payment_status = ?, stripe_customer_id = ?, stripe_subscription_id = ? WHERE id = ?'
    ).run('paid', session.customer, session.subscription, member.id)

    // Send the confirmation email with their login — only once, using the
    // pending_password stashed at registration. If it's already been
    // cleared (e.g. the success page was reloaded), skip re-sending.
    if (member.pending_password) {
      try {
        await transporter.sendMail({
          from: process.env.MAIL_FROM || '"dynR" <no-reply@dynr.co.uk>',
          to: member.email,
          subject: 'Your dynR account is ready',
          text: `Hi ${member.restaurant_name},

Great news — your payment was successful and your dynR account is now active.

Here are your login details:
Login page: ${process.env.APP_URL || 'https://dynr.co.uk'}/login
Email: ${member.email}
Password: ${member.pending_password}

You can change your password anytime from Settings once you're logged in.

Welcome aboard,
The dynR team`,
        })
      } catch (mailErr) {
        console.error('Failed to send payment-confirmation email:', mailErr)
      }

      db.prepare('UPDATE members SET pending_password = NULL WHERE id = ?').run(member.id)
    }

    return res.json({ ok: true, restaurantName: member.restaurant_name })
  } catch (err) {
    console.error('Failed to confirm payment:', err)
    return res.status(500).json({ error: 'Failed to confirm payment. Please contact dynR.' })
  }
})

// ---------- Admin: List all registered restaurants ----------
// This reads directly from `members` every time, so it always reflects the
// live state — including payment_status, which only this endpoint (and the
// one below it) can change. A restaurant editing their own email/password
// via /api/login-protected routes never touches payment_status.
app.get('/api/admin/restaurants', requireAdmin, (req, res) => {
  const rows = db
    .prepare(
      `SELECT id, restaurant_name, email, phone, payment_status, created_at,
              smtp_host, smtp_user, smtp_pass
       FROM members
       ORDER BY created_at DESC`
    )
    .all()

  const restaurants = rows.map((r) => ({
    id: r.id,
    restaurant_name: r.restaurant_name,
    email: r.email,
    phone: r.phone,
    payment_status: r.payment_status,
    created_at: r.created_at,
    smtp_configured: !!(r.smtp_host && r.smtp_user && r.smtp_pass),
  }))

  return res.json({ restaurants })
})

// ---------- Admin: Set a restaurant's payment status ----------
app.put('/api/admin/restaurants/:id/payment', requireAdmin, (req, res) => {
  const { paymentStatus } = req.body || {}

  if (!['paid', 'unpaid'].includes(paymentStatus)) {
    return res.status(400).json({ error: "paymentStatus must be 'paid' or 'unpaid'." })
  }

  const existing = db.prepare('SELECT id FROM members WHERE id = ?').get(req.params.id)
  if (!existing) {
    return res.status(404).json({ error: 'Restaurant not found.' })
  }

  db.prepare('UPDATE members SET payment_status = ? WHERE id = ?').run(paymentStatus, req.params.id)

  return res.json({ ok: true })
})

// ---------- Admin: Delete a restaurant (and all their data) ----------
// Cascades manually since node:sqlite doesn't enforce ON DELETE CASCADE
// by default — deletes guest_notes and visits for their guests, then
// scheduled_emails, then the guests themselves, then the member. Order
// matters here because of the foreign key references.
app.delete('/api/admin/restaurants/:id', requireAdmin, (req, res) => {
  const restaurantId = req.params.id

  const existing = db.prepare('SELECT id, restaurant_name FROM members WHERE id = ?').get(restaurantId)
  if (!existing) {
    return res.status(404).json({ error: 'Restaurant not found.' })
  }

  try {
    const guestIds = db
      .prepare('SELECT id FROM guests WHERE restaurant_id = ?')
      .all(restaurantId)
      .map((g) => g.id)

    for (const guestId of guestIds) {
      db.prepare('DELETE FROM guest_notes WHERE guest_id = ?').run(guestId)
      db.prepare('DELETE FROM visits WHERE guest_id = ?').run(guestId)
    }

    db.prepare('DELETE FROM scheduled_emails WHERE restaurant_id = ?').run(restaurantId)
    db.prepare('DELETE FROM guests WHERE restaurant_id = ?').run(restaurantId)
    db.prepare('DELETE FROM password_resets WHERE member_id = ?').run(restaurantId)
    db.prepare('DELETE FROM members WHERE id = ?').run(restaurantId)

    return res.json({ ok: true, deleted: existing.restaurant_name })
  } catch (err) {
    console.error(`Failed to delete restaurant id ${restaurantId}:`, err)
    return res.status(500).json({ error: 'Failed to delete restaurant. Please try again.' })
  }
})

// ---------- Membership: Restaurant Sign In ----------
app.post('/api/login', loginLimiter, async (req, res) => {
  const { email, password } = req.body || {}

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' })
  }

  const member = db.prepare('SELECT * FROM members WHERE email = ?').get(email)
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
app.post('/api/forgot-password', forgotPasswordLimiter, async (req, res) => {
  const { email } = req.body || {}

  if (!email || !isValidEmail(email)) {
    return res.status(400).json({ error: 'Please enter a valid email address.' })
  }

  const genericResponse = {
    ok: true,
    message: 'If an account exists for that email, a reset link has been sent.',
  }

  const member = db.prepare('SELECT * FROM members WHERE email = ?').get(email)
  if (!member) {
    return res.json(genericResponse)
  }

  const token = crypto.randomBytes(32).toString('hex')
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString() // 1 hour

  db.prepare(
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

  const resetRow = db.prepare('SELECT * FROM password_resets WHERE token = ?').get(token)

  if (!resetRow || resetRow.used || new Date(resetRow.expires_at) < new Date()) {
    return res.status(400).json({ error: 'This reset link is invalid or has expired. Please request a new one.' })
  }

  const passwordHash = await bcrypt.hash(newPassword, 10)

  db.prepare('UPDATE members SET password_hash = ? WHERE id = ?').run(passwordHash, resetRow.member_id)
  db.prepare('UPDATE password_resets SET used = 1 WHERE id = ?').run(resetRow.id)

  return res.json({ ok: true })
})

// ---------- Membership: Current member info (for dashboard) ----------
app.get('/api/member/me', requireAuth, (req, res) => {
  const member = db
    .prepare('SELECT id, restaurant_name, email, phone, slug, created_at FROM members WHERE id = ?')
    .get(req.memberId)

  if (!member) {
    return res.status(404).json({ error: 'Member not found.' })
  }

  return res.json({ member })
})

// ---------- Public: Get restaurant name by slug (for guest sign-up page) ----------
app.get('/api/public/restaurant/:slug', (req, res) => {
  const restaurant = db
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

  const restaurant = db.prepare('SELECT * FROM members WHERE slug = ?').get(slug)
  if (!restaurant) {
    return res.status(404).json({ error: 'Restaurant not found.' })
  }

  try {
    const countRow = db
      .prepare('SELECT COUNT(*) as count FROM guests WHERE restaurant_id = ?')
      .get(restaurant.id)

    const membershipNumber = generateMembershipNumber(
      restaurant.restaurant_name,
      countRow.count + 1
    )

    db.prepare(
      `INSERT INTO guests (restaurant_id, name, email, phone, birthday_day, birthday_month, membership_number)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).run(restaurant.id, name, email, phone, birthdayDay, birthdayMonth, membershipNumber)

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

        const defaultWelcomeText = `Welcome to the family, ${name.split(' ')[0]}!

Thank you for becoming part of the ${restaurant.restaurant_name} family — we're so glad to have you. Keep an eye on your inbox for exciting member-only offers and news, just for members like you.

Your membership number: ${membershipNumber}

Warmly,
The ${restaurant.restaurant_name} team`

        const welcomeText = restaurant.welcome_email_text
          ? fillTemplate(restaurant.welcome_email_text, {
              first_name: name.split(' ')[0],
              name,
              restaurant_name: restaurant.restaurant_name,
              membership_number: membershipNumber,
            })
          : defaultWelcomeText

        await restaurantTransporter.sendMail({
          from: restaurant.smtp_user,
          to: email,
          subject: `You're one of ours now, ${name.split(' ')[0]}`,
          text: welcomeText,
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

// ---------- Guests: list all guests for the logged-in restaurant ----------
app.get('/api/guests', requireAuth, (req, res) => {
  const guests = db
    .prepare(
      `SELECT
        g.id,
        g.name,
        g.email,
        g.phone,
        g.membership_number,
        g.created_at,
        (SELECT COUNT(*) FROM visits WHERE guest_id = g.id) as visit_count,
        (SELECT visited_at FROM visits WHERE guest_id = g.id ORDER BY visited_at DESC LIMIT 1) as last_visit,
        (SELECT note_text FROM guest_notes WHERE guest_id = g.id ORDER BY created_at DESC LIMIT 1) as latest_note
      FROM guests g
      WHERE g.restaurant_id = ?
      ORDER BY g.created_at DESC`
    )
    .all(req.memberId)

  return res.json({ guests })
})

// ---------- Guests: mark a visit ----------
app.post('/api/guests/:id/visit', requireAuth, (req, res) => {
  const guest = db
    .prepare('SELECT id FROM guests WHERE id = ? AND restaurant_id = ?')
    .get(req.params.id, req.memberId)

  if (!guest) {
    return res.status(404).json({ error: 'Guest not found.' })
  }

  db.prepare('INSERT INTO visits (guest_id) VALUES (?)').run(guest.id)

  // Queue a "thanks for visiting" follow-up email for 1 hour from now.
  // A background poller (see below) picks this up and sends it — using a
  // DB row instead of setTimeout means it still gets sent even if the
  // server restarts or redeploys in the meantime.
  const sendAt = new Date(Date.now() + 60 * 60 * 1000).toISOString()
  db.prepare(
    'INSERT INTO scheduled_emails (guest_id, restaurant_id, send_at, status) VALUES (?, ?, ?, ?)'
  ).run(guest.id, req.memberId, sendAt, 'pending')

  return res.json({ ok: true })
})

// ---------- Guests: add a note ----------
// ---------- Guests: list all notes for a guest ----------
app.get('/api/guests/:id/notes', requireAuth, (req, res) => {
  const guest = db
    .prepare('SELECT id FROM guests WHERE id = ? AND restaurant_id = ?')
    .get(req.params.id, req.memberId)

  if (!guest) {
    return res.status(404).json({ error: 'Guest not found.' })
  }

  const notes = db
    .prepare('SELECT id, note_text, created_at FROM guest_notes WHERE guest_id = ? ORDER BY created_at DESC')
    .all(guest.id)

  return res.json({ notes })
})

app.post('/api/guests/:id/notes', requireAuth, (req, res) => {
  const { noteText } = req.body || {}

  if (!noteText || !noteText.trim()) {
    return res.status(400).json({ error: 'Note text is required.' })
  }

  const guest = db
    .prepare('SELECT id FROM guests WHERE id = ? AND restaurant_id = ?')
    .get(req.params.id, req.memberId)

  if (!guest) {
    return res.status(404).json({ error: 'Guest not found.' })
  }

  const result = db
    .prepare('INSERT INTO guest_notes (guest_id, note_text) VALUES (?, ?)')
    .run(guest.id, noteText.trim())

  return res.json({ ok: true, noteId: Number(result.lastInsertRowid) })
})

// ---------- Guests: edit an existing note ----------
// Previous notes are never overwritten by this — only the one note whose id
// is in the URL changes. The full history stays intact and visible.
app.put('/api/guests/:guestId/notes/:noteId', requireAuth, (req, res) => {
  const { noteText } = req.body || {}

  if (!noteText || !noteText.trim()) {
    return res.status(400).json({ error: 'Note text is required.' })
  }

  const guest = db
    .prepare('SELECT id FROM guests WHERE id = ? AND restaurant_id = ?')
    .get(req.params.guestId, req.memberId)

  if (!guest) {
    return res.status(404).json({ error: 'Guest not found.' })
  }

  const note = db
    .prepare('SELECT id FROM guest_notes WHERE id = ? AND guest_id = ?')
    .get(req.params.noteId, guest.id)

  if (!note) {
    return res.status(404).json({ error: 'Note not found.' })
  }

  db.prepare('UPDATE guest_notes SET note_text = ? WHERE id = ?').run(noteText.trim(), note.id)

  return res.json({ ok: true })
})

// ---------- Guests: send email to one or more guests ----------
app.post('/api/guests/message', requireAuth, async (req, res) => {
  const { guestIds, message } = req.body || {}

  if (!Array.isArray(guestIds) || guestIds.length === 0 || !message || !message.trim()) {
    return res.status(400).json({ error: 'Guest IDs and a message are required.' })
  }

  const restaurant = db.prepare('SELECT * FROM members WHERE id = ?').get(req.memberId)

  if (!restaurant.smtp_host || !restaurant.smtp_user || !restaurant.smtp_pass) {
    return res.status(400).json({
      error: 'Please set up your email in Settings before sending messages.',
    })
  }

  const placeholders = guestIds.map(() => '?').join(',')
  const guests = db
    .prepare(
      `SELECT id, name, email FROM guests WHERE restaurant_id = ? AND id IN (${placeholders})`
    )
    .all(req.memberId, ...guestIds)

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
app.get('/api/settings', requireAuth, (req, res) => {
  const member = db
    .prepare(
      `SELECT smtp_host, smtp_port, smtp_user, smtp_pass, google_review_url,
              welcome_email_text, followup_email_text, payment_status
       FROM members WHERE id = ?`
    )
    .get(req.memberId)

  if (!member) {
    return res.status(404).json({ error: 'Restaurant not found.' })
  }

  // Never send the actual password back to the browser — it'd sit in
  // plaintext in the API response / Network tab. The frontend only needs
  // to know whether one is already saved.
  const { smtp_pass, ...safeMember } = member

  return res.json({ settings: { ...safeMember, smtp_configured: !!smtp_pass } })
})

// ---------- Settings: Update SMTP + Google review link + email templates ----------
app.put('/api/settings', requireAuth, (req, res) => {
  const { smtpHost, smtpPort, smtpUser, smtpPass, googleReviewUrl, welcomeEmailText, followupEmailText } =
    req.body || {}

  try {
    // If smtpPass is left blank, keep whatever password is already saved
    // instead of wiping it out — the frontend never receives the real
    // value, so an empty field here doesn't mean "clear the password."
    if (smtpPass && smtpPass.trim()) {
      db.prepare(
        `UPDATE members
         SET smtp_host = ?, smtp_port = ?, smtp_user = ?, smtp_pass = ?, google_review_url = ?,
             welcome_email_text = ?, followup_email_text = ?
         WHERE id = ?`
      ).run(
        smtpHost || null,
        smtpPort || null,
        smtpUser || null,
        smtpPass,
        googleReviewUrl || null,
        welcomeEmailText || null,
        followupEmailText || null,
        req.memberId
      )
    } else {
      db.prepare(
        `UPDATE members
         SET smtp_host = ?, smtp_port = ?, smtp_user = ?, google_review_url = ?,
             welcome_email_text = ?, followup_email_text = ?
         WHERE id = ?`
      ).run(
        smtpHost || null,
        smtpPort || null,
        smtpUser || null,
        googleReviewUrl || null,
        welcomeEmailText || null,
        followupEmailText || null,
        req.memberId
      )
    }

    return res.json({ ok: true })
  } catch (err) {
    console.error('Failed to update settings:', err)
    return res.status(500).json({ error: 'Failed to save settings. Please try again.' })
  }
})

// ---------- Change password (for a restaurant already logged in) ----------
app.put('/api/change-password', requireAuth, async (req, res) => {
  const { currentPassword, newPassword } = req.body || {}

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Current password and new password are required.' })
  }

  if (newPassword.length < 8) {
    return res.status(400).json({ error: 'New password must be at least 8 characters.' })
  }

  const member = db.prepare('SELECT * FROM members WHERE id = ?').get(req.memberId)
  if (!member) {
    return res.status(404).json({ error: 'Restaurant not found.' })
  }

  const isMatch = await bcrypt.compare(currentPassword, member.password_hash)
  if (!isMatch) {
    return res.status(401).json({ error: 'Current password is incorrect.' })
  }

  const newHash = await bcrypt.hash(newPassword, 10)
  db.prepare('UPDATE members SET password_hash = ? WHERE id = ?').run(newHash, req.memberId)

  return res.json({ ok: true })
})

// ---------- Background poller: send due "thanks for visiting" emails ----------
async function sendDueScheduledEmails() {
  let due
  try {
    const nowIso = new Date().toISOString()
    due = db
      .prepare(
        `SELECT se.id as scheduled_id, g.id as guest_id, g.name, g.email,
                m.restaurant_name, m.smtp_host, m.smtp_port, m.smtp_user, m.smtp_pass,
                m.google_review_url, m.followup_email_text
         FROM scheduled_emails se
         JOIN guests g ON g.id = se.guest_id
         JOIN members m ON m.id = se.restaurant_id
         WHERE se.status = 'pending' AND se.send_at <= ?`
      )
      .all(nowIso)
  } catch (err) {
    console.error('Failed to query scheduled_emails — skipping this poll cycle:', err)
    return
  }

  for (const row of due) {
    // No email on file, or restaurant hasn't set up their SMTP yet — skip, don't retry forever.
    if (!row.email || !row.smtp_host || !row.smtp_user || !row.smtp_pass) {
      try {
        db.prepare('UPDATE scheduled_emails SET status = ? WHERE id = ?').run('skipped', row.scheduled_id)
      } catch (err) {
        console.error(`Failed to mark scheduled_emails id ${row.scheduled_id} as skipped:`, err)
      }
      continue
    }

    try {
      const restaurantTransporter = nodemailer.createTransport({
        host: row.smtp_host,
        port: Number(row.smtp_port) || 587,
        secure: false,
        auth: { user: row.smtp_user, pass: row.smtp_pass },
      })

      const reviewLine = row.google_review_url
        ? `\n\nIf you enjoyed your visit, we'd love a quick review here: ${row.google_review_url}`
        : ''

      const defaultFollowupText = `Hi ${row.name.split(' ')[0]},\n\nThanks so much for visiting ${row.restaurant_name} today — we hope you had a great time.${reviewLine}\n\nSee you again soon,\nThe ${row.restaurant_name} team`

      const followupText = row.followup_email_text
        ? fillTemplate(row.followup_email_text, {
            first_name: row.name.split(' ')[0],
            name: row.name,
            restaurant_name: row.restaurant_name,
            review_link: row.google_review_url || '',
          })
        : defaultFollowupText

      await restaurantTransporter.sendMail({
        from: row.smtp_user,
        to: row.email,
        subject: `Thanks for visiting ${row.restaurant_name}!`,
        text: followupText,
      })

      db.prepare('UPDATE scheduled_emails SET status = ? WHERE id = ?').run('sent', row.scheduled_id)
    } catch (err) {
      console.error(`Failed to send visit follow-up email (scheduled_emails id ${row.scheduled_id}):`, err)
      db.prepare('UPDATE scheduled_emails SET status = ? WHERE id = ?').run('failed', row.scheduled_id)
    }
  }
}

// Check every minute. Good enough for a "within the hour" follow-up without hammering SMTP.
setInterval(sendDueScheduledEmails, 60 * 1000)

app.listen(PORT, () => {
  console.log(`dynR backend listening on http://localhost:${PORT}`)
  sendDueScheduledEmails() // catch anything that was due while the server was down
})