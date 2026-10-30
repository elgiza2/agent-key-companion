/** Agent roster settings: choose the primary chat assistant and which specialists may auto-join. */
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Bot,
  Check,
  ChevronRight,
  Crown,
  Loader2,
  Plus,
  RotateCw,
  Users,
  Wrench,
  Search,
  Code2,
  BarChart3,
  PenLine,
  Clapperboard,
} from "lucide-react";
import { useWorkspaceStore, loadWorkspace } from "@/lib/agentsky/store";
import { AGENT_ROSTER_STORAGE_KEY } from "@/lib/agentsky/rosterSettings";
import { AgentIcon, agentBrandKey } from "@/components/agent/AgentIcon";
import { MegsyMark } from "@/components/agent/AgentIcon";
import ServiceIcon from "@/components/chat/ServiceIcon";
import ProfileGlassShell, { GlassCard, GlassSection } from "@/components/profile/ProfileGlassShell";
import SEOHead from "@/components/common/SEOHead";
import { canUseAgent } from "@/lib/octoberOffer";
import { promptUpgrade } from "@/lib/upgradeMoment";

/**
 * Distinctive icon per specialist (user request): every agent gets its own
 * mark. Megsy keeps its own robot mark; each specialist gets the icon of
 * its craft — search, code, analysis, writing, media.
 */
function SpecialistMark({ name, mediaOnly }: { name: string; mediaOnly?: boolean }) {
  const t = String(name || "").toLowerCase();
  if (mediaOnly || /higgs|image|video|media/.test(t))
    return <ServiceIcon kind="video" size={22} />;
  if (/research|search|news|fact/.test(t)) return <ServiceIcon kind="search" size={22} />;
  if (/engineer|code|dev|debug|repo|program/.test(t)) return <ServiceIcon kind="code" size={22} />;
  if (/analy|number|financ|strateg|data/.test(t))
    return (
      <span className="grid h-[22px] w-[22px] place-items-center text-[var(--megsy-blue)]">
        <BarChart3 size={20} strokeWidth={2} />
      </span>
    );
  if (/writ|copy|doc|script|content/.test(t))
    return (
      <span className="grid h-[22px] w-[22px] place-items-center text-[var(--megsy-blue)]">
        <PenLine size={20} strokeWidth={2} />
      </span>
    );
  if (/slide|present|deck/.test(t)) return <ServiceIcon kind="slides" size={22} />;
  if (/browse|web|operator|task/.test(t)) return <ServiceIcon kind="browse" size={22} />;
  return <ServiceIcon kind="agent" size={22} />;
}

/** Raw backend errors are never shown: map them to one friendly line + action. */
function friendlyWorkspaceError(raw: string): { title: string; hint: string } {
  const msg = String(raw || "");
  if (/not_configured|no AgentSky key|signing secret missing/i.test(msg)) {
    return {
      title: "Specialist agents are unavailable right now",
      hint: "The agent service is not connected on the server yet. Quick Chat keeps working — try again in a bit.",
    };
  }
  if (/unauthorized|please sign in|401|403/i.test(msg)) {
    return {
      title: "Please sign in to manage specialists",
      hint: "Your session may have expired. Sign in again and retry.",
    };
  }
  if (/network|fetch|timeout|unavailable|502|503|504/i.test(msg)) {
    return {
      title: "Could not reach the agent service",
      hint: "Check your connection and try again.",
    };
  }
  return {
    title: "Could not load specialist agents",
    hint: "Quick Chat keeps working — try again in a bit.",
  };
}

type RosterSettings = { enabledIds: string[]; autoJoinIds: string[] };
const emptySettings: RosterSettings = { enabledIds: [], autoJoinIds: [] };

function readSettings(): RosterSettings {
  try {
    const value = JSON.parse(localStorage.getItem(AGENT_ROSTER_STORAGE_KEY) || "{}");
    return {
      enabledIds: Array.isArray(value.enabledIds) ? value.enabledIds.filter((x: unknown) => typeof x === "string") : [],
      autoJoinIds: Array.isArray(value.autoJoinIds) ? value.autoJoinIds.filter((x: unknown) => typeof x === "string") : [],
    };
  } catch {
    return emptySettings;
  }
}

function Toggle({ checked, label, disabled, onClick }: { checked: boolean; label: string; disabled?: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-45 ${checked ? "bg-primary" : "bg-muted-foreground/25"}`}
    >
      <span className={`h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${checked ? "translate-x-6 rtl:-translate-x-6" : "translate-x-1 rtl:-translate-x-1"}`} />
    </button>
  );
}

export default function AgentSelectionPage() {
  const { agents, ready, error, tier } = useWorkspaceStore();
  const [settings, setSettings] = useState<RosterSettings>(emptySettings);
  const [now] = useState(Date.now());

  useEffect(() => {
    setSettings(readSettings());
    if (!ready) void loadWorkspace();
  }, [ready]);

  const save = useCallback((next: RosterSettings) => {
    setSettings(next);
    try { localStorage.setItem(AGENT_ROSTER_STORAGE_KEY, JSON.stringify(next)); } catch { /* storage may be unavailable */ }
  }, []);

  const available = useMemo(() => agents.filter((agent) => !agent.isDefault && !agent.mediaOnly), [agents]);
  const selectedCount = settings.autoJoinIds.filter((id) => settings.enabledIds.includes(id)).length;

  const toggleEnabled = (id: string) => {
    const agent = agents.find((item) => item.id === id);
    if (agent && !canUseAgent(tier, !!agent.mediaOnly, now)) {
      promptUpgrade("Enable specialist agents", "Activate specialist agents for your chats.");
      return;
    }
    const enabled = settings.enabledIds.includes(id);
    save({
      enabledIds: enabled ? settings.enabledIds.filter((item) => item !== id) : [...settings.enabledIds, id],
      autoJoinIds: enabled ? settings.autoJoinIds.filter((item) => item !== id) : settings.autoJoinIds,
    });
  };

  const toggleAutoJoin = (id: string) => {
    if (!settings.enabledIds.includes(id)) return;
    const active = settings.autoJoinIds.includes(id);
    save({
      ...settings,
      autoJoinIds: active ? settings.autoJoinIds.filter((item) => item !== id) : [...settings.autoJoinIds, id],
    });
  };

  const back = () => (window.history.length > 1 ? window.history.back() : window.location.assign("/chat"));

  return (
    <div data-no-translate>
      <SEOHead locale="en" path="/agents" title="Agent settings" description="Choose Megsy's primary chat and specialist agents." />
      <ProfileGlassShell
        title="Agent settings"
        subtitle="Choose the assistant that leads your chats and which specialists can join when relevant."
        onBack={back}
        trailing={
          <Link to="/agents/new" className="gx-hbtn gx-hbtn-sm" aria-label="Create agent" title="Create agent">
            <Plus className="gx-hicon" strokeWidth={2} />
          </Link>
        }
      >
        <GlassSection title="Primary assistant">
          <GlassCard className="gx-card-pad">
            <div className="flex items-center gap-3">
              {/* Megsy keeps its own robot mark — never a generic icon. */}
              <span className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-2xl bg-primary/10"><MegsyMark color="aurora" size={30} /></span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2"><strong>Megsy Quick Chat</strong><span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">Primary</span></div>
                <p className="mt-1 text-sm text-muted-foreground">Leads every normal conversation. Specialist agents stay off unless enabled below.</p>
              </div>
              <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground"><Check size={15} /></span>
            </div>
          </GlassCard>
        </GlassSection>

        <GlassSection title={`Specialists${selectedCount ? ` · ${selectedCount} auto-join` : ""}`}>
          {!ready && <GlassCard><div className="gx-loading" role="status"><Loader2 size={17} className="animate-spin" />Loading agents…</div></GlassCard>}
          {error && (() => {
            const friendly = friendlyWorkspaceError(error);
            return (
              <GlassCard className="gx-card-pad">
                <div className="flex items-start gap-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-muted/60 text-muted-foreground"><Wrench size={18} /></span>
                  <div className="min-w-0 flex-1">
                    <strong className="block text-sm">{friendly.title}</strong>
                    <p role="alert" className="mt-1 text-sm text-muted-foreground">{friendly.hint}</p>
                  </div>
                </div>
                <button type="button" className="gx-pill gx-pill-wide mt-3" onClick={() => void loadWorkspace(true)}><RotateCw size={16} />Try again</button>
              </GlassCard>
            );
          })()}
          {ready && !available.length && !error && <GlassCard className="gx-card-pad"><p className="text-sm text-muted-foreground">No specialist agents are available yet.</p></GlassCard>}
          {available.map((agent) => {
            const enabled = settings.enabledIds.includes(agent.id);
            const autoJoin = settings.autoJoinIds.includes(agent.id);
            const locked = !canUseAgent(tier, !!agent.mediaOnly, now);
            return (
              <GlassCard key={agent.id} className="gx-card-pad mb-3">
                <div className="flex items-center gap-3">
                  {/* Each specialist gets its own craft icon; brand logos still
                      win when the agent names a known model/provider. */}
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-muted/60">
                    {agentBrandKey(agent) ? <AgentIcon agent={agent} size={26} /> : <SpecialistMark name={`${agent.name} ${agent.description || ""}`} mediaOnly={agent.mediaOnly} />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <strong className="block truncate">{agent.name}</strong>
                    <span className="mt-0.5 block line-clamp-2 text-sm text-muted-foreground">{agent.description || "Specialist agent"}</span>
                  </div>
                  {locked && <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-1 text-[11px] text-muted-foreground"><Crown size={12} />Pro</span>}
                  <Toggle checked={enabled} label={`Enable ${agent.name}`} onClick={() => toggleEnabled(agent.id)} />
                </div>
                <div className="mt-3 flex items-center justify-between border-t border-border/50 pt-3 ps-14">
                  <div className="min-w-0">
                    <strong className="text-sm">Auto-join relevant chats</strong>
                    <p className="mt-0.5 text-xs text-muted-foreground">Let Megsy bring this specialist in when its skills fit.</p>
                  </div>
                  <Toggle checked={autoJoin} label={`Auto-join ${agent.name}`} disabled={!enabled || locked} onClick={() => toggleAutoJoin(agent.id)} />
                </div>
              </GlassCard>
            );
          })}
        </GlassSection>

        <GlassSection title="Always-on teams">
          <GlassCard className="gx-card-pad">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary"><Users size={20} /></span>
              <div className="min-w-0 flex-1"><strong>Team Workspace</strong><p className="mt-1 text-sm text-muted-foreground">A separate paid workspace for long-running teams and 24/7 tasks.</p></div>
              <Link to="/team" className="gx-pill inline-flex items-center gap-1">Open <ChevronRight size={15} /></Link>
            </div>
          </GlassCard>
        </GlassSection>
      </ProfileGlassShell>
    </div>
  );
}
