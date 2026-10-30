/** @doc Security overview — sessions, MFA, recovery codes. */
// Security — Amber/Gold "The Vault" redesign.
import { m as motion } from "framer-motion";
import LandingNavbar from "@/components/landing/LandingNavbar";
import { lazy, Suspense } from "react";
import { LazyOnVisible } from "@/components/common/LazyOnVisible";
const LandingFooter = lazy(() => import("@/components/landing/LandingFooter"));
import SEOHead from "@/components/common/SEOHead";
import {
  Lock,
  Server,
  Eye,
  FileCheck,
  AlertTriangle,
  Globe,
  Key,
  Shield,
  ShieldCheck,
} from "lucide-react";

const practices = [
  {
    icon: Lock,
    title: "Encryption",
    desc: "Connections use HTTPS/TLS. Sensitive operations are routed through authenticated server boundaries; exact provider-level encryption details depend on the infrastructure provider.",
  },
  {
    icon: Server,
    title: "Infrastructure",
    desc: "Megsy uses managed hosting, database, storage and authentication providers. Availability, backups and residency follow the commitments published by those providers and the active service configuration.",
  },
  {
    icon: Key,
    title: "Authentication",
    desc: "Authentication is handled through the configured identity provider, with session checks and protected application routes. Available MFA options depend on the account configuration.",
  },
  {
    icon: Eye,
    title: "Access control",
    desc: "Row-level ownership checks and server-side authorization protect account data. Sensitive actions are kept behind authenticated API boundaries.",
  },
  {
    icon: FileCheck,
    title: "Compliance",
    desc: "Privacy rights, retention and deletion choices are described in the Privacy Policy. Regulatory suitability depends on the user, region, vendors and processing context; contact us for a data request.",
  },
  {
    icon: AlertTriangle,
    title: "Incident response",
    desc: "Please report suspected vulnerabilities promptly. We investigate reports, limit exposure where possible and communicate material incidents according to applicable obligations.",
  },
  {
    icon: Globe,
    title: "Data residency",
    desc: "You can export or delete available product data from Settings. Some billing, fraud-prevention and security records may be retained when required by law or legitimate operational needs.",
  },
  {
    icon: Shield,
    title: "Responsible AI",
    desc: "AI output can be inaccurate or unsafe. Review generated content before relying on it, and report harmful or unexpected behavior through the support or security contact.",
  },
];

const SecurityPage = () => (
  <div className="amber-settings min-h-dvh">
    <SEOHead
      title="Security"
      description="Learn how Megsy AI protects your account, chats, files and AI workflows with secure access, data controls and privacy-focused infrastructure."
      path="/security"
    />
    <LandingNavbar />

    <section>
      <section className="max-w-5xl mx-auto px-5 pt-24 pb-10">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55 }}
          className="amb-hero"
        >
          <div className="amb-hero-inner flex flex-col items-center text-center">
            <div className="amb-emblem">
              <ShieldCheck className="w-7 h-7" strokeWidth={2.2} />
            </div>
            <p className="amb-eyebrow text-[13px]">The Vault</p>
            <h1 className="amb-display text-4xl sm:text-6xl leading-[1.02] font-semibold mt-2">
              Security & <span className="amb-gold-text italic">Trust.</span>
            </h1>
            <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-[color:var(--amb-cream-dim)]">
              Your data security is foundational to everything we build. Here's how we protect your
              creative work and personal information.
            </p>
            <div className="amb-rule w-40 mt-6" />
          </div>
        </motion.div>
      </section>

      <section className="max-w-5xl mx-auto px-5 pb-20">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {practices.map((p, i) => (
            <motion.div
              key={p.title}
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ delay: i * 0.04 }}
              className="amb-plate p-6"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="amb-icon-capsule">
                  <p.icon className="w-5 h-5" strokeWidth={2} />
                </div>
                <h2 className="amb-display text-lg font-semibold text-[color:var(--amb-cream)]">
                  {p.title}
                </h2>
              </div>
              <p className="text-[14px] leading-relaxed text-[color:var(--amb-cream-dim)]">
                {p.desc}
              </p>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-10 amb-plate-strong p-8 text-center"
        >
          <p className="amb-mono mb-2">Coordinated disclosure</p>
          <h2 className="amb-display text-2xl font-semibold mb-2 text-[color:var(--amb-cream)]">
            Report a <span className="amb-gold-text italic">vulnerability</span>
          </h2>
          <p className="text-[13.5px] mb-5 text-[color:var(--amb-cream-dim)]">
            If you discover a vulnerability, please report it responsibly.
          </p>
          <a href="https://t.me/Torekr" className="amb-btn-gold">
            @Torekr on Telegram
          </a>
        </motion.div>
      </section>
    </section>

    <LazyOnVisible minHeight={320} rootMargin="600px">
      <Suspense fallback={<div style={{ minHeight: 320 }} />}>
        <LandingFooter />
      </Suspense>
    </LazyOnVisible>
  </div>
);

export default SecurityPage;
