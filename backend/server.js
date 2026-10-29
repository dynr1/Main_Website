import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import rateLimit from 'express-rate-limit'
import nodemailer from 'nodemailer'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import Stripe from 'stripe'
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

// ---------- Stripe: the £79/month membership ----------
// Set STRIPE_SECRET_KEY, STRIPE_PRICE_ID and STRIPE_WEBHOOK_SECRET (see
// .env.example). Without them the site still works; payment is just not offered.
// Pinned on purpose: Stripe accounts with "Managed Payments" need API version
// 2025-03-31.basil or newer, and an older installed Stripe package would otherwise
// default to an older version.
const STRIPE_API_VERSION = '2025-03-31.basil'
const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: STRIPE_API_VERSION,
      ...(process.env.STRIPE_TEST_PORT
        ? { host: '127.0.0.1', port: process.env.STRIPE_TEST_PORT, protocol: 'http' } // local testing only
        : {}),
    })
  : null
const stripeReady = () => Boolean(stripe && process.env.STRIPE_PRICE_ID)
const APP_URL = () => process.env.APP_URL || 'https://dynr.co.uk'

// Two months free: the card is collected now and Stripe charges £79 automatically
// when the trial ends. A restaurant that has already had a subscription does not
// get a second free trial.
function trialEndsAt() {
  const d = new Date()
  d.setMonth(d.getMonth() + 2)
  return Math.floor(d.getTime() / 1000)
}

async function createCheckoutUrl(member) {
  const firstTime = !member.stripe_subscription_id
  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    line_items: [{ price: process.env.STRIPE_PRICE_ID, quantity: 1 }],
    payment_method_collection: 'always',
    // Re-use the Stripe customer if they already have one, otherwise pre-fill their email.
    ...(member.stripe_customer_id
      ? { customer: member.stripe_customer_id }
      : { customer_email: member.email }),
    client_reference_id: String(member.id),
    metadata: { memberId: String(member.id) },
    subscription_data: {
      metadata: { memberId: String(member.id) },
      ...(firstTime ? { trial_end: trialEndsAt() } : {}),
    },
    success_url: `${APP_URL()}/payment-success`,
    cancel_url: `${APP_URL()}/payment-cancelled`,
  })
  return session.url
}

// The login email. For restaurants who sign up themselves it goes out once their
// payment details are confirmed, and it does not repeat their password (they
// chose it on the sign-up form, and we only ever store it scrambled).
async function sendLoginEmailAfterPayment(memberId) {
  // "Claim" the email first so a repeated Stripe event can't send it twice.
  const claimed = await db
    .prepare('UPDATE members SET welcome_email_sent = 1 WHERE id = ? AND welcome_email_sent = 0 RETURNING id')
    .get(memberId)
  if (!claimed) return

  const m = await db.prepare('SELECT restaurant_name, email FROM members WHERE id = ?').get(memberId)
  try {
    await transporter.sendMail({
      from: process.env.MAIL_FROM || '"dynR" <no-reply@dynr.co.uk>',
      to: m.email,
      bcc: 'abdul@dynr.co.uk',
      subject: 'Your dynR dashboard is ready',
      text: `Hi ${m.restaurant_name},

Thank you — your payment details are confirmed and your 2-month free trial has started. Nothing is charged until the trial ends, then £79 per month is taken automatically. You can cancel any time from Settings in your dashboard.

Your dashboard is ready. Here are your login details:

Login page: ${APP_URL()}/login
Email: ${m.email}
Password: the password you chose when you registered

Welcome aboard,
The dynR team`,
    })
  } catch (mailErr) {
    await db.prepare('UPDATE members SET welcome_email_sent = 0 WHERE id = ?').run(memberId)
    console.error('Failed to send login email after payment:', mailErr)
  }
}

// Stripe tells us when someone pays or cancels, so payment_status updates by itself.
// This route needs the raw request body to verify the signature, so it must stay
// ABOVE express.json().
app.post('/api/stripe/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  if (!stripe || !process.env.STRIPE_WEBHOOK_SECRET) {
    return res.status(503).send('Payments are not set up.')
  }

  let event
  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      req.headers['stripe-signature'],
      process.env.STRIPE_WEBHOOK_SECRET
    )
  } catch (err) {
    console.error('Stripe webhook signature check failed:', err.message)
    return res.status(400).send('Invalid signature.')
  }

  try {
    const obj = event.data.object

    if (event.type === 'checkout.session.completed') {
      const memberId = Number(obj.client_reference_id || obj.metadata?.memberId)
      if (memberId && obj.mode === 'subscription') {
        await db
          .prepare(
            `UPDATE members SET payment_status = 'paid', stripe_customer_id = ?, stripe_subscription_id = ?
             WHERE id = ?`
          )
          .run(obj.customer || null, obj.subscription || null, memberId)
        console.log(`Stripe: restaurant #${memberId} paid.`)
        void sendLoginEmailAfterPayment(memberId)
      }
    } else if (
      event.type === 'customer.subscription.updated' ||
      event.type === 'customer.subscription.deleted'
    ) {
      const memberId = Number(obj.metadata?.memberId)
      const active = ['active', 'trialing', 'past_due'].includes(obj.status)
      const status = event.type === 'customer.subscription.deleted' || !active ? 'unpaid' : 'paid'
      if (memberId) {
        await db.prepare('UPDATE members SET payment_status = ? WHERE id = ?').run(status, memberId)
      } else if (obj.id) {
        await db
          .prepare('UPDATE members SET payment_status = ? WHERE stripe_subscription_id = ?')
          .run(status, obj.id)
      }
      console.log(`Stripe: subscription ${obj.id} is now ${obj.status} -> ${status}.`)
    }
  } catch (err) {
    console.error('Stripe webhook handling failed:', err)
    return res.status(500).send('Webhook handling failed.') // Stripe will retry
  }

  return res.json({ received: true })
})

// Behind Render's proxy: lets rate limits see each visitor's real IP
app.set('trust proxy', 1)
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

// If a mail server is slow or unreachable (e.g. a host that blocks SMTP ports),
// give up after ~10s instead of hanging for minutes.
const MAIL_TIMEOUTS = { connectionTimeout: 10000, greetingTimeout: 10000, socketTimeout: 20000 }

// Builds the mail connection for a restaurant's OWN email account (never dynR's).
// Port 465 needs an encrypted-from-the-start connection; 587 upgrades after connecting.
// Gmail app passwords are shown with spaces ("abcd efgh ijkl mnop") - strip them.
function makeRestaurantTransporter(r) {
  const host = String(r.smtp_host || '').trim()
  const port = Number(r.smtp_port) || 587
  const user = String(r.smtp_user || '').trim()
  let pass = String(r.smtp_pass || '')
  if (/gmail|googlemail/i.test(host)) pass = pass.replace(/\s+/g, '')
  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
    ...MAIL_TIMEOUTS,
  })
}

// Turns a mail error into something a restaurant owner can act on.
function explainMailError(err, host) {
  const code = err?.code || ''
  const msg = String(err?.message || '')
  const h = String(host || '').toLowerCase()
  if (code === 'EAUTH' || /535|534|auth/i.test(msg)) {
    if (h.includes('gmail')) {
      return "Gmail didn't accept that password. You need a Gmail App Password (16 letters), not your normal Gmail password. Follow the steps shown above to create one."
    }
    if (h.includes('yahoo')) {
      return "Yahoo didn't accept that password. You need a Yahoo App Password, not your normal password. Follow the steps shown above."
    }
    if (h.includes('outlook') || h.includes('office365') || h.includes('hotmail') || h.includes('live.')) {
      return "Microsoft didn't accept that password. Microsoft often blocks this kind of sign-in, especially for work accounts. A Gmail address is the easiest option if you have one."
    }
    return "The email provider didn't accept that email address and password. Check both, and use an app password if your provider offers one."
  }
  if (code === 'ETIMEDOUT' || code === 'ESOCKET' || code === 'ECONNECTION' || /timeout/i.test(msg)) {
    return "We couldn't reach that mail server in time. Check the server name and port, then try again."
  }
  if (code === 'ENOTFOUND' || code === 'EDNS') {
    return "That mail server name wasn't found. Check it for typos (for Gmail it is smtp.gmail.com)."
  }
  if (code === 'ECONNREFUSED') {
    return "The mail server refused the connection. Check the port number (587 for most providers, 465 for Yahoo)."
  }
  return "We couldn't send the test email. Check your email address, password, server and port."
}

// Mail transport — configure via .env (see .env.example)
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT) || 587,
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  ...MAIL_TIMEOUTS,
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
// Anyone can register as a member from the public /register-as-member page.
// A signed-in dynR admin can also use it; admins additionally get the new
// folder's database login back (shown once). Public sign-ups never do.
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many sign-ups from this connection. Please try again later.' },
})

function isAdminRequest(req) {
  const h = req.headers.authorization || ''
  if (!h.startsWith('Bearer ')) return false
  try {
    return jwt.verify(h.slice(7), process.env.JWT_SECRET).role === 'admin'
  } catch {
    return false
  }
}

app.post('/api/register', (req, res, next) => (isAdminRequest(req) ? next() : registerLimiter(req, res, next)), async (req, res) => {
  const { restaurantName, email, phone, password, website } = req.body || {}
  const isAdmin = isAdminRequest(req)

  // Honeypot: real people never fill the hidden "website" field. Pretend success.
  if (!isAdmin && website) return res.status(201).json({ ok: true })

  if (typeof restaurantName !== 'string' || typeof email !== 'string' || typeof password !== 'string') {
    return res.status(400).json({ error: 'Restaurant name, email, and password are required.' })
  }
  if (restaurantName.length > 120 || email.length > 200 || password.length > 200) {
    return res.status(400).json({ error: 'One of the details is too long.' })
  }

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

    // Email the restaurant their dashboard login details — in the background,
    // so the sign-up page responds immediately even if the mail server is slow.
    // Restaurants who sign up themselves get their login email once payment is
    // confirmed (see the Stripe webhook). Accounts you create from the team portal,
    // or any sign-up while Stripe isn't set up, get it straight away.
    if (isAdmin || !stripeReady()) void (async () => {
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
    })()

    // The folder's database password is shown to the admin exactly once (it is
    // not stored anywhere readable — use "reset" to get a new one).
    if (!isAdmin) {
      // Send the new restaurant straight to the £79/month payment page.
      let checkoutUrl = null
      let paymentFailed = false
      if (stripeReady()) {
        try {
          checkoutUrl = await createCheckoutUrl({ id: restaurantId, email })
        } catch (payErr) {
          // The account exists; they can still pay later from Settings.
          paymentFailed = true
          console.error('Could not start checkout for new restaurant:', payErr.message)
        }
      }
      return res.status(201).json({ ok: true, checkoutUrl, paymentFailed })
    }

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

// ---------- Billing: the restaurant's own subscription ----------
app.get('/api/billing', requireAuth, async (req, res) => {
  const m = await db
    .prepare('SELECT payment_status, stripe_customer_id FROM members WHERE id = ?')
    .get(req.memberId)
  return res.json({
    configured: stripeReady(),
    paymentStatus: m?.payment_status || 'unpaid',
    canManage: Boolean(m?.stripe_customer_id),
  })
})

app.post('/api/billing/checkout', requireAuth, async (req, res) => {
  if (!stripeReady()) return res.status(503).json({ error: 'Payments are not available yet.' })
  const m = await db
    .prepare('SELECT id, email, payment_status, stripe_customer_id, stripe_subscription_id FROM members WHERE id = ?')
    .get(req.memberId)
  if (!m) return res.status(404).json({ error: 'Restaurant not found.' })
  if (m.payment_status === 'paid') return res.status(400).json({ error: 'Your membership is already active.' })
  try {
    return res.json({ url: await createCheckoutUrl(m) })
  } catch (err) {
    console.error('Checkout failed:', err.message)
    return res.status(502).json({ error: 'Could not open the payment page. Please try again.' })
  }
})

// Stripe's own page where they update their card or cancel.
app.post('/api/billing/portal', requireAuth, async (req, res) => {
  if (!stripeReady()) return res.status(503).json({ error: 'Payments are not available yet.' })
  const m = await db.prepare('SELECT stripe_customer_id FROM members WHERE id = ?').get(req.memberId)
  if (!m?.stripe_customer_id) {
    return res.status(400).json({ error: 'No subscription found to manage.' })
  }
  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: m.stripe_customer_id,
      return_url: `${APP_URL()}/settings`,
    })
    return res.json({ url: session.url })
  } catch (err) {
    console.error('Billing portal failed:', err.message)
    return res.status(502).json({ error: 'Could not open subscription settings. Please try again.' })
  }
})

// Admin: get a payment link to send to a restaurant that has not paid yet.
app.post('/api/admin/restaurants/:id/payment-link', requireAdmin, async (req, res) => {
  if (!stripeReady()) return res.status(503).json({ error: 'Payments are not set up yet.' })
  const m = await db
    .prepare('SELECT id, email, stripe_customer_id, stripe_subscription_id FROM members WHERE id = ?')
    .get(Number(req.params.id))
  if (!m) return res.status(404).json({ error: 'Restaurant not found.' })
  try {
    return res.json({ ok: true, url: await createCheckoutUrl(m) })
  } catch (err) {
    console.error('Payment link failed:', err.message)
    // Admin-only, so it's safe to show Stripe's own reason.
    return res.status(502).json({ error: `Stripe could not create the payment link: ${err.message}` })
  }
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

  void (async () => {
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
  })()

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
    // Sent in the background so the guest never waits on the mail server.
    if (restaurant.smtp_host && restaurant.smtp_user && restaurant.smtp_pass) {
      void (async () => {
      try {
        const restaurantTransporter = makeRestaurantTransporter(restaurant)

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
      })()
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
    // Sent in the background so the guest's booking confirms instantly.
    if (restaurant.smtp_host && restaurant.smtp_user && restaurant.smtp_pass) {
      void (async () => {
      try {
        const restaurantTransporter = makeRestaurantTransporter(restaurant)

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
      })()
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
      `SELECT id, name, email, phone, party_size, reservation_date, reservation_time, notes, status, table_label, created_at
       FROM reservations
       ORDER BY reservation_date ASC, reservation_time ASC`
    )
    .all()

  return res.json({ reservations })
})

// ---------- Reservations: update status (confirm/cancel) ----------
app.put('/api/reservations/:id/status', requireAuth, async (req, res) => {
  const { status } = req.body || {}

  if (!['pending', 'confirmed', 'seated', 'completed', 'cancelled'].includes(status)) {
    return res
      .status(400)
      .json({ error: "status must be 'pending', 'confirmed', 'seated', 'completed' or 'cancelled'." })
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
        g.birthday_day,
        g.birthday_month,
        g.unsubscribed_at,
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

  await recordVisit(req.tenant, guest.id)

  return res.json({ ok: true })
})

// Records a visit and queues the "thanks for visiting" follow-up email for 1 hour
// from now. A background poller (see below) picks this up and sends it — using a
// DB row instead of setTimeout means it still gets sent even if the server
// restarts or redeploys in the meantime.
async function recordVisit(folder, guestId) {
  const sendAt = new Date(Date.now() + 60 * 60 * 1000).toISOString()

  await folder.transaction(async (t) => {
    await t.prepare('INSERT INTO visits (guest_id) VALUES (?)').run(guestId)
    await t
      .prepare('INSERT INTO scheduled_emails (guest_id, send_at, status) VALUES (?, ?, ?)')
      .run(guestId, sendAt, 'pending')
  })
}

// ---------- Reservations: staff adds a booking from the dashboard ----------
app.post('/api/reservations', requireAuth, async (req, res) => {
  const { name, email, phone, partySize, reservationDate, reservationTime, notes } = req.body || {}

  if (!name || !String(name).trim() || !partySize || !reservationDate || !reservationTime) {
    return res.status(400).json({ error: 'Please add a name, party size, date and time.' })
  }
  if (email && !isValidEmail(email)) {
    return res.status(400).json({ error: 'Please enter a valid email address.' })
  }
  const partySizeNum = Number(partySize)
  if (!Number.isInteger(partySizeNum) || partySizeNum < 1 || partySizeNum > 30) {
    return res.status(400).json({ error: 'Please enter a valid party size.' })
  }

  const result = await req.tenant
    .prepare(
      `INSERT INTO reservations (name, email, phone, party_size, reservation_date, reservation_time, notes, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'confirmed') RETURNING id`
    )
    .run(
      String(name).trim(),
      email ? String(email).trim() : null,
      phone ? String(phone).trim() : '',
      partySizeNum,
      String(reservationDate),
      String(reservationTime),
      notes ? String(notes).trim() : null
    )

  return res.status(201).json({ ok: true, reservationId: result.lastInsertRowid })
})

// ---------- Reservations: set which table the party is on ----------
app.put('/api/reservations/:id/table', requireAuth, async (req, res) => {
  const label = String((req.body || {}).tableLabel || '').trim().slice(0, 20)
  const existing = await req.tenant.prepare('SELECT id FROM reservations WHERE id = ?').get(req.params.id)
  if (!existing) return res.status(404).json({ error: 'Reservation not found.' })

  await req.tenant
    .prepare('UPDATE reservations SET table_label = ? WHERE id = ?')
    .run(label || null, req.params.id)

  return res.json({ ok: true })
})

// ---------- Reservations: mark the visit as completed ----------
// Sets the booking to "completed". If the booking matches a guest on your list
// (same email, or same phone number), it also records a visit for them, which
// queues their thank-you email.
app.post('/api/reservations/:id/complete', requireAuth, async (req, res) => {
  const reservation = await req.tenant
    .prepare('SELECT id, email, phone, status FROM reservations WHERE id = ?')
    .get(req.params.id)
  if (!reservation) return res.status(404).json({ error: 'Reservation not found.' })
  if (reservation.status === 'completed') return res.json({ ok: true, recorded: false })

  let guest = null
  if (reservation.email) {
    guest = await req.tenant
      .prepare('SELECT id FROM guests WHERE LOWER(email) = LOWER(?) LIMIT 1')
      .get(reservation.email)
  }
  if (!guest && reservation.phone) {
    guest = await req.tenant.prepare('SELECT id FROM guests WHERE phone = ? LIMIT 1').get(reservation.phone)
  }

  await req.tenant.prepare("UPDATE reservations SET status = 'completed' WHERE id = ?").run(reservation.id)
  if (guest) await recordVisit(req.tenant, guest.id)

  return res.json({ ok: true, recorded: Boolean(guest) })
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
    .prepare(`SELECT id, name, email FROM guests WHERE id IN (${placeholders}) AND unsubscribed_at IS NULL`)
    .all(...guestIds)

  if (guests.length === 0) {
    return res.status(404).json({ error: 'No matching guests found.' })
  }

  try {
    const restaurantTransporter = makeRestaurantTransporter(restaurant)

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
// ---------- Marketing ----------
// Audiences are worked out here, on the server, so the numbers on screen and the
// guests who actually receive a campaign always match.
const AUDIENCES = [
  { key: 'second_visit', label: 'Second-visit invitations', blurb: 'Guests with one recorded visit, 3 to 30 days ago' },
  { key: 'regulars', label: 'Regulars to appreciate', blurb: '3 or more visits in the last 90 days' },
  { key: 'reconnect', label: 'Time to reconnect', blurb: 'Visited before, not in the last 30 days, and no booking ahead' },
  { key: 'new_members', label: 'New member welcomes', blurb: 'Joined in the last 7 days' },
  { key: 'everyone', label: 'Everyone on your list', blurb: 'All guests with an email who have not unsubscribed' },
]
const MAX_CAMPAIGN_RECIPIENTS = 500

const dbTime = (d) => d.toISOString().slice(0, 19).replace('T', ' ')
const unsubToken = (memberId, guestId) =>
  crypto.createHmac('sha256', process.env.JWT_SECRET || 'dev').update(`unsub:${memberId}:${guestId}`).digest('hex').slice(0, 32)

async function audienceMembers(folder) {
  const now = Date.now()
  const day = 86400000
  const guests = await folder
    .prepare(
      `SELECT g.id, g.name, g.email, g.created_at, g.unsubscribed_at,
         (SELECT COUNT(*)::int FROM visits v WHERE v.guest_id = g.id) AS visit_count,
         (SELECT MAX(visited_at) FROM visits v WHERE v.guest_id = g.id) AS last_visit,
         (SELECT COUNT(*)::int FROM visits v WHERE v.guest_id = g.id AND v.visited_at >= ?) AS visits_90,
         EXISTS (
           SELECT 1 FROM reservations r
           WHERE r.reservation_date >= ? AND r.status <> 'cancelled'
             AND ((g.email IS NOT NULL AND LOWER(r.email) = LOWER(g.email))
               OR (g.phone IS NOT NULL AND g.phone <> '' AND r.phone = g.phone))
         ) AS has_booking
       FROM guests g
       WHERE g.email IS NOT NULL AND g.email <> '' AND g.unsubscribed_at IS NULL`
    )
    .all(dbTime(new Date(now - 90 * day)), new Date(now).toISOString().slice(0, 10))

  const daysSince = (t) => (t ? (now - new Date(String(t).replace(' ', 'T') + 'Z').getTime()) / day : null)
  const out = Object.fromEntries(AUDIENCES.map((a) => [a.key, []]))
  for (const g of guests) {
    const d = daysSince(g.last_visit)
    const joined = daysSince(g.created_at)
    out.everyone.push(g)
    if (g.visit_count === 1 && d != null && d >= 3 && d <= 30) out.second_visit.push(g)
    if (g.visits_90 >= 3) out.regulars.push(g)
    if (g.visit_count >= 1 && d != null && d >= 30 && !g.has_booking) out.reconnect.push(g)
    if (joined != null && joined < 7) out.new_members.push(g)
  }
  return out
}

app.get('/api/marketing/overview', requireAuth, async (req, res) => {
  const members = await audienceMembers(req.tenant)
  const restaurant = await db.prepare('SELECT smtp_host, smtp_user, smtp_pass, google_review_url FROM members WHERE id = ?').get(req.memberId)

  const campaigns = await req.tenant
    .prepare('SELECT id, name, audience, subject, recipients_count, sent_count, status, created_at FROM campaigns ORDER BY id DESC LIMIT 20')
    .all()

  const queue = await req.tenant
    .prepare(
      `SELECT se.id, se.send_at, se.status, g.name
       FROM scheduled_emails se JOIN guests g ON g.id = se.guest_id
       ORDER BY se.id DESC LIMIT 12`
    )
    .all()

  return res.json({
    audiences: AUDIENCES.map((a) => ({ ...a, count: members[a.key].length })),
    campaigns,
    queue,
    emailReady: Boolean(restaurant?.smtp_host && restaurant?.smtp_user && restaurant?.smtp_pass),
    reviewLinkSet: Boolean(restaurant?.google_review_url),
  })
})

const campaignLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'You have sent several campaigns in the last hour. Please wait a little before sending another.' },
})

app.post('/api/marketing/campaigns', requireAuth, campaignLimiter, async (req, res) => {
  const { audience, subject, message, name } = req.body || {}

  if (!AUDIENCES.some((a) => a.key === audience)) {
    return res.status(400).json({ error: 'Please choose who this is for.' })
  }
  const cleanSubject = String(subject || '').trim()
  const cleanMessage = String(message || '').trim()
  if (!cleanSubject || !cleanMessage) {
    return res.status(400).json({ error: 'Please add a subject and a message.' })
  }
  if (cleanSubject.length > 150 || cleanMessage.length > 5000) {
    return res.status(400).json({ error: 'That subject or message is too long.' })
  }

  const restaurant = await db.prepare('SELECT * FROM members WHERE id = ?').get(req.memberId)
  if (!restaurant.smtp_host || !restaurant.smtp_user || !restaurant.smtp_pass) {
    return res.status(400).json({ error: 'Please set up your email in Settings before sending a campaign.' })
  }

  const busy = await req.tenant.prepare("SELECT id FROM campaigns WHERE status = 'sending' LIMIT 1").get()
  if (busy) {
    return res.status(409).json({ error: 'Another campaign is still sending. Please wait for it to finish.' })
  }

  const recipients = (await audienceMembers(req.tenant))[audience]
  if (recipients.length === 0) {
    return res.status(400).json({ error: 'There is nobody in this group right now.' })
  }
  if (recipients.length > MAX_CAMPAIGN_RECIPIENTS) {
    return res.status(400).json({ error: `This group has more than ${MAX_CAMPAIGN_RECIPIENTS} guests. Please contact us to send to a list this size.` })
  }

  const label = AUDIENCES.find((a) => a.key === audience).label
  const created = await req.tenant
    .prepare('INSERT INTO campaigns (name, audience, subject, body, recipients_count) VALUES (?, ?, ?, ?, ?) RETURNING id')
    .run(String(name || cleanSubject).slice(0, 120), audience, cleanSubject, cleanMessage, recipients.length)
  const campaignId = created.lastInsertRowid
  const folder = req.tenant

  // Send in the background so the page doesn't wait on a slow mail server.
  void (async () => {
    let sent = 0
    try {
      const transporter = makeRestaurantTransporter(restaurant)
      for (const g of recipients) {
        const first = String(g.name || '').split(' ')[0] || 'there'
        const body = cleanMessage.replace(/\{first_name\}/gi, first)
        const link = `${APP_URL()}/unsubscribe?r=${encodeURIComponent(restaurant.slug)}&g=${g.id}&t=${unsubToken(restaurant.id, g.id)}`
        try {
          await transporter.sendMail({
            from: restaurant.smtp_user,
            to: g.email,
            subject: cleanSubject.replace(/\{first_name\}/gi, first),
            text: `${body}\n\nWarmly,\n${restaurant.restaurant_name}\n\n--\nYou are receiving this because you joined the guest list at ${restaurant.restaurant_name}.\nTo stop receiving these emails: ${link}`,
            headers: { 'List-Unsubscribe': `<${link}>` },
          })
          sent += 1
        } catch (err) {
          console.error(`Campaign ${campaignId}: failed to email guest ${g.id}:`, err.message)
        }
        if (sent % 5 === 0) {
          await folder.prepare('UPDATE campaigns SET sent_count = ? WHERE id = ?').run(sent, campaignId)
        }
      }
    } catch (err) {
      console.error(`Campaign ${campaignId} failed:`, err)
    }
    const status = sent === recipients.length ? 'sent' : sent === 0 ? 'failed' : 'partly sent'
    try {
      await folder.prepare('UPDATE campaigns SET sent_count = ?, status = ? WHERE id = ?').run(sent, status, campaignId)
    } catch (err) {
      console.error(`Campaign ${campaignId}: could not save final status:`, err)
    }
  })()

  return res.status(202).json({ ok: true, campaignId, recipients: recipients.length })
})

// Guests click the link at the bottom of a campaign email. The page asks them to confirm, then calls this.
app.post('/api/public/unsubscribe', async (req, res) => {
  const { slug, guestId, token } = req.body || {}
  const gid = Number(guestId)
  if (!slug || !Number.isInteger(gid) || !token) {
    return res.status(400).json({ error: 'This link is not valid.' })
  }

  const restaurant = await db.prepare('SELECT * FROM members WHERE slug = ?').get(slug)
  if (!restaurant) return res.status(404).json({ error: 'This link is not valid.' })

  const expected = unsubToken(restaurant.id, gid)
  const given = String(token)
  const ok = given.length === expected.length && crypto.timingSafeEqual(Buffer.from(given), Buffer.from(expected))
  if (!ok) return res.status(400).json({ error: 'This link is not valid.' })

  await tenant(restaurant)
    .prepare('UPDATE guests SET unsubscribed_at = ? WHERE id = ? AND unsubscribed_at IS NULL')
    .run(dbTime(new Date()), gid)

  return res.json({ ok: true, restaurantName: restaurant.restaurant_name })
})

// ---------- Settings: send a test email using the details in the form ----------
const testEmailLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 12,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many test emails. Please wait a few minutes and try again.' },
})

app.post('/api/settings/test-email', requireAuth, testEmailLimiter, async (req, res) => {
  const { smtpHost, smtpPort, smtpUser, smtpPass } = req.body || {}
  if (!smtpHost || !smtpUser || !smtpPass) {
    return res.status(400).json({ error: 'Fill in your email address, password and mail server first.' })
  }
  if (!isValidEmail(String(smtpUser).trim())) {
    return res.status(400).json({ error: 'Your email address does not look right.' })
  }

  const creds = { smtp_host: smtpHost, smtp_port: smtpPort, smtp_user: smtpUser, smtp_pass: smtpPass }
  try {
    const t = makeRestaurantTransporter(creds)
    // Sent to the restaurant's own address, from its own address - nobody else is emailed.
    await t.sendMail({
      from: String(smtpUser).trim(),
      to: String(smtpUser).trim(),
      subject: 'Test email from your dynR dashboard',
      text: 'Your email is connected. Guests will now receive welcome emails, visit follow-ups and messages from this address.\n\nYou can ignore this email.',
    })
    return res.json({ ok: true, sentTo: String(smtpUser).trim() })
  } catch (err) {
    console.error('Settings test email failed:', err.code || '', err.message)
    return res.status(400).json({ error: explainMailError(err, smtpHost) })
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
      (smtpHost && String(smtpHost).trim()) || null,
      (smtpPort && String(smtpPort).trim()) || null,
      (smtpUser && String(smtpUser).trim()) || null,
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
          const restaurantTransporter = makeRestaurantTransporter(restaurant)

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
          const restaurantTransporter = makeRestaurantTransporter(restaurant)

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