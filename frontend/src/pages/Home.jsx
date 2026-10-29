import { useState } from 'react'
import { Link } from 'react-router-dom'

const PRICE = '£79'

const TRUST = ['No guest app needed', 'Your own guest list', 'Emails from your address', 'Cancel anytime']

const PILLARS = [
  { n: '01', k: 'Repeat guests', t: 'Give them a reason to return.', d: 'Remember preferences and keep the connection going with thoughtful thank-yous and birthday messages.' },
  { n: '02', k: 'Google reviews', t: 'Let great experiences be heard.', d: 'Invite honest reviews so future diners can hear from the guests who have already sat at your tables.' },
  { n: '03', k: 'Direct reservations', t: 'Make the next booking easy.', d: 'Give guests your own booking page, with reservations arriving directly in your dynR dashboard.' },
]

const FEATURES = [
  { i: '▣', t: 'QR guest signups', d: 'Give guests a simple way to join your guest list. One scan, no app to download.' },
  { i: '◍', t: 'Guest profiles', d: 'Keep visits, preferences and notes together so your whole team can offer a more personal welcome.' },
  { i: '✦', t: 'Google review invitations', d: 'Help guests share an honest review. Make it easier for future diners to hear about their experience.' },
  { i: '▤', t: 'Direct reservations', d: 'Give guests your own booking page, with reservations arriving in your dashboard.' },
  { i: '↗', t: 'Automatic follow-ups', d: 'Keep the connection going with post-visit thank-yous and birthday messages from your own email address.' },
  { i: '◇', t: 'Your own private space', d: "Keep your restaurant's guest information separate from other restaurants." },
]

const STEPS = [
  { t: 'Join dynR', d: `Add your restaurant details and card. Nothing is charged for two months.` },
  { t: 'Make it yours', d: 'Get your login by email and configure your email settings.' },
  { t: 'Invite your guests', d: 'Print your QR code and put it where guests can easily find it.' },
  { t: 'Build the relationship', d: 'Get to know your guests, welcome bookings and keep in touch.' },
]

const INCLUDED = ['QR guest signups', 'Guest profiles', 'Google review invitations', 'Direct reservations', 'Automatic follow-ups', 'Your own private space']

const FAQS = [
  { q: 'What does the membership cost?', a: `The first two months are free. After that it is ${PRICE} a month, taken automatically from the card you add when you join.` },
  { q: 'Can I cancel?', a: 'Yes, any time. You can cancel from your Settings page, and you will not be charged again.' },
  { q: 'How do guests join?', a: 'They scan your QR code and fill in a short form. There is no app to download.' },
]

function GuestCard() {
  const [tab, setTab] = useState(0)
  const tabs = [
    { k: 'Guest profile', head: 'A familiar face.', sub: 'The little details make a big difference.', body: 'profile' },
    { k: 'Reservation', head: 'A table, ready.', sub: 'Bookings arrive in your dashboard.', body: 'booking' },
    { k: 'Follow-up', head: 'A warm thank-you.', sub: 'Sent from your own email address.', body: 'follow' },
  ]
  const t = tabs[tab]
  return (
    <div className="hm-demo" aria-label="Illustrative example of a guest profile">
      <div className="hm-demo-top"><span>Hospitality, with a memory.</span><span>Concept demo</span></div>
      <div className="hm-demo-card">
        <div className="hm-demo-brand"><b>dyn<em>R</em></b><small>Your restaurant</small></div>
        <h3>{t.head}</h3>
        <p className="hm-demo-sub">{t.sub}</p>

        {t.body === 'profile' && (<>
          <div className="hm-demo-guest">
            <span className="hm-avatar">AJ</span>
            <div><b>Alex Johnson</b><small>Illustrative guest profile</small></div>
          </div>
          <div className="hm-chips"><span>Window table</span><span>Birthday in October</span></div>
          <div className="hm-note"><small>A note for the team</small><p>Enjoys a quiet table by the window.</p><p>A warm welcome starts with remembering.</p></div>
        </>)}
        {t.body === 'booking' && (<>
          <div className="hm-demo-guest">
            <span className="hm-avatar">AJ</span>
            <div><b>Alex Johnson</b><small>Booking request</small></div>
          </div>
          <div className="hm-chips"><span>Friday</span><span>7:30 pm</span><span>Table for 2</span></div>
          <div className="hm-note"><small>Arrives in your dashboard</small><p>Confirm it, and your guest gets a message from your own email address.</p></div>
        </>)}
        {t.body === 'follow' && (<>
          <div className="hm-demo-guest">
            <span className="hm-avatar">AJ</span>
            <div><b>Alex Johnson</b><small>The day after their visit</small></div>
          </div>
          <div className="hm-note"><small>Thank-you message</small><p>"Thank you for joining us last night. We hope to see you again soon."</p></div>
        </>)}

        <div className="hm-tabs" role="tablist">
          {tabs.map((x, i) => (
            <button key={x.k} role="tab" aria-selected={tab === i} className={tab === i ? 'on' : ''} onClick={() => setTab(i)}>{x.k}</button>
          ))}
        </div>
      </div>
      <div className="hm-demo-foot">
        <b>From first hello to "the usual, please".</b>
        <span>Give good hospitality a way to follow through.</span>
      </div>
      <p className="hm-demo-cap">Illustrative screens and guest details.</p>
    </div>
  )
}

export default function Home() {
  const [open, setOpen] = useState(0)
  return (
    <div className="hm">
      {/* HERO */}
      <section className="hm-hero">
        <div className="hm-wrap hm-hero-grid">
          <div>
            <p className="hm-eyebrow">For independent restaurants</p>
            <h1>First-time guests.<br /><span>Future regulars.</span></h1>
            <p className="hm-lead">You make the visit special. dynR helps you remember your guests, stay in touch and give them a reason to come back.</p>
            <div className="hm-cta-row">
              <Link to="/register-as-member" className="hm-btn hm-btn-primary">Start my 2 months free <i>↗</i></Link>
              <Link to="/contact" className="hm-btn hm-btn-ghost">Request a 15-minute chat</Link>
            </div>
            <p className="hm-fine">Card required. Nothing charged for two months, then {PRICE}/month automatically. Cancel anytime.</p>
          </div>
          <GuestCard />
        </div>
      </section>

      {/* TRUST ROW */}
      <section className="hm-trust">
        <div className="hm-wrap hm-trust-row">
          {TRUST.map(t => <span key={t}><i>✓</i>{t}</span>)}
        </div>
      </section>

      {/* DARK PILLARS */}
      <section className="hm-dark">
        <div className="hm-wrap">
          <p className="hm-eyebrow">A good visit is just the beginning</p>
          <h2>More than a table filled.<br />A relationship started.</h2>
          <div className="hm-pillars">
            {PILLARS.map(p => (
              <div key={p.n} className="hm-pillar">
                <small>{p.n} / {p.k}</small>
                <h3>{p.t}</h3>
                <p>{p.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="hm-section">
        <div className="hm-wrap">
          <div className="hm-split-head">
            <div>
              <p className="hm-eyebrow">Simple tools. Personal hospitality.</p>
              <h2>Get to know your guests.<br />Keep the connection.</h2>
            </div>
            <div className="hm-split-side">
              <p>Bring your guest relationships together, from the first scan to the next visit.</p>
              <Link to="/what-we-do" className="hm-link">Explore the platform <i>↗</i></Link>
            </div>
          </div>
          <div className="hm-features">
            {FEATURES.map(f => (
              <div key={f.t} className="hm-feature">
                <span className="hm-ico" aria-hidden="true">{f.i}</span>
                <h3>{f.t}</h3>
                <p>{f.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="hm-tint">
        <div className="hm-wrap">
          <p className="hm-eyebrow">How it works</p>
          <h2>Start with your next guest.</h2>
          <ol className="hm-steps">
            {STEPS.map((s, i) => (
              <li key={s.t}>
                <small>{String(i + 1).padStart(2, '0')}</small>
                <h3>{s.t}</h3>
                <p>{s.d}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* PRICING */}
      <section className="hm-section">
        <div className="hm-wrap hm-price-grid">
          <div>
            <p className="hm-eyebrow">One simple membership</p>
            <h2>Try it in your restaurant.<br />See how it fits.</h2>
            <p className="hm-lead">Two months to explore dynR with your own guests before your first payment. A practical way to decide if it belongs in your service.</p>
            <Link to="/membership" className="hm-link">See membership details <i>↗</i></Link>
          </div>
          <div className="hm-price-card">
            <div className="hm-price-top"><span>dynR membership</span><span>2 months free</span></div>
            <div className="hm-price-body">
              <p className="hm-eyebrow">Then one simple price</p>
              <p className="hm-price"><b>{PRICE}</b> / month</p>
              <p className="hm-price-sub">Your tools for lasting guest relationships.</p>
              <ul>{INCLUDED.map(x => <li key={x}><i>✓</i>{x}</li>)}</ul>
              <Link to="/register-as-member" className="hm-btn hm-btn-primary hm-btn-block">Start my 2 months free <i>↗</i></Link>
              <p className="hm-fine">Card required. Nothing charged for two months, then {PRICE}/month automatically. Cancel anytime.</p>
            </div>
          </div>
        </div>
      </section>

      {/* STORY */}
      <section className="hm-section hm-story">
        <div className="hm-wrap hm-story-grid">
          <div>
            <p className="hm-eyebrow">Built around hospitality</p>
            <h2>The best welcome<br />feels familiar.</h2>
            <p className="hm-lead">dynR grew out of experience on restaurant floors and one simple question: how do we help guests feel remembered, whoever is on shift?</p>
            <Link to="/our-story" className="hm-link">Read our story <i>↗</i></Link>
          </div>
          <blockquote>
            <p>“It’s lovely to see you again.”</p>
            <small>A simple welcome. The feeling dynR is built to support.</small>
          </blockquote>
        </div>
      </section>

      {/* FAQ */}
      <section className="hm-tint">
        <div className="hm-wrap hm-faq-grid">
          <div>
            <p className="hm-eyebrow">Before you join</p>
            <h2>A few good questions.</h2>
            <Link to="/faq" className="hm-link">Read all FAQs <i>↗</i></Link>
          </div>
          <div className="hm-faq">
            {FAQS.map((f, i) => (
              <div key={f.q} className={'hm-faq-item' + (open === i ? ' open' : '')}>
                <button aria-expanded={open === i} onClick={() => setOpen(open === i ? -1 : i)}>
                  <span>{f.q}</span><i>{open === i ? '–' : '+'}</i>
                </button>
                {open === i && <p>{f.a}</p>}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="hm-dark hm-final">
        <div className="hm-wrap hm-final-grid">
          <div>
            <h2>Make the next visit<br />feel like a welcome back.</h2>
            <p className="hm-lead">Start with your next guest. Build the relationship from there.</p>
          </div>
          <div>
            <Link to="/register-as-member" className="hm-btn hm-btn-primary">Start my 2 months free <i>↗</i></Link>
            <p className="hm-fine">Card required. Nothing charged for two months, then {PRICE}/month automatically. Cancel anytime.</p>
          </div>
        </div>
      </section>
    </div>
  )
}
