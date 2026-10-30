/** @doc Help Center — glass sheet: search box, accordion FAQ sections. */
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronDown, Search } from "lucide-react";
import { goBackOr } from "@/lib/navigation";

const sections = [
  {
    title: "Getting started",
    items: [
      { q: "What is Megsy?", a: "Megsy is an all-in-one AI creative platform — chat, images, videos, websites/code, presentations, and file analysis, all running on Megsy Credits (MC)." },
      { q: "How do credits (MC) work?", a: "Every action consumes MC. Chat costs 1 MC, images start at 2 MC, videos at 8 MC, and Build projects vary by complexity. Your balance is shown in Settings → Billing." },
      { q: "How do I sign in?", a: "Go to /auth and sign in with email or Google. Forgot your password? Use the recovery link on the login screen." },
      { q: "Free vs paid plans", a: "Free includes a starter credit allowance. Paid plans (Starter, Pro, Elite, Enterprise) add monthly MC, faster models, and team features. Compare at /pricing." },
    ],
  },
  {
    title: "Chat",
    items: [
      { q: "How do I start a chat?", a: "Open /chat and type your prompt. You can attach files, enable web search, switch models, and pick agents from the composer." },
      { q: "Can Megsy remember things about me?", a: "Yes — important details are saved in Memory. Manage them from Settings → Memory." },
      { q: "How do I share a conversation?", a: "Open any chat → menu → Share. A read-only public link is created. You can revoke it anytime." },
      { q: "What is Deep Research?", a: "An agent that runs multi-source web research and returns a structured report with citations." },
      { q: "What is Slides mode?", a: "Generates a full editable presentation from a prompt. Export to PPTX from the slide deck view." },
    ],
  },
  {
    title: "Images & Video",
    items: [
      { q: "How do I generate an image?", a: "Open Media → Image Studio, pick a model, write your prompt, choose ratio and quality, then generate." },
      { q: "How do I generate a video?", a: "Open Media → Video Studio, pick a model, optionally upload a starting image, write your prompt, and generate." },
      { q: "What is Lip Sync?", a: "Upload a portrait video and an audio file, and Megsy syncs the mouth movements to the audio." },
      { q: "Can I edit a generated image?", a: "Yes — open the image and use the edit tools (inpaint, upscale, background remove). Each edit costs MC." },
      { q: "Where are my generations saved?", a: "Everything you generate lives in your Library, scoped to your account or active workspace." },
    ],
  },
  {
    title: "Build (websites & apps)",
    items: [
      { q: "How do I start a project?", a: "Open /build, describe what you want, and Megsy scaffolds a working project you can iterate on with chat." },
      { q: "Can I preview my project?", a: "Yes — every project has a live preview pane that updates as the AI edits files." },
      { q: "How do I publish a project?", a: "Open the project → Publish. You get a free megsy.app subdomain, or connect a custom domain from project Settings." },
      { q: "Can I connect a database?", a: "Yes — projects can use Lovable Cloud for auth, database, storage, and edge functions." },
    ],
  },
  {
    title: "Billing & Plans",
    items: [
      { q: "How do I buy credits?", a: "Settings → Billing → Buy credits. You can pay with card or supported local methods." },
      { q: "How do I upgrade my plan?", a: "Visit /pricing and choose a plan. Upgrades take effect immediately and unused credits roll over." },
      { q: "How do I cancel?", a: "Settings → Billing → Manage subscription → Cancel. You keep access until the end of the billing period." },
      { q: "Do you offer refunds?", a: "Yes within 14 days for unused credits. Contact our team from Help & Support → Write to a human." },
    ],
  },
  {
    title: "Settings & Privacy",
    items: [
      { q: "Where do I change my email or password?", a: "Settings → Account → Change email / Change password." },
      { q: "How do I delete my account?", a: "Settings → Account → Delete account. This is irreversible and wipes all personal data within 30 days." },
      { q: "Is my data used for training?", a: "No. Your prompts and outputs are never used to train models." },
      { q: "How do I enable two-factor auth?", a: "Settings → Account → Security → Enable 2FA. Use any TOTP app like 1Password or Authy." },
    ],
  },
  {
    title: "Troubleshooting",
    items: [
      { q: "A generation failed — am I charged?", a: "No. Failed generations are automatically refunded within a few minutes." },
      { q: "The app feels slow", a: "If something feels broken, message @Torekr on Telegram. Try a hard refresh, then sign out and back in." },
      { q: "I can't sign in", a: "Use the password reset link, check for typos in your email, and make sure cookies aren't blocked." },
      { q: "Where do I report a bug?", a: "Help & Support → Write to a human. Include screenshots and the URL where it happened." },
    ],
  },
];

/* Page-local: accordion rows need an expanding answer row, which gx-row doesn't cover. */
const helpCss = `
.help-faq-item + .help-faq-item { border-top: 1px solid var(--settings-line); }
.help-faq-q {
  width: 100%; display: flex; align-items: center; justify-content: space-between; gap: 12px;
  min-height: 56px; padding: 12px 16px; border: 0; background: transparent; cursor: pointer;
  font: inherit; font-size: 14.5px; font-weight: 500; color: var(--settings-ink); text-align: start;
  -webkit-tap-highlight-color: transparent;
}
.help-faq-q:active { background: var(--settings-line); }
.help-faq-chev { width: 16px; height: 16px; flex-shrink: 0; color: var(--settings-muted); transition: transform 0.2s ease; }
.help-faq-chev.open { transform: rotate(180deg); }
.help-faq-a-wrap { display: grid; transition: grid-template-rows 0.25s ease; }
.help-faq-a-wrap .help-faq-a-inner { overflow: hidden; }
.help-faq-a { margin: 0; padding: 0 16px 16px; font-size: 13.5px; line-height: 1.6; color: var(--settings-muted); }
.help-search { display: flex; align-items: center; gap: 10px; }
.help-search input { flex: 1; background: transparent; border: 0; outline: none; font: inherit; font-size: 14.5px; color: var(--settings-ink); }
.help-search input::placeholder { color: var(--settings-muted); opacity: 0.7; }
`;

export default function SettingsHelpPage() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [openKey, setOpenKey] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return sections;
    return sections
      .map((s) => ({ ...s, items: s.items.filter((it) => (it.q + " " + it.a).toLowerCase().includes(q)) }))
      .filter((s) => s.items.length > 0);
  }, [query]);

  return (
    <div className="gx-root">
      <style>{helpCss}</style>
      <div className="gx-screen">
        <header className="gx-top">
          <button
            type="button"
            aria-label="Back"
            onClick={() => goBackOr(navigate, "/settings/support")}
            className="gx-hbtn"
          >
            <ChevronLeft className="gx-hicon rtl:rotate-180" strokeWidth={2} />
          </button>
        </header>

        <h1 className="gx-title">Help Center</h1>

        <div className="gx-content">
          <div className="gx-card gx-card-pad help-search">
            <Search className="h-4 w-4 shrink-0 text-[color:var(--settings-muted)]" strokeWidth={2} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search articles"
            />
          </div>

          {filtered.map((sec) => (
            <section key={sec.title} className="gx-section">
              <h2 className="gx-section-title">{sec.title}</h2>
              <div className="gx-card">
                {sec.items.map((it, i) => {
                  const key = `${sec.title}-${i}`;
                  const open = openKey === key;
                  return (
                    <div key={key} className="help-faq-item">
                      <button
                        type="button"
                        onClick={() => setOpenKey(open ? null : key)}
                        className="help-faq-q"
                      >
                        <span>{it.q}</span>
                        <ChevronDown className={`help-faq-chev ${open ? "open" : ""}`} strokeWidth={2} />
                      </button>
                      <div className="help-faq-a-wrap" style={{ gridTemplateRows: open ? "1fr" : "0fr" }}>
                        <div className="help-faq-a-inner">
                          <p className="help-faq-a">{it.a}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          ))}

          {filtered.length === 0 && (
            <div className="gx-card gx-empty">
              <p className="text-[15px] font-semibold text-[color:var(--settings-ink)]">No matches</p>
              <span className="text-[13px] text-[color:var(--settings-muted)]">Try a different keyword.</span>
            </div>
          )}
        </div>

        <div className="gx-spacer" />
      </div>
    </div>
  );
}
