import { Link } from "react-router-dom";
import { Accordion, FinalCta } from "../components/PageBits";

const FAQS = [
  {
    q: "What is dynR?",
    a: "dynR is a simple guest-relationship tool for independent restaurants. You get a private dashboard where you can see who your regulars are, note what they like, and reach out to them directly, without any technical setup.",
  },
  {
    q: "How do guests join?",
    a: "You get a QR code from your dashboard. Guests scan it and fill in a short sign-up form (name, birthday, email, phone), and they're added to your guest list. There's no app to download and no password for them to make.",
  },
  {
    q: "What does the membership cost?",
    a: "£79 a month, with your first 2 months free. You add your card when you register, nothing is charged for two months, and then £79 is taken automatically each month.",
  },
  {
    q: "Can I cancel?",
    a: "Yes, any time. You can cancel from Settings in your dashboard and you will not be charged again.",
  },
  {
    q: "Who sends emails to my guests?",
    a: "You do, from your own email address. You connect your restaurant's email account in Settings, and every welcome email, follow-up and message goes out under your name, not dynR's. Your guests never see dynR mentioned.",
  },
  {
    q: "What happens when I mark a guest as visited?",
    a: "A short, friendly thank-you email is automatically sent to that guest about an hour later, with a link to leave you a review if you've added your Google review link in Settings.",
  },
  {
    q: "Can guests book a table directly?",
    a: "Yes. Each restaurant gets its own reservation page, similar to your QR sign-up link. Bookings made there land straight in your dashboard, and you get an email the moment someone books.",
  },
  {
    q: "Will dynR guarantee more bookings or better reviews?",
    a: "No. dynR can't promise results, and we'd be wary of anyone who does. What it gives you is a simple way to remember your guests, stay in touch, and make it easy to book again or leave an honest review. What you do with it is up to you and your team.",
  },
  {
    q: "Is my guest list shared with other restaurants?",
    a: "No. Each restaurant's guests are kept in their own private space, separate from every other restaurant. Only your dashboard login can see your list. We don't share, sell or reuse your guest data.",
  },
  {
    q: "What do I need to set up?",
    a: "Your restaurant details and a card to start. Then connect your own email address in Settings (there's a step-by-step guide and a test button) and print your QR code for the table or door.",
  },
  {
    q: "Can I talk to someone before joining?",
    a: "Of course. Request a free 15-minute chat on the Contact page. There's no obligation to join.",
  },
];

export default function FAQ() {
  return (
    <div className="hm">
      <section className="hm-page-hero">
        <div className="hm-wrap">
          <p className="hm-eyebrow">FAQs</p>
          <h1>
            Good questions.
            <br />
            <span>Clear answers.</span>
          </h1>
          <p className="hm-lead">
            The essentials about dynR, membership and getting started. Need something else? <Link to="/contact" className="hm-inline">Talk to us.</Link>
          </p>
        </div>
      </section>

      <section className="hm-section hm-section-tight">
        <div className="hm-wrap hm-narrow">
          <Accordion items={FAQS} />
        </div>
      </section>

      <FinalCta />
    </div>
  );
}
