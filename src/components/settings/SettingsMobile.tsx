/** @doc Mobile settings — dark grouped list (matches reference design). */
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ChevronLeft,
  ChevronRight,
  Brain,
  CreditCard,
  Zap,
  SlidersHorizontal,
  Database,
  PanelBottom,
  Puzzle,
  Plug,
  Heart,
  HelpCircle,
  Asterisk,
  Info,
  LogOut,
  Wallet,
  Gift,
  Moon,
  Sun,
  Languages,
  Mail as MailIcon,
  Monitor,
  ShieldCheck,
  Palette,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useConfirm } from "@/components/common/ConfirmDialog";
import { useActiveAccount } from "@/hooks/useActiveAccount";
import { useCredits } from "@/hooks/useCredits";
import { t as authT, translateExactText, useUserLang, AVAILABLE_LANGS } from "@/lib/authI18n";
import { goBackOr } from "@/lib/navigation";
import { getStoredTheme, setTheme, type ThemeMode } from "@/lib/theme";
import ThemePreviewPicker from "./ThemePreviewPicker";
import { signOutEverywhere } from "@/lib/signOutEverywhere";

type Row = {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  trailing?: string;
  path?: string;
  onClick?: () => void;
  external?: boolean;
  chevron?: "arrow" | "stepper" | "none";
  control?: "switch";
  danger?: boolean;
  tone?: string;
};

const APP_VERSION = "v1.0.0";

const initialsOf = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("") || "U";

const SettingsMobile = () => {
  const navigate = useNavigate();
  const account = useActiveAccount();
  const lang = useUserLang();
  const isAr = lang === "ar-eg";
  const tx = (text: string) => translateExactText(text, lang);
  const { plan, credits } = useCredits();
  const [userEmail, setUserEmail] = useState("");
  const [failedAvatar, setFailedAvatar] = useState<string | null>(null);

  const userName = account.name || userEmail.split("@")[0] || "User";

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user || cancelled) return;
      setUserEmail(user.email || "");
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const planLabel = (plan || "free").toLowerCase() === "free" ? "Free" : (plan || "").toUpperCase();

  const confirm = useConfirm();

  const handleLogout = async () => {
    const ok = await confirm({
      title: "Log out",
      description: "You'll need to sign in again to access your chats.",
      confirmLabel: "Log out",
    });
    if (!ok) return;
    await signOutEverywhere();
  };

  const [themeMode, setThemeMode] = useState<ThemeMode>(() => getStoredTheme());

  const mainRows: Row[] = [
    // Mail is hidden until its UI is reworked.
    // { icon: MailIcon, label: "Mail", trailing: "@megsyai.com", path: "/mail" },
    { icon: Brain, tone: "memory", label: "Memory", path: "/settings/memory" },
    { icon: PanelBottom, tone: "browser", label: "Cloud browser", path: "/settings/cloud-browser" },

    { icon: Puzzle, tone: "skills", label: "Skills", path: "/settings/skills" },
    { icon: Plug, label: "Integrations", path: "/integrations" },
  ];

  const advancedRows: Row[] = [{ icon: Gift, tone: "referrals", label: "Referrals", path: "/referrals" }];

  const accountRows: Row[] = [
    { icon: CreditCard, tone: "wallet", label: "Subscription", trailing: planLabel, path: "/pricing" },
    { icon: Zap, tone: "wallet", label: "Billing", trailing: String(credits ?? 0), path: "/usage" },
  ];

  const langLabel = AVAILABLE_LANGS.find((l) => l.code === lang)?.native ?? "English";

  const appearanceRows: Row[] = [
    { icon: ShieldCheck, tone: "privacy", label: "Privacy & Data", path: "/settings/privacy" },
    { icon: SlidersHorizontal, tone: "appearance", label: "Appearance", chevron: "none", control: "switch" },
    { icon: Languages, tone: "language", label: "Language", trailing: langLabel, path: "/settings/language" },
  ];

  const linkRows: Row[] = [
    {
      icon: HelpCircle,
      tone: "help",
      label: "Contact Support",
      external: true,
      onClick: () => navigate("/contact"),
    },
    {
      icon: Info,
      label: "About us",
      external: true,
      onClick: () => navigate("/about"),
    },
    { icon: Asterisk, label: "Version", trailing: APP_VERSION, chevron: "none" },
  ];

  const renderRow = (row: Row, idx: number) => {
    const Icon = row.icon;
    const Chevron = isAr ? ChevronLeft : ChevronRight;
    return (
      <div key={row.label} className={`${row.control ? "ms-row ms-row-stack" : "ms-row-container"}${idx > 0 ? " ms-row-div" : ""}`}>
        {row.control ? <>
          <div className="ms-row-head">
            <span className={`ms-icon-tile ms-tone-${row.tone || "account"}`}><Icon className="ms-row-icon" /></span>
            <span className="ms-row-label">{tx(row.label)}</span>
          </div>
          <div className="ms-row-picker">
            <ThemePreviewPicker value={themeMode} onChange={next => { setThemeMode(next); setTheme(next); }} />
          </div>
        </> : <Button variant="ghost" type="button" onClick={() => row.onClick ? row.onClick() : row.path && navigate(row.path)} disabled={!row.onClick && !row.path} className="ms-row ms-row-inner">
          <span className={`ms-icon-tile ms-tone-${row.tone || "account"}`}><Icon className="ms-row-icon" /></span>
          <span className="ms-row-label">{tx(row.label)}</span>
          {row.trailing && <span className="ms-row-trailing">{row.trailing}</span>}
          {row.chevron === "none" ? null : row.external ? <span className="ms-row-chev ms-row-ext">↗</span> : <Chevron className="ms-row-chev" />}
        </Button>}
      </div>
    );
  };

  return (
    <div className="ms-root" dir={isAr ? "rtl" : "ltr"}>
      <div className="ms-screen">
        <header className="ms-header">
          <Button variant="ghost" type="button" className="ms-hbtn" aria-label={authT("back")} onClick={() => navigate("/")}>
            {isAr ? <ChevronRight className="ms-hicon" /> : <ChevronLeft className="ms-hicon" />}
          </Button>
          <h1 className="ms-brand">{tx("Settings")}</h1>
        </header>
        <main className="ms-body">
          <div className="ms-card ms-profile-group">
            <Button variant="ghost" type="button" className="ms-profile" onClick={() => navigate("/settings/profile/edit")}>
              {account.avatarUrl && failedAvatar !== account.avatarUrl ? <img src={account.avatarUrl} alt="" className="ms-avatar" loading="lazy" decoding="async" onError={() => setFailedAvatar(account.avatarUrl)} /> : <span className="ms-avatar ms-avatar-fallback">{initialsOf(userName)}</span>}
              <span className="ms-profile-text"><span className="ms-profile-name">{userName}</span><span className="ms-profile-sub">{tx("View Profile")}</span></span>
              {isAr ? <ChevronLeft className="ms-row-chev" /> : <ChevronRight className="ms-row-chev" />}
            </Button>
            <Button variant="ghost" type="button" className="ms-row ms-row-div" onClick={() => navigate("/settings/profile/edit")}><span className="ms-row-label">{tx("Edit Profile")}</span>{isAr ? <ChevronLeft className="ms-row-chev" /> : <ChevronRight className="ms-row-chev" />}</Button>
          </div>
          <div className="ms-card">{accountRows.map(renderRow)}</div>
          <section><h2 className="ms-section-title">{tx("Preferences")}</h2><div className="ms-card">{appearanceRows.map(renderRow)}</div></section>
          <section><h2 className="ms-section-title">{tx("Workspace")}</h2><div className="ms-card">{mainRows.map(renderRow)}{advancedRows.map((row, idx) => renderRow(row, mainRows.length + idx))}</div></section>
          <section><h2 className="ms-section-title">{tx("Resources")}</h2><div className="ms-card">{linkRows.map(renderRow)}</div></section>
          <div className="ms-card"><Button variant="ghost" type="button" className="ms-row ms-row-danger" onClick={handleLogout}><span className="ms-icon-tile ms-tone-logout"><LogOut className="ms-row-icon" /></span><span className="ms-row-label">{tx("Log out")}</span></Button></div>
          <div className="ms-spacer" />
        </main>
      </div>
    </div>
  );
};

export default SettingsMobile;
