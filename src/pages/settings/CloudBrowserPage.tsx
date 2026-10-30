/** @doc Cloud browser settings — session persistence and download controls, stored per account. */
import { useEffect, useState } from "react";
import { Download, LogIn } from "lucide-react";
import { SubShell, SubSection } from "@/components/settings/SubShell";
import { supabase } from "@/integrations/supabase/client";
import { notifyTurnContextChanged } from "@/lib/chat/turnContext";

const KEY = "megsy_cloud_browser_keep_signed_in";
const DL_KEY = "megsy_cloud_browser_allow_downloads";

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: () => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={onChange}
      className={[
        "relative inline-flex h-[30px] w-[50px] shrink-0 rounded-full transition-colors duration-200",
        checked ? "bg-primary" : "bg-[color:var(--settings-line)]",
      ].join(" ")}
    >
      <span
        className={[
          "inline-block h-[26px] w-[26px] rounded-full bg-[color:var(--settings-surface)] transition-transform duration-200",
          checked ? "translate-x-[22px]" : "translate-x-[2px]",
        ].join(" ")}
        style={{ marginTop: 2 }}
      />
    </button>
  );
}

export default function CloudBrowserPage() {
  const [keepSignedIn, setKeepSignedIn] = useState(false);
  const [allowDownloads, setAllowDownloads] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    // Optimistic local values first so the toggles never flash.
    try {
      setKeepSignedIn(localStorage.getItem(KEY) === "1");
      setAllowDownloads(localStorage.getItem(DL_KEY) !== "0");
    } catch {
      /* ignore */
    }
    let alive = true;
    (async () => {
      const { data } = await supabase.auth.getUser();
      const uid = data.user?.id ?? null;
      if (!alive) return;
      setUserId(uid);
      if (!uid) return;
      const { data: row } = await supabase
        .from("cloud_browser_settings")
        .select("keep_signed_in, allow_downloads")
        .eq("user_id", uid)
        .maybeSingle();
      if (!alive || !row) return;
      setKeepSignedIn(Boolean(row.keep_signed_in));
      setAllowDownloads(row.allow_downloads !== false);
    })();
    return () => {
      alive = false;
    };
  }, []);

  const persist = async (next: { keepSignedIn: boolean; allowDownloads: boolean }) => {
    try {
      localStorage.setItem(KEY, next.keepSignedIn ? "1" : "0");
      localStorage.setItem(DL_KEY, next.allowDownloads ? "1" : "0");
    } catch {
      /* ignore */
    }
    if (userId) {
      await supabase.from("cloud_browser_settings").upsert(
        {
          user_id: userId,
          keep_signed_in: next.keepSignedIn,
          allow_downloads: next.allowDownloads,
        },
        { onConflict: "user_id" },
      );
    }
    notifyTurnContextChanged();
  };

  return (
    <SubShell title="Cloud browser" subtitle="Session persistence and download controls for the cloud browser.">
      <SubSection title="Session">
        <div className="gx-card">
          <div className="gx-row gx-tone-blue">
            <span className="gx-tile">
              <LogIn strokeWidth={1.7} />
            </span>
            <span className="gx-row-body">
              <span className="gx-row-label">Keep me signed in across tasks</span>
            </span>
            <span className="gx-row-trailing">
              <Toggle
                checked={keepSignedIn}
                onChange={() => {
                  const next = !keepSignedIn;
                  setKeepSignedIn(next);
                  void persist({ keepSignedIn: next, allowDownloads });
                }}
                label="Keep me signed in across tasks"
              />
            </span>
          </div>
          <div className="gx-row gx-tone-green">
            <span className="gx-tile">
              <Download strokeWidth={1.7} />
            </span>
            <span className="gx-row-body">
              <span className="gx-row-label">Allow file downloads during tasks</span>
            </span>
            <span className="gx-row-trailing">
              <Toggle
                checked={allowDownloads}
                onChange={() => {
                  const next = !allowDownloads;
                  setAllowDownloads(next);
                  void persist({ keepSignedIn, allowDownloads: next });
                }}
                label="Allow file downloads during tasks"
              />
            </span>
          </div>
        </div>
      </SubSection>
    </SubShell>
  );
}
