# dynR — Website Rebuild

Rebuilt from the Framer site (dynr.framer.website) as a React + Vite frontend
with an Express backend handling the contact form.

## Structure

```
dynr/
├── frontend/   React + Vite site
└── backend/    Express API (contact form -> email)
```

## Run locally

**1. Backend**
```bash
cd backend
cp .env.example .env   # fill in your SMTP credentials
npm install
npm run dev             # http://localhost:4000
```

**2. Frontend** (in a second terminal)
```bash
cd frontend
npm install
npm run dev              # http://localhost:5173
```

The Vite dev server proxies `/api/*` requests to the backend (see
`frontend/vite.config.js`), so the contact form works out of the box in dev.

## Contact form / email setup

The backend sends form submissions via SMTP using `nodemailer`. You'll need
an SMTP provider — any of these work well:

- **Resend** (resend.com) — simple API, good free tier
- **Postmark**
- **SendGrid**
- A Gmail account with an "app password" (fine for low volume/testing)

Fill in `backend/.env`:
```
SMTP_HOST=...
SMTP_PORT=587
SMTP_USER=...
SMTP_PASS=...
MAIL_TO=hello@dynr.co.uk
```

## Deploying

**Frontend**: `npm run build` in `frontend/` produces a static `dist/`
folder — deploy it to Vercel, Netlify, or Cloudflare Pages.

**Backend**: deploy `backend/` to Render, Railway, or Fly.io (anywhere that
runs a persistent Node process). Set the same environment variables from
`.env.example` in your host's dashboard.

Once both are deployed, update `frontend/vite.config.js`'s proxy (dev only)
is not used in production — instead, point the frontend's fetch call in
`src/components/ContactSection.jsx` at your deployed backend URL, or put
both behind the same domain using a reverse proxy / rewrite rule so `/api`
routes to the backend.

## Notes

- Content and copy currently match the original Framer site (duplicate
  blocks and typos from the Framer export were cleaned up).
- Marketing improvements (social proof, product screenshot, "how it works"
  section, SEO metadata) were discussed separately and are not yet
  implemented — happy to build those next.
