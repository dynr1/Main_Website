import { Link } from "react-router-dom";

// Fill these in when you have them; they only show once set.
const COMPANY_NAME = "dynR";
const COMPANY_DETAILS = ""; // e.g. "Registered in England and Wales, company no. 12345678, 1 Example Street, London"
const UPDATED = "19 October 2026";
const EMAIL = "hello@dynr.co.uk";

function Page({ title, children }) {
  return (
    <section className="legal">
      <div className="container content-block">
        <h1>{title}</h1>
        <p className="legal-updated">Last updated {UPDATED}</p>
        {children}
        <h2>Contact</h2>
        <p>
          {COMPANY_NAME}
          {COMPANY_DETAILS ? `, ${COMPANY_DETAILS}` : ""}. Email{" "}
          <a href={`mailto:${EMAIL}`}>{EMAIL}</a>.
        </p>
      </div>
    </section>
  );
}

export function Privacy() {
  return (
    <Page title="Privacy policy">
      <p>
        This policy explains what personal information dynR collects, why, and
        what your rights are. dynR is a platform that restaurants use to manage
        their own guests, so there are two groups of people whose information
        we handle: restaurants that use dynR, and the guests of those
        restaurants.
      </p>

      <h2>Restaurants that use dynR</h2>
      <p>
        For restaurant accounts, dynR is the controller of the information
        below.
      </p>
      <ul>
        <li>Restaurant name, contact email and phone number.</li>
        <li>
          Your dashboard password, which we store scrambled (hashed), so
          nobody at dynR can read it.
        </li>
        <li>
          Billing details. Card payments are handled by Stripe. We never see or
          store your full card number.
        </li>
        <li>Email settings you give us so messages can be sent from your own address.</li>
      </ul>
      <p>
        We use this to create and run your account, take payment, send you
        account and security emails, give support, and keep the service safe.
      </p>

      <h2>Guests of a restaurant</h2>
      <p>
        When a guest joins a restaurant's list or books a table, the restaurant
        decides what is collected and why. The restaurant is the controller and
        dynR is its processor, acting only on the restaurant's instructions. The
        information can include a guest's name, email, phone number, birthday
        (day and month), reservation details, visit history and notes the
        restaurant adds. If you are a guest and want to see, correct or delete
        your information, please contact the restaurant first. We will help
        them respond.
      </p>
      <p>
        Emails to guests are sent from the restaurant's own email account, not
        from dynR.
      </p>

      <h2>Who we share information with</h2>
      <p>
        We do not sell personal information. We use trusted providers to run
        the service, who handle information only for that purpose: Stripe
        (payments), our hosting provider, our database provider, and email
        providers. Each restaurant's guest information is kept in its own
        protected area of our database, separate from every other restaurant.
      </p>

      <h2>How long we keep it</h2>
      <p>
        We keep information while an account is active. When a restaurant
        closes its account we delete or anonymise its information, except
        records we must keep by law, such as billing records.
      </p>

      <h2>Security</h2>
      <p>
        Passwords are hashed, connections are encrypted, and each restaurant
        can only reach its own guests' information. No system is perfectly
        secure, so if you notice anything wrong please tell us straight away.
      </p>

      <h2>Cookies</h2>
      <p>
        We do not currently use advertising or analytics cookies. Your browser
        keeps a sign-in session while you are logged in to your dashboard.
      </p>

      <h2>Your rights</h2>
      <p>
        Under UK data protection law you can ask to see the information we hold
        about you, correct it, delete it, restrict or object to how it is used,
        and ask for a copy you can move elsewhere. Email us and we will
        respond within one month. You can also complain to the Information
        Commissioner's Office at{" "}
        <a href="https://ico.org.uk" target="_blank" rel="noreferrer">
          ico.org.uk
        </a>
        .
      </p>

      <h2>Changes</h2>
      <p>
        If we change this policy we will update the date above and, for
        important changes, tell restaurants by email.
      </p>
    </Page>
  );
}

export function Terms() {
  return (
    <Page title="Terms of service">
      <p>
        These terms apply when a restaurant or other business signs up to use
        dynR. By registering you agree to them. If you have questions first,{" "}
        <Link to="/contact">get in touch</Link>.
      </p>

      <h2>The service</h2>
      <p>
        dynR gives restaurants tools to collect guest sign-ups by QR code,
        keep guest profiles and notes, take table reservations, and send
        follow-up emails. We work to keep it available and to improve it over
        time, but we cannot promise it will never be interrupted.
      </p>

      <h2>Membership and payment</h2>
      <ul>
        <li>Membership costs £79 per month.</li>
        <li>
          Your first 2 months are free. You add your card when you register,
          and nothing is charged until the free period ends.
        </li>
        <li>
          After that, £79 is taken automatically each month by Stripe until you
          cancel.
        </li>
        <li>
          You can cancel any time from Settings in your dashboard (Manage or
          cancel subscription). Cancelling stops future payments.
        </li>
        <li>
          If you think you have been charged in error, email us and we will
          look into it.
        </li>
      </ul>

      <h2>Your responsibilities</h2>
      <ul>
        <li>Give accurate details and keep your login secure.</li>
        <li>
          You are responsible for your guests' information. You must have a
          lawful reason to collect it, tell guests how you use it, and have
          their permission before sending marketing emails.
        </li>
        <li>
          Use the service lawfully, and do not use it to send spam or anything
          misleading or harmful.
        </li>
        <li>
          Emails to your guests are sent from your own email account. You are
          responsible for that account and for what is sent from it.
        </li>
      </ul>

      <h2>Your information</h2>
      <p>
        Your guest information stays yours. We use it only to provide the
        service to you, as described in our{" "}
        <Link to="/privacy">privacy policy</Link>.
      </p>

      <h2>Liability</h2>
      <p>
        We provide the service with reasonable care and skill. To the extent
        the law allows, we are not liable for indirect or lost-profit losses
        arising from using it. Nothing in these terms limits liability that
        cannot legally be limited.
      </p>

      <h2>Ending your membership</h2>
      <p>
        You can stop using dynR whenever you like. We may suspend or end an
        account that breaks these terms, and will tell you why.
      </p>

      <h2>Changes and governing law</h2>
      <p>
        We may update these terms and will tell restaurants by email about
        important changes. These terms are governed by the laws of England and
        Wales.
      </p>
    </Page>
  );
}
