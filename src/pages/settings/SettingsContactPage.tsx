/** @doc Contact — glass form: direct email, message form, sent confirmation. */
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, CheckCircle2, Send } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { translateExactText, useUserLang } from "@/lib/authI18n";
import { goBackOr } from "@/lib/navigation";
import { SubShell, SubSection, SubCard } from "@/components/settings/SubShell";

export default function SettingsContactPage() {
  const navigate = useNavigate();
  const lang = useUserLang();
  const tx = (s: string) => translateExactText(s, lang);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const u = data.user;
      if (!u) return;
      setEmail(u.email || "");
      const meta = (u.user_metadata as Record<string, unknown>) || {};
      const full = (meta.full_name as string) || (meta.name as string) || "";
      setName(full || u.email?.split("@")[0] || "");
    });
  }, []);

  const submit = async () => {
    if (!name.trim() || !email.trim() || !message.trim()) {
      toast.error(tx("Please fill in name, email and message"));
      return;
    }
    setSending(true);
    const { error } = await supabase.from("contact_submissions").insert({
      name: name.trim(),
      email: email.trim(),
      subject: subject.trim() || null,
      message: message.trim(),
      form_type: "support",
    });
    setSending(false);
    if (error) {
      toast.error(tx("Failed to send. Please try again."));
      return;
    }
    toast.success(tx("Message sent"));
    setSent(true);
    setSubject("");
    setMessage("");
  };

  const canSend = !!(name.trim() && email.trim() && message.trim() && !sending);

  return (
    <SubShell
      title={tx("Contact")}
      subtitle={tx("Reach out and a real human on our team will reply within 24 hours.")}
      onBack={() => goBackOr(navigate, "/settings/support")}
    >
      {sent ? (
        <div className="gx-card gx-empty">
          <span className="gx-tile gx-tone-green" style={{ width: 52, height: 52, borderRadius: 999 }}>
            <CheckCircle2 strokeWidth={1.7} />
          </span>
          <p className="text-[16px] font-semibold text-[color:var(--settings-ink)]">
            {tx("Message sent")}
          </p>
          <p className="text-[13.5px] leading-relaxed text-[color:var(--settings-muted)]">
            {tx("Thanks")} {name.split(" ")[0]}. {tx("We'll reply to")}{" "}
            <b className="font-medium text-[color:var(--settings-ink)]">{email}</b>{" "}
            {tx("within 24 hours.")}
          </p>
          <button type="button" className="gx-pill" onClick={() => setSent(false)}>
            {tx("Send another message")}
          </button>
        </div>
      ) : (
        <>
          <SubSection title={tx("Direct")}>
            <SubCard>
              <a href="https://t.me/Torekr" className="gx-row gx-row-tap gx-tone-blue">
                <span className="gx-tile">
                  <Send strokeWidth={1.7} />
                </span>
                <span className="gx-row-body">
                  <span className="gx-row-label">{tx("Telegram")}</span>
                  <span className="gx-row-hint">t.me/Torekr</span>
                </span>
                <span className="gx-row-trailing">~24h</span>
              </a>
            </SubCard>
          </SubSection>

          <SubSection title={tx("Send a message")}>
            <SubCard className="flex flex-col gap-4">
              <div className="gx-field">
                <label className="gx-field-label">{tx("Name")}</label>
                <input
                  className="gx-input"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={tx("Your full name")}
                />
              </div>
              <div className="gx-field">
                <label className="gx-field-label">{tx("Telegram")}</label>
                <input
                  type="email"
                  className="gx-input"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                />
              </div>
              <div className="gx-field">
                <label className="gx-field-label">{tx("Subject")}</label>
                <input
                  className="gx-input"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder={tx("Optional")}
                />
              </div>
              <div className="gx-field">
                <label className="gx-field-label">{tx("Message")}</label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={5}
                  placeholder={tx("Tell us what's happening…")}
                  className="gx-input resize-none leading-[1.55]"
                />
              </div>
            </SubCard>
          </SubSection>

          <button
            type="button"
            onClick={submit}
            disabled={!canSend}
            className="gx-pill gx-pill-wide"
          >
            {sending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> {tx("Sending")}
              </>
            ) : (
              tx("Send message")
            )}
          </button>
        </>
      )}
    </SubShell>
  );
}
