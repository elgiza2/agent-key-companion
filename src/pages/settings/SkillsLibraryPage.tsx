/** @doc Official skills library — browse and add curated skills. */
import { useState } from "react";
import { Search, Check, Plus, Loader2 } from "lucide-react";
import { resolveSkillIcon, skillEmoji } from "@/lib/skillIcon";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useSkills, type Skill } from "@/hooks/useSkills";
import { getActiveWorkspaceId } from "@/lib/activeWorkspace";
import { SubShell, SubSection } from "@/components/settings/SubShell";
import { sanitizeErrorMessage } from "@/lib/sanitizeError";
import { GITHUB_SKILLS } from "@/lib/githubSkills";

export default function SkillsLibraryPage() {
  const { mySkills, librarySkills, loading, reload } = useSkills();
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  const add = async (s: Skill) => {
    setBusy(s.id);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setBusy(null);
      toast.error("Sign in required");
      return;
    }
    const { error } = await supabase.from("skills").insert({
      user_id: user.id,
      workspace_id: getActiveWorkspaceId(),
      name: s.name,
      description: s.description,
      instructions: s.instructions,
      body: s.body || s.instructions,
      triggers: s.triggers || [],
      enabled_tools: s.enabled_tools || [],
      preferred_model: s.preferred_model,
      icon: s.icon,
      is_enabled: true,
    });
    setBusy(null);
    if (error) {
      toast.error(sanitizeErrorMessage(error, "Something went wrong"));
      return;
    }
    toast.success(`Added "${s.name}"`);
    reload();
  };

  const q = query.trim().toLowerCase();
  const all = [...librarySkills, ...GITHUB_SKILLS.filter((g) => !librarySkills.some((l) => l.name === g.name))];
  const items = all.filter(
    (s) =>
      !q ||
      s.name.toLowerCase().includes(q) ||
      (s.description || "").toLowerCase().includes(q),
  );

  return (
    <SubShell
      title="Official library"
      subtitle="Top open-source skills, ready to add."
      backTo="/settings/skills"
    >
      <div className="gx-field">
        <div className="gx-input flex items-center gap-2">
          <Search className="w-4 h-4 text-[color:var(--settings-muted)] shrink-0" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search library"
            className="flex-1 min-w-0 bg-transparent outline-none text-[14px] text-[color:var(--settings-ink)] placeholder:text-[color:var(--settings-muted)]"
          />
        </div>
      </div>

      {loading && items.length === 0 ? (
        <div className="gx-card gx-loading">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Loading…</span>
        </div>
      ) : items.length === 0 ? (
        <div className="gx-card gx-empty">
          <Search className="w-6 h-6" strokeWidth={1.5} />
          <p className="font-semibold">No skills found</p>
          <p>Try a different search.</p>
        </div>
      ) : (
        <SubSection title="Skills">
          <div className="gx-card">
            {items.map((s) => {
              const installed = mySkills.some((m) => m.name === s.name);
              return (
                <div key={s.id} className="gx-row gx-tone-violet">
                  <LibraryIcon name={s.name} icon={s.icon} />
                  <span className="gx-row-body">
                    <span className="gx-row-label">{s.name}</span>
                    {s.description && <span className="gx-row-hint line-clamp-2">{s.description}</span>}
                  </span>
                  <span className="gx-row-trailing">
                    {installed ? (
                      <span className="inline-flex items-center gap-1 h-8 px-3 rounded-full text-[12px] font-semibold text-primary bg-primary/10">
                        <Check className="w-3.5 h-3.5" strokeWidth={2.6} /> Added
                      </span>
                    ) : (
                      <button
                        aria-label={`Add ${s.name}`}
                        disabled={busy === s.id}
                        onClick={() => add(s)}
                        className="gx-pill"
                        style={{ minHeight: 32, padding: "0 12px", fontSize: 12 }}
                      >
                        {busy === s.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <span className="inline-flex items-center gap-1">
                            <Plus className="w-3.5 h-3.5" /> Add
                          </span>
                        )}
                      </button>
                    )}
                  </span>
                </div>
              );
            })}
          </div>
        </SubSection>
      )}
    </SubShell>
  );
}

function LibraryIcon({ name, icon }: { name: string; icon?: string | null }) {
  const emoji = skillEmoji(icon);
  const Icon = resolveSkillIcon(name, icon);
  return (
    <span className="gx-tile">
      {emoji ? <span>{emoji}</span> : <Icon strokeWidth={1.9} />}
    </span>
  );
}
