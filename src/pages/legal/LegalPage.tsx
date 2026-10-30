/**
 * @doc Public legal & company pages (terms, privacy, refund, contact, about).
 * These used to redirect to Chat, which is a soft-404 for crawlers and a dead
 * end for users who need policy information before paying. Content here is
 * factual and descriptive only — no invented guarantees or legal claims.
 */
import { Link, useLocation } from "react-router-dom";
import SEOHead from "@/components/common/SEOHead";

interface Section {
  heading: string;
  body: string[];
}

interface LegalDoc {
  path: string;
  title: string;
  description: string;
  intro: string;
  sections: Section[];
}

const SUPPORT_EMAIL = "@Torekr on Telegram";
const COMPANY = {
  name: "Megsy for Digital Platforms & E-Commerce Development LLC",
  address: "58 El-Hegaz Street, Amoun Tower, Unit 84, Floor 8, Sheraton Al-Matar, Cairo, Egypt",
  registration: "248691",
  tax: "774034785",
};

export const LEGAL_DOCS: Record<string, LegalDoc> = {
  terms: {
    path: "/terms",
    title: "Terms of Service",
    description:
      "The terms that apply when you use Megsy AI, including account rules, acceptable use, subscriptions and account termination.",
    intro:
      "These terms describe how Megsy AI may be used. By creating an account or using the service you agree to them.",
    sections: [
      {
        heading: "Your account",
        body: [
          "You need an account to use most of Megsy. You are responsible for keeping your credentials safe and for the activity that happens under your account.",
          "You must be legally able to enter into an agreement in your country to use the service.",
        ],
      },
      {
        heading: "Acceptable use",
        body: [
          "Do not use Megsy to break the law, to attack or overload the service, to bypass usage limits or billing, or to generate content that harms other people.",
          "Automated scraping, credential sharing, and reselling access without a written agreement are not permitted.",
        ],
      },
      {
        heading: "Plans, credits and usage limits",
        body: [
          "Paid plans include monthly usage allowances. Some features consume credits, and some models are limited to specific plans. Current limits are shown on the pricing page and inside your account.",
          "Limits are enforced by our servers. Attempting to circumvent them may result in suspension.",
        ],
      },
      {
        heading: "AI-generated content",
        body: [
          "Model output can be inaccurate or incomplete. Review results before relying on them, especially for legal, medical, financial or safety-critical decisions.",
          "You are responsible for how you use the output you generate.",
        ],
      },
      {
        heading: "Changes and termination",
        body: [
          "We may update the service and these terms. Material changes are announced in the app or by email.",
          "You may stop using Megsy and delete your account at any time from your account settings. We may suspend accounts that violate these terms.",
        ],
      },
      {
        heading: "Contact",
        body: [`Questions about these terms: ${SUPPORT_EMAIL}`],
      },
    ],
  },
  privacy: {
    path: "/privacy",
    title: "Privacy Policy",
    description:
      "How Megsy AI collects, uses, stores and protects your data, including chats, files, account information and third-party processors.",
    intro:
      "This page explains what data Megsy collects, why it is collected, and the control you have over it.",
    sections: [
      {
        heading: "Data we collect",
        body: [
          "Account data: email address, authentication identifiers, and profile details you provide.",
          "Product data: conversations, prompts, uploaded files, generated media, skills, memory entries and settings you create in the app.",
          "Technical data: request logs, usage counters, error reports and security events needed to operate and protect the service.",
          "Billing data: subscription status and transaction records. Card details are handled by our payment provider, not stored by Megsy.",
        ],
      },
      {
        heading: "How we use it",
        body: [
          "To deliver the features you request, apply plan limits and credits, provide support, detect abuse, and improve reliability and safety.",
        ],
      },
      {
        heading: "Processors and model providers",
        body: [
          "Prompts and files you submit may be sent to the AI model provider needed to fulfil the request, and to infrastructure providers used for hosting, storage, authentication and payments.",
          "Integrations you connect yourself (for example calendars or third-party tools) receive only the data required for the actions you trigger.",
        ],
      },
      {
        heading: "Retention and deletion",
        body: [
          "Stored conversations, files and account information support your ongoing use of the service. Deleting an item in the app may not immediately remove backup copies or records held by third-party providers.",
          `For access, correction or deletion requests, contact ${SUPPORT_EMAIL}. Billing and security records may need to be retained to meet applicable obligations. This policy does not promise a specific backup or provider retention period.`,
        ],
      },
      {
        heading: "Security",
        body: [
          "Access to your data is restricted per user at the database level, transport is encrypted, and privileged operations are authorised server-side.",
          "No system is perfectly secure. Report suspected vulnerabilities to " +
            SUPPORT_EMAIL +
            ".",
        ],
      },
      {
        heading: "Your rights",
        body: [
          `Depending on where you live you may request access, correction, export or deletion of your personal data. Contact ${SUPPORT_EMAIL}.`,
        ],
      },
    ],
  },
  refund: {
    path: "/refund",
    title: "Refund Policy",
    description:
      "How refunds, cancellations and billing issues are handled for Megsy AI subscriptions and credit purchases.",
    intro: "This page describes how cancellations and refund requests are handled.",
    sections: [
      {
        heading: "Cancelling a subscription",
        body: [
          `Use the subscription-management option available in your billing page, or contact ${SUPPORT_EMAIL} to request cancellation. Include your account email and order reference.`,
          "Cancellation and refund are separate requests. Check the renewal and end-of-access information shown for your purchase; a cancellation does not itself reverse an earlier payment.",
        ],
      },
      {
        heading: "Refund requests",
        body: [
          `Refund requests are reviewed case by case. Message ${SUPPORT_EMAIL} with the transaction date and the reason for the request.`,
          "Please identify duplicate or incorrect charges and paid features that were not delivered so we can investigate. Applicable statutory rights are not excluded by this policy.",
        ],
      },
      {
        heading: "Consumed usage",
        body: [
          "Consumed paid usage and the circumstances of a purchase are considered when reviewing a request, subject to applicable law. Free chat is not a paid purchase.",
        ],
      },
      {
        heading: "Processing",
        body: [
          "Approved refunds are returned through the original payment method by our payment provider. Bank processing time depends on your issuer.",
        ],
      },
    ],
  },
  about: {
    path: "/about",
    title: "About Megsy AI",
    description:
      "Megsy AI is an AI agent workspace for chat, deep research, image and video generation, documents, presentations, coding and connected tools.",
    intro:
      "Megsy AI brings chat, deep research, image and video generation, documents, presentations, coding and connected tools into one AI agent workspace.",
    sections: [
      {
        heading: "What Megsy does",
        body: [
          "Chat with modern AI models, run multi-step deep research with sources, generate images and video, build reusable skills, and connect tools through integrations — from one interface on desktop and mobile.",
        ],
      },
      {
        heading: "How it is built",
        body: [
          "Megsy runs on a modern web stack with a managed Postgres backend. Access control, usage limits and credit accounting are enforced on the server, not in the browser.",
        ],
      },
      {
        heading: "Contact",
        body: [`For support, partnerships or press: ${SUPPORT_EMAIL}`],
      },
    ],
  },
  contact: {
    path: "/contact",
    title: "Contact Megsy AI",
    description:
      "Get in touch with the Megsy AI team for support, billing questions, security reports or partnership enquiries.",
    intro: "Contact the Megsy team for account, payment, privacy or security questions.",
    sections: [
      {
        heading: "Support",
        body: [
          `General help, bugs and account issues: ${SUPPORT_EMAIL}`,
          "Include your account email and a description of what you expected versus what happened.",
        ],
      },
      {
        heading: "Billing",
        body: [
          `Subscription, invoice and refund questions: ${SUPPORT_EMAIL} — see the refund policy for what to include.`,
        ],
      },
      {
        heading: "Security",
        body: [
          `Report a suspected vulnerability to ${SUPPORT_EMAIL} with steps to reproduce. Please do not share details publicly before we respond.`,
        ],
      },
    ],
  },
};

const LegalPage = ({ slug }: { slug: keyof typeof LEGAL_DOCS }) => {
  const doc = LEGAL_DOCS[slug];
  const location = useLocation();
  const sections = [
    { heading: "Company and operator", body: [COMPANY.name, COMPANY.address, `Commercial registration: ${COMPANY.registration} · Tax registration: ${COMPANY.tax}`, `Support and privacy enquiries: ${SUPPORT_EMAIL}`] },
    ...doc.sections,
    ...(slug === "terms" ? [{ heading: "Egyptian law and consumer rights", body: ["Megsy is operated by an Egyptian company. These terms are subject to applicable Egyptian law, including mandatory consumer-protection and personal-data requirements. Nothing here excludes rights or remedies that cannot lawfully be excluded.", "AI output is not a substitute for professional advice. You must have permission to submit files and personal information, and must not use an agent to take actions you are not authorised to perform."] }] : []),
    ...(slug === "refund" ? [{ heading: "Payment methods", body: ["Checkout offers the payment methods available for your order, including mobile wallets such as Vodafone Cash in Egypt through Kashier. The amount, currency and purchase details shown before confirmation apply.", "Do not send passwords, full card numbers or wallet PINs to support. Keep your order reference and payment receipt."] }] : []),
  ];

  return (
    <>
      <SEOHead
        title={`${doc.title} — Megsy AI`}
        description={doc.description}
        path={doc.path || location.pathname}
      />
      <main className="megsy-legal" data-no-translate>
        <nav className="megsy-legal-nav" aria-label="Company navigation"><Link to="/landing" className="font-semibold">Megsy AI</Link><Link to="/chat">Workspace</Link><Link to="/pricing">Plans</Link><a href="https://t.me/Torekr">Support</a></nav>
        <div className="megsy-legal-layout">
          <aside className="megsy-legal-aside" aria-label="Policies">{Object.entries(LEGAL_DOCS).map(([key, item]) => <Link key={key} to={item.path} aria-current={key === slug ? "page" : undefined}>{item.title}</Link>)}</aside>
          <article>
          <header className="mb-10">
            <p className="megsy-public-kicker mb-4">COMPANY & POLICIES · EGYPT</p>
            <h1>{doc.title}</h1>
            <p className="mt-3 text-base leading-relaxed text-muted-foreground">{doc.intro}</p>
            <p className="mt-5 text-xs text-muted-foreground">Last updated October 6, 2026</p>
          </header>

          <div className="megsy-legal-body">
            {sections.map((section) => (
              <section key={section.heading}>
                <h2 className="text-lg font-semibold tracking-tight">{section.heading}</h2>
                <div className="mt-3 space-y-3">
                  {section.body.map((paragraph) => (
                    <p key={paragraph} className="text-sm leading-relaxed text-muted-foreground">
                      {paragraph}
                    </p>
                  ))}
                </div>
              </section>
            ))}
          </div>

          <footer className="mt-14 border-t border-border pt-6 text-xs text-muted-foreground">
            <div className="flex flex-wrap gap-x-5 gap-y-2">
              <Link className="hover:text-foreground" to="/terms">
                Terms
              </Link>
              <Link className="hover:text-foreground" to="/privacy">
                Privacy
              </Link>
              <Link className="hover:text-foreground" to="/refund">
                Refunds
              </Link>
              <Link className="hover:text-foreground" to="/contact">
                Contact
              </Link>
              <Link className="hover:text-foreground" to="/about">
                About
              </Link>
              <Link className="hover:text-foreground" to="/pricing">
                Pricing
              </Link>
            </div>
          </footer>
          </article>
        </div>
      </main>
    </>
  );
};

export default LegalPage;
