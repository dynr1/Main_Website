import { useState } from "react";

const faqs = [
  {
    q: "What is dynR?",
    a: "dynR is a simple guest-relationship tool for independent restaurants. You get a private dashboard where you can see who your regulars are, note what they like, and reach out to them directly — all without any technical setup.",
  },
  {
    q: "How do guests join?",
    a: "You get a QR code from your dashboard. Guests scan it, fill in a short sign-up form (name, birthday, email, phone), and they're instantly added to your guest list — no app download, no password required on their end.",
  },
  {
    q: "Do guests need to download an app?",
    a: "No. The sign-up page and everything guests interact with runs in their phone's browser. There's nothing to install.",
  },
  {
    q: "Who sends the emails to my guests?",
    a: "You do — from your own email address. You connect your restaurant's own email account in Settings, and every welcome email, visit follow-up, and message goes out under your name, not dynR's. Your guests never see dynR mentioned anywhere.",
  },
  {
    q: "What happens when I mark a guest as visited?",
    a: "A short, friendly thank-you email is automatically sent to that guest about an hour later, along with a one-click link to leave you a review — if you've added your Google review link in Settings.",
  },
  {
    q: "Can guests book a table through dynR?",
    a: "Yes. Each restaurant gets its own reservation page, similar to your QR sign-up link. Reservations made there land straight in your dashboard, and you get an email notification the moment someone books.",
  },
  {
    q: "Is my guest data safe?",
    a: "Your guest list is private to your restaurant — only your dashboard login can see it. We don't share, sell, or use your guest data for anything else.",
  },
  {
    q: "How do I get started?",
    a: "Get in touch through the Contact page for a free 15-minute chat. We'll set your restaurant up with a dashboard login and walk you through generating your first QR code.",
  },
];

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState(0);

  return (
    <section>
      <div className="container center-block">
        <span className="eyebrow">FAQ</span>
        <h1>Frequently asked questions</h1>
        <p style={{ marginTop: "24px" }}>
          Everything you need to know about how dynR works. Can't find your
          answer here?{" "}
          <a href="/contact" className="link-cta">
            Get in touch
          </a>
          .
        </p>
      </div>

      <div className="container content-block faq-list">
        {faqs.map((item, i) => (
          <div
            key={item.q}
            className={`faq-item ${openIndex === i ? "is-open" : ""}`}
          >
            <button
              type="button"
              className="faq-question"
              onClick={() => setOpenIndex(openIndex === i ? -1 : i)}
              aria-expanded={openIndex === i}
            >
              <span>{item.q}</span>
              <span className="faq-icon">{openIndex === i ? "−" : "+"}</span>
            </button>
            {openIndex === i && <p className="faq-answer">{item.a}</p>}
          </div>
        ))}
      </div>
    </section>
  );
}