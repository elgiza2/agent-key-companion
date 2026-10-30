/** @doc Memory — a clean glass shelf of what Megsy remembers (user_knowledge):
 * search, one card per memory with its own switch, and a tidy edit sheet. */
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Brain, Check, ChevronLeft, Loader2, Pencil, Plus, Search, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { notifyTurnContextChanged } from "@/lib/chat/turnContext";
import { useUserLang } from "@/lib/authI18n";

type Row = {
  id: string;
  name: string;
  use_when: string;
  content: string;
  enabled: boolean;
  created_at: string;
};

type Draft = { id?: string; name: string; use_when: string; content: string };

const T = {
  en: {
    title: "Memory",
    sub: "What Megsy keeps in mind and uses across your chats.",
    search: "Search memory",
    add: "Add memory",
    edit: "Edit memory",
    empty: "Nothing here yet",
    emptySub: "Add a fact or an instruction and Megsy will use it when it fits.",
    name: "Title",
    namePh: "e.g. My writing style",
    when: "Use when",
    whenPh: "When should Megsy use this?",
    content: "What to remember",
    contentPh: "Write the fact or instruction",
    save: "Save",
    saving: "Saving…",
    del: "Delete",
    confirmDel: "Delete this memory?",
    required: "Fill in “Use when” and “What to remember”",
    failed: "Could not save",
    delFailed: "Could not delete",
    on: "Active",
    off: "Paused",
    noResults: "No matches",
    untitled: "Untitled",
    count: (n: number) => `${n} ${n === 1 ? "memory" : "memories"}`,
  },
  ar: {
    title: "الذاكرة",
    sub: "الحاجات اللي ميغسي فاكرها وبيستخدمها في محادثاتك.",
    search: "دوّر في الذاكرة",
    add: "إضافة ذكرى",
    edit: "تعديل الذكرى",
    empty: "لسه مفيش حاجة",
    emptySub: "ضيف معلومة أو تعليمات وميغسي هيستخدمها لما تناسب.",
    name: "العنوان",
    namePh: "مثلًا: أسلوب كتابتي",
    when: "تُستخدم لما",
    whenPh: "إمتى ميغسي يستخدم دي؟",
    content: "المطلوب تفتكره",
    contentPh: "اكتب المعلومة أو التعليمات",
    save: "حفظ",
    saving: "بيحفظ…",
    del: "حذف",
    confirmDel: "تحذف الذكرى دي؟",
    required: "اكتب «تُستخدم لما» و«المطلوب تفتكره»",
    failed: "مقدرناش نحفظ",
    delFailed: "مقدرناش نحذف",
    on: "شغّالة",
    off: "متوقفة",
    noResults: "مفيش نتايج",
    untitled: "بدون عنوان",
    count: (n: number) => `${n} ذكرى`,
  },
};

export default function MemoryPage() {
  const navigate = useNavigate();
  const lang = useUserLang();
  const ar = lang === "ar-eg";
  const t = ar ? T.ar : T.en;

  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const { data: auth } = await supabase.auth.getUser();
    const uid = auth.user?.id;
    if (!uid) {
      setLoading(false);
      return;
    }
    const { data } = await supabase
      .from("user_knowledge")
      .select("id,name,use_when,content,enabled,created_at")
      .eq("user_id", uid)
      .order("created_at", { ascending: false });
    setRows((data as unknown as Row[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const shown = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return rows;
    return rows.filter((r) => `${r.name} ${r.use_when} ${r.content}`.toLowerCase().includes(s));
  }, [rows, q]);

  const save = async () => {
    if (!draft) return;
    if (!draft.use_when.trim() || !draft.content.trim()) {
      toast.error(t.required);
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: draft.name.trim().slice(0, 120),
        use_when: draft.use_when.trim().slice(0, 500),
        content: draft.content.trim().slice(0, 5000),
      };
      if (draft.id) {
        const { error } = await supabase.from("user_knowledge").update(payload).eq("id", draft.id);
        if (error) throw error;
      } else {
        const { data: auth } = await supabase.auth.getUser();
        const uid = auth.user?.id;
        if (!uid) throw new Error("no user");
        const { error } = await supabase.from("user_knowledge").insert({ user_id: uid, ...payload });
        if (error) throw error;
      }
      setDraft(null);
      await load();
      notifyTurnContextChanged();
    } catch {
      toast.error(t.failed);
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    if (!window.confirm(t.confirmDel)) return;
    const prev = rows;
    setRows((r) => r.filter((x) => x.id !== id));
    setDraft(null);
    const { error } = await supabase.from("user_knowledge").delete().eq("id", id);
    if (error) {
      setRows(prev);
      toast.error(t.delFailed);
      return;
    }
    notifyTurnContextChanged();
  };

  const toggle = async (row: Row) => {
    setRows((p) => p.map((r) => (r.id === row.id ? { ...r, enabled: !r.enabled } : r)));
    const { error } = await supabase.from("user_knowledge").update({ enabled: !row.enabled }).eq("id", row.id);
    if (error) {
      setRows((p) => p.map((r) => (r.id === row.id ? { ...r, enabled: row.enabled } : r)));
      toast.error(t.failed);
      return;
    }
    notifyTurnContextChanged();
  };

  const edit = (row: Row) =>
    setDraft({ id: row.id, name: row.name, use_when: row.use_when, content: row.content });

  return (
    <div className="gx-root" dir={ar ? "rtl" : "ltr"}>
      <style>{memoryCss}</style>
      <div className="gx-screen">
        <header className="gx-top">
          <button
            type="button"
            aria-label="Back"
            onClick={() => navigate("/settings", { replace: true })}
            className="gx-hbtn"
          >
            <ChevronLeft className="gx-hicon rtl:rotate-180" strokeWidth={2} />
          </button>
          <div className="gx-top-trail">
            <button
              type="button"
              onClick={() => setDraft({ name: "", use_when: "", content: "" })}
              className="gx-pill mem-add"
            >
              <Plus className="h-4 w-4" /> {t.add}
            </button>
          </div>
        </header>

        <h1 className="gx-title">{t.title}</h1>
        <p className="gx-sub">{t.sub}</p>

        <div className="gx-content">
          {rows.length > 0 && (
            <>
              <div className="mem-search">
                <Search className="mem-search-icon" aria-hidden />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder={t.search}
                  aria-label={t.search}
                  className="mem-search-input"
                />
              </div>
              <p className="mem-count">{t.count(rows.length)}</p>
            </>
          )}

          {loading ? (
            <div className="gx-card gx-loading">
              <Loader2 className="h-4 w-4 animate-spin" />
            </div>
          ) : rows.length === 0 ? (
            <div className="gx-card mem-empty">
              <span className="mem-empty-tile">
                <Brain strokeWidth={1.6} />
              </span>
              <p className="mem-empty-title">{t.empty}</p>
              <p className="mem-empty-sub">{t.emptySub}</p>
              <button
                type="button"
                onClick={() => setDraft({ name: "", use_when: "", content: "" })}
                className="gx-pill"
              >
                <Plus className="h-4 w-4" /> {t.add}
              </button>
            </div>
          ) : shown.length === 0 ? (
            <p className="gx-empty">{t.noResults}</p>
          ) : (
            <div className="mem-list">
              {shown.map((r) => (
                <article key={r.id} className={`gx-card mem-card${r.enabled ? "" : " is-off"}`}>
                  <div className="mem-card-head">
                    <span className="gx-tile mem-tile">
                      <Brain strokeWidth={1.7} />
                    </span>
                    <button type="button" onClick={() => edit(r)} className="mem-card-title">
                      <span className="mem-title">{r.name || t.untitled}</span>
                      <span className="mem-state">{r.enabled ? t.on : t.off}</span>
                    </button>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={r.enabled}
                      aria-label={r.enabled ? t.on : t.off}
                      onClick={() => void toggle(r)}
                      className={`mem-switch${r.enabled ? " is-on" : ""}`}
                    >
                      <span className="mem-switch-knob" />
                    </button>
                  </div>

                  <button type="button" onClick={() => edit(r)} className="mem-card-body">
                    <span className="mem-content">{r.content}</span>
                    <span className="mem-when">
                      <span className="mem-when-tag">{t.when}</span>
                      {r.use_when}
                    </span>
                  </button>

                  <div className="mem-card-foot">
                    <button type="button" onClick={() => edit(r)} className="mem-act">
                      <Pencil strokeWidth={1.8} /> {t.edit}
                    </button>
                    <button
                      type="button"
                      onClick={() => void remove(r.id)}
                      className="mem-act mem-act-danger"
                    >
                      <Trash2 strokeWidth={1.8} /> {t.del}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
        <div className="gx-spacer" />
      </div>

      {draft && (
        <div className="gx-scrim" onClick={() => setDraft(null)}>
          <div className="gx-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="gx-sheet-bar" />
            <div className="gx-sheet-head">
              <button type="button" aria-label="Close" onClick={() => setDraft(null)} className="gx-hbtn gx-hbtn-sm">
                <X className="gx-hicon" strokeWidth={2} />
              </button>
              <h3 className="gx-sheet-title">{draft.id ? t.edit : t.add}</h3>
              <button type="button" onClick={() => void save()} disabled={saving} className="gx-pill gx-hbtn-sm mem-save-pill">
                {saving ? t.saving : <><Check className="h-4 w-4" /> {t.save}</>}
              </button>
            </div>

            <div className="gx-sheet-body mem-fields">
              <div className="gx-field">
                <span className="gx-field-label">{t.name}</span>
                <input
                  value={draft.name}
                  maxLength={120}
                  placeholder={t.namePh}
                  onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                  className="gx-input"
                />
              </div>
              <div className="gx-field">
                <span className="gx-field-label">{t.when} *</span>
                <textarea
                  value={draft.use_when}
                  maxLength={500}
                  rows={2}
                  placeholder={t.whenPh}
                  onChange={(e) => setDraft({ ...draft, use_when: e.target.value })}
                  className="gx-input mem-textarea"
                />
              </div>
              <div className="gx-field">
                <span className="gx-field-label">{t.content} *</span>
                <textarea
                  value={draft.content}
                  maxLength={5000}
                  rows={5}
                  placeholder={t.contentPh}
                  onChange={(e) => setDraft({ ...draft, content: e.target.value })}
                  className="gx-input mem-textarea"
                />
              </div>
              {draft.id && (
                <button
                  type="button"
                  onClick={() => void remove(draft.id!)}
                  className="gx-pill gx-pill-danger mem-del-btn"
                >
                  <Trash2 className="h-4 w-4" /> {t.del}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const memoryCss = `
.mem-add { min-height: 40px; padding: 0 16px; font-size: 13px; gap: 6px; }
.mem-search { position: relative; display: flex; align-items: center; margin-bottom: 10px; }
.mem-search-icon { position: absolute; inset-inline-start: 16px; width: 16px; height: 16px; color: var(--settings-muted); pointer-events: none; }
.mem-search-input {
  width: 100%; height: 46px; padding: 0 16px; border-radius: 999px;
  border: 1px solid var(--settings-line); background: var(--settings-surface);
  -webkit-backdrop-filter: var(--settings-frost); backdrop-filter: var(--settings-frost);
  color: var(--settings-ink); font: inherit; font-size: 14.5px; outline: none;
  padding-inline-start: 42px; box-shadow: var(--settings-shadow);
}
.mem-search-input::placeholder { color: var(--settings-muted); }
.mem-search-input:focus-visible { border-color: var(--settings-violet); }
.mem-count { margin: 0 4px 12px; font-size: 12px; letter-spacing: .02em; color: var(--settings-muted); }
.mem-list { display: grid; gap: 12px; }
.mem-card { padding: 14px 16px 12px; display: grid; gap: 10px; }
.mem-card.is-off { opacity: .6; }
.mem-card-head { display: flex; align-items: center; gap: 12px; }
.mem-tile { width: 38px; height: 38px; border-radius: 12px; }
.mem-tile > svg { width: 19px; height: 19px; }
.mem-card-title {
  min-width: 0; flex: 1; display: flex; flex-direction: column; gap: 2px;
  background: transparent; border: 0; padding: 0; text-align: start; cursor: pointer; font: inherit;
}
.mem-title {
  font-size: 15.5px; font-weight: 650; letter-spacing: -.01em; color: var(--settings-ink);
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.mem-state { font-size: 12px; color: var(--settings-muted); }
.mem-card-body {
  display: grid; gap: 8px; background: transparent; border: 0; padding: 0;
  text-align: start; cursor: pointer; font: inherit;
}
.mem-content {
  font-size: 14px; line-height: 1.5; color: var(--settings-ink);
  display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden;
}
.mem-when { display: flex; align-items: flex-start; gap: 6px; font-size: 12.5px; line-height: 1.45; color: var(--settings-muted); }
.mem-when-tag {
  flex: none; padding: 2px 8px; border-radius: 999px; font-size: 11px; font-weight: 600;
  background: var(--settings-line); color: var(--settings-ink);
}
.mem-card-foot { display: flex; gap: 8px; padding-top: 2px; }
.mem-act {
  display: inline-flex; align-items: center; gap: 6px; padding: 6px 12px; border: 0;
  border-radius: 999px; background: var(--settings-line); color: var(--settings-ink);
  font: inherit; font-size: 12.5px; font-weight: 600; cursor: pointer;
  transition: background .18s ease, color .18s ease;
}
.mem-act > svg { width: 14px; height: 14px; }
.mem-act:active { transform: scale(.97); }
.mem-act-danger { color: oklch(.55 .19 25); }
.mem-empty { display: grid; justify-items: center; gap: 8px; padding: 34px 22px 28px; text-align: center; }
.mem-empty-tile {
  width: 58px; height: 58px; display: grid; place-items: center; border-radius: 20px;
  background: var(--settings-line); color: var(--settings-violet); margin-bottom: 4px;
}
.mem-empty-tile > svg { width: 27px; height: 27px; }
.mem-empty-title { margin: 0; font-size: 16.5px; font-weight: 700; color: var(--settings-ink); }
.mem-empty-sub { margin: 0 0 8px; font-size: 13.5px; line-height: 1.5; color: var(--settings-muted); max-width: 30ch; }
.mem-switch {
  position: relative; width: 44px; height: 26px; flex-shrink: 0; border-radius: 999px; border: 0; cursor: pointer;
  background: var(--settings-line); transition: background .2s ease;
}
.mem-switch.is-on { background: var(--settings-violet); }
.mem-switch-knob {
  position: absolute; top: 3px; inset-inline-start: 3px; width: 20px; height: 20px; border-radius: 999px;
  background: var(--settings-surface); box-shadow: 0 1px 3px rgba(0,0,0,.24);
  transition: inset-inline-start .2s cubic-bezier(.32,.72,.35,1);
}
.mem-switch.is-on .mem-switch-knob { inset-inline-start: 21px; }
.mem-save-pill { width: auto; min-height: 40px; padding: 0 16px; font-size: 13px; gap: 6px; }
.mem-fields { gap: 16px; }
.mem-textarea { resize: none; }
.mem-del-btn { width: auto; min-height: 40px; padding: 0 16px; font-size: 13px; align-self: flex-start; }
`;
