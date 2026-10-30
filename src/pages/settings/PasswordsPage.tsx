/** @doc Settings → Passwords: every login the agent created for the user, plus manual entries. */
import { useCallback, useEffect, useState } from "react";
import { Copy, Eye, EyeOff, KeyRound, Plus, RefreshCw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { SubShell, SubSection } from "@/components/settings/SubShell";
import {
  deleteCredential,
  generatePassword,
  listCredentials,
  saveCredential,
  type AgentCredential,
} from "@/lib/agentkernel/credentials";

export default function PasswordsPage() {
  const [rows, setRows] = useState<AgentCredential[]>([]);
  const [shown, setShown] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState({ site: "", login_email: "", password: "" });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setRows(await listCredentials());
    } catch {
      toast.error("Couldn't load your passwords");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const copy = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success("Copied");
    } catch {
      toast.error("Copying isn't available");
    }
  };

  const add = async () => {
    if (!draft.site.trim() || !draft.login_email.trim() || !draft.password.trim()) {
      toast.error("Fill in the site, email and password");
      return;
    }
    try {
      await saveCredential(draft);
      setDraft({ site: "", login_email: "", password: "" });
      setAdding(false);
      await load();
    } catch {
      toast.error("Couldn't save");
    }
  };

  const remove = async (id: string) => {
    await deleteCredential(id);
    setRows((prev) => prev.filter((r) => r.id !== id));
  };

  return (
    <SubShell
      title="Passwords"
      subtitle="Every account the agent creates is registered with your Megsy email and a strong password, and it is saved here so you can come back to it anytime."
    >
      <SubSection title="Saved logins">
        <div className="gx-card">
          {loading ? (
            <div className="gx-loading">{"Loading…"}</div>
          ) : rows.length === 0 ? (
            <div className="gx-empty">
              <KeyRound className="w-6 h-6" strokeWidth={1.6} />
              <span>No saved passwords yet.</span>
            </div>
          ) : (
            rows.map((row) => (
              <div key={row.id} className="gx-row gx-tone-blue">
                <span className="gx-tile">
                  <KeyRound strokeWidth={1.7} />
                </span>
                <span className="gx-row-body">
                  <span className="gx-row-label">{row.site}</span>
                  <span className="gx-row-hint">{row.login_email}</span>
                  <span className="gx-row-hint font-mono">
                    {shown[row.id] ? row.password : "••••••••••••"}
                  </span>
                </span>
                <span className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    aria-label="Show password"
                    onClick={() => setShown((s) => ({ ...s, [row.id]: !s[row.id] }))}
                    className="gx-hbtn gx-hbtn-sm"
                  >
                    {shown[row.id] ? (
                      <EyeOff className="gx-hicon" strokeWidth={1.8} />
                    ) : (
                      <Eye className="gx-hicon" strokeWidth={1.8} />
                    )}
                  </button>
                  <button
                    type="button"
                    aria-label="Copy password"
                    onClick={() => void copy(row.password)}
                    className="gx-hbtn gx-hbtn-sm"
                  >
                    <Copy className="gx-hicon" strokeWidth={1.8} />
                  </button>
                  <button
                    type="button"
                    aria-label="Delete"
                    onClick={() => void remove(row.id)}
                    className="gx-hbtn gx-hbtn-sm"
                  >
                    <Trash2 className="gx-hicon" strokeWidth={1.8} />
                  </button>
                </span>
              </div>
            ))
          )}
        </div>
      </SubSection>

      <SubSection title="Add a password">
        {adding ? (
          <div className="gx-card gx-card-pad">
            <div className="gx-field">
              <input
                className="gx-input"
                placeholder="Site (example.com)"
                value={draft.site}
                onChange={(e) => setDraft((d) => ({ ...d, site: e.target.value }))}
              />
            </div>
            <div className="gx-field">
              <input
                className="gx-input"
                placeholder="Email"
                value={draft.login_email}
                onChange={(e) => setDraft((d) => ({ ...d, login_email: e.target.value }))}
              />
            </div>
            <div className="gx-field">
              <div className="flex items-center gap-2">
                <input
                  className="gx-input"
                  placeholder="Password"
                  value={draft.password}
                  onChange={(e) => setDraft((d) => ({ ...d, password: e.target.value }))}
                />
                <button
                  type="button"
                  aria-label="Generate password"
                  onClick={() => setDraft((d) => ({ ...d, password: generatePassword() }))}
                  className="gx-hbtn shrink-0"
                >
                  <RefreshCw className="gx-hicon" strokeWidth={1.8} />
                </button>
              </div>
            </div>
            <div className="gx-actions pt-1">
              <button type="button" onClick={() => void add()} className="gx-pill">
                Save
              </button>
              <button type="button" onClick={() => setAdding(false)} className="gx-pill">
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button type="button" onClick={() => setAdding(true)} className="gx-pill gx-pill-wide">
            <Plus className="gx-hicon" strokeWidth={2} /> Add password
          </button>
        )}
      </SubSection>
    </SubShell>
  );
}
