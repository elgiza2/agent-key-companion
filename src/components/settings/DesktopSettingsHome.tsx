import { useEffect, useState, type FC, type SVGProps } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronRight, Sparkles, Globe, Brain, Info, Mail, KeyRound, Monitor } from "lucide-react";
import { getStoredTheme, setTheme, type ThemeMode } from "@/lib/theme";
import ThemePreviewPicker from "@/components/settings/ThemePreviewPicker";
import { Moon as MoonIcon, Sun as SunIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useConfirm } from "@/components/common/ConfirmDialog";
import { useActiveAccount } from "@/hooks/useActiveAccount";
import { translateExactText, useUserLang, AVAILABLE_LANGS } from "@/lib/authI18n";
import { Button } from "@/components/ui/button";
import OliveAvatar from "@/components/branding/OliveAvatar";
import MegsyStar from "@/components/branding/MegsyStar";
import { signOutEverywhere } from "@/lib/signOutEverywhere";
import {
  UserRound as AccountIcon,
  CreditCard as BillingIcon,
  SlidersHorizontal as AppearanceIcon,
  Plug as IntegrationsIcon,
  CircleHelp as SupportIcon,
  ShieldCheck as PrivacyIcon,
  Activity as StatusIcon,
  LogOut as LogoutIcon,
} from "lucide-react";

type Row = {
  icon: FC<SVGProps<SVGSVGElement>>;
  label: string;
  path?: string;
  onClick?: () => void;
  trailing?: string;
  control?: "switch" | "appearance";
};
type Group = { title: string; rows: Row[] };

export function DesktopSettingsHome() {
  const lang = useUserLang();
  const tx = (text: string) => translateExactText(text, lang);
  const navigate = useNavigate();
  const go = (path: string) => navigate(path);
  const account = useActiveAccount();
  const avatarUrl = account.avatarUrl;
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => getStoredTheme());
  const [userEmail, setUserEmail] = useState("");
  const [plan, setPlan] = useState("free");
  const userName = account.name || userEmail.split("@")[0] || tx("User");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user || cancelled) return;
      setUserEmail(user.email || "");
      const { data: profile } = await supabase
        .from("profiles")
        .select("plan")
        .eq("id", user.id)
        .single();
      if (profile && !cancelled) setPlan(profile.plan || "free");
    })();
    return () => {
      cancelled = true;
    };
  }, [account.kind]);

  const isFree = plan === "free";

  const currentLangLabel = AVAILABLE_LANGS.find((l) => l.code === lang)?.native ?? "English";

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

  const groups: Group[] = [
    {
      title: tx("Account"),
      rows: [
        { icon: AccountIcon, label: tx("Profile"), path: "/settings/profile" },
        { icon: BillingIcon, label: tx("Plan & billing"), path: "/usage" },
      ],
    },
    {
      title: tx("Preferences"),
      rows: [
        { icon: AppearanceIcon, label: tx("Composer"), path: "/settings/customization" },
        // Mail is hidden until its UI is reworked.
        // { icon: (p) => <Mail {...p} />, label: tx("Mail"), path: "/mail" },
        { icon: (p) => <Brain {...p} />, label: tx("Memory"), path: "/settings/memory" },
        { icon: IntegrationsIcon, label: tx("Integrations"), path: "/integrations" },
        { icon: IntegrationsIcon, label: tx("MCP Servers"), path: "/settings/mcp" },

        {
          icon: (p) => <Globe {...p} />,
          label: tx("Language"),
          path: "/settings/language",
          trailing: currentLangLabel,
        },
      ],
    },
    {
      title: tx("More"),
      rows: [
        { icon: SupportIcon, label: tx("Help & Support"), path: "/settings/support" },
        { icon: PrivacyIcon, label: tx("Privacy & Data"), path: "/settings/privacy" },
        { icon: StatusIcon, label: tx("System status"), path: "/settings/system-status" },
        {
          icon: (p) => (themeMode === "dark" ? <MoonIcon {...p} /> : <SunIcon {...p} />),
          label: tx("Appearance"),
          control: "appearance",
        },
        {
          icon: (p) => <Info {...p} />,
          label: tx("About us"),
          onClick: () => window.open("/about", "_blank", "noopener"),
        },
      ],
    },
  ];

  return (
    <div data-desktop-mono className="settings-reference-desktop relative z-10 mx-auto w-full max-w-xl space-y-8 pb-16">
      <style>{desktopRowCss}</style>
      <h1 className="settings-reference-title">{tx("Settings")}</h1>
      <div className="settings-profile-group">
        <Button variant="ghost" className="settings-profile-row" onClick={() => go("/settings/profile/edit")}>
          <span className="settings-profile-avatar">{avatarUrl ? <img src={avatarUrl} alt="" loading="lazy" decoding="async" /> : <OliveAvatar seed={userEmail || userName} />}</span>
          <span className="settings-profile-copy"><strong>{userName}</strong><span>{tx("View Profile")}</span></span>
          <ChevronRight className="ms-row-chev" />
        </Button>
        <Button variant="ghost" className="ds-row w-full flex items-center justify-between px-6" onClick={() => go("/settings/profile/edit")}><span>{tx("Edit Profile")}</span><ChevronRight className="ms-row-chev" /></Button>
      </div>

      {/* Upgrade CTA */}
      {isFree && (
        <Button variant="ghost"
          onClick={() => go("/usage")}
          className="group relative w-full rounded-2xl px-5 py-4 flex items-center gap-3.5 text-left text-foreground overflow-hidden border border-border bg-card hover:bg-muted transition-colors"
        >
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-foreground/15 border border-foreground/25 backdrop-blur">
            <MegsyStar className="h-6 w-6" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[15.5px] font-semibold leading-tight">{tx("Upgrade to Premium")}</p>
            <p className="mt-0.5 text-[12.5px] text-foreground/85 leading-snug">
              {tx("Higher credits, priority models and early features.")}
            </p>
          </div>
          <Sparkles className="h-4 w-4 text-foreground/85 shrink-0" />
        </Button>
      )}

      {/* Grouped rows */}
      <div className="space-y-6">
        {groups.map((group) => (
          <section key={group.title}>
            <h2 className="settings-group-heading mb-2.5">
              {group.title}
            </h2>
            <div className="settings-desktop-group">
              {group.rows.map((row) => {
                const Icon = row.icon;
                if (row.control === "appearance") {
                  return (
                    <div key={row.label} className="ds-row w-full px-5 py-4">
                      <div className="flex items-center gap-3">
                        <span className="ms-icon-tile ms-tone-appearance"><Icon className="w-[19px] h-[19px]" /></span>
                        <span className="flex-1 text-[14.5px] font-medium text-foreground">{row.label}</span>
                      </div>
                      <div className="mt-3.5">
                        <ThemePreviewPicker value={themeMode} onChange={next => { setThemeMode(next); setTheme(next); }} />
                      </div>
                    </div>
                  );
                }
                return (
                  <Button variant="ghost"
                    key={row.label}
                    onClick={() => (row.onClick ? row.onClick() : row.path && go(row.path))}
                    className="ds-row w-full flex items-center gap-3 px-5 py-3.5 text-left hover:bg-muted/60 active:bg-muted transition-colors"
                  >
                    <span className={`ms-icon-tile ${row.icon === BillingIcon ? "ms-tone-wallet" : row.icon === PrivacyIcon ? "ms-tone-privacy" : row.icon === SupportIcon ? "ms-tone-help" : row.control ? "ms-tone-appearance" : group.title === tx("Preferences") ? "ms-tone-language" : ""}`}><Icon className="w-[19px] h-[19px]" /></span>
                    <span className="flex-1 text-[14.5px] font-medium text-foreground">
                      {row.label}
                    </span>
                    {row.trailing && !row.control && (
                      <span className="text-[12.5px] text-foreground/55 shrink-0">
                        {row.trailing}
                      </span>
                    )}
                    <ChevronRight className="w-4 h-4 text-foreground/65 shrink-0" />
                  </Button>
                );
              })}
            </div>
          </section>
        ))}

        {/* Logout group */}
        <section>
          <div className="settings-desktop-group">
            <Button variant="ghost"
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-5 py-3.5 text-left hover:bg-muted/60 active:bg-muted transition-colors"
              aria-label="Logout"
            >
              <span className="ms-icon-tile ms-tone-logout"><LogoutIcon className="w-[19px] h-[19px]" /></span>
              <span className="flex-1 text-[14.5px] font-medium text-destructive">
                {tx("Sign out")}
              </span>
            </Button>
          </div>
        </section>
      </div>
    </div>
  );
}

const desktopRowCss = `
  .ds-row {
    position: relative;
  }
  .ds-row + .ds-row::before {
    content: "";
    position: absolute;
    top: 0;
    left: 50px;
    right: 20px;
    height: 1px;
    background: hsl(var(--foreground) / 0.055);
  }
`;

export default DesktopSettingsHome;
