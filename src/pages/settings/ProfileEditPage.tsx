/** @doc Profile editor — full name, photo, delete account. Manual save pill lights up when the name changes. */
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Check, ChevronLeft, Camera, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { sanitizeErrorMessage } from "@/lib/sanitizeError";
import { useIsMobile } from "@/hooks/use-mobile";
import { SubShell, SubSection, SubCard, DangerCallout } from "@/components/settings/SubShell";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { translateExactText, useUserLang } from "@/lib/authI18n";

const ProfileEditPage = () => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const lang = useUserLang();
  const isAr = lang === "ar-eg";
  const tx = (text: string) => translateExactText(text, lang);

  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [fullName, setFullName] = useState("");

  const savedRef = useRef({ fullName: "" });
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [failedAvatar, setFailedAvatar] = useState<string | null>(null);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);

  // Load data
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || cancelled) {
        setLoading(false);
        return;
      }
      setUserId(user.id);
      setAvatarUrl(user.user_metadata?.avatar_url ?? null);

      const profileRes = await supabase
        .from("profiles")
        .select("display_name, avatar_url")
        .eq("id", user.id)
        .maybeSingle();
      if (cancelled) return;

      if ((profileRes.data as any)?.avatar_url) setAvatarUrl((profileRes.data as any).avatar_url);

      const initialFull =
        (profileRes.data as any)?.display_name ||
        user.user_metadata?.full_name ||
        user.email?.split("@")[0] ||
        "";

      setFullName(initialFull);
      savedRef.current = { fullName: initialFull };
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  // Manual save — the pill stays pale until there are unsaved edits.
  const dirty = !loading && userId != null && fullName.trim() !== savedRef.current.fullName.trim();

  const handleSave = async () => {
    if (!userId || !dirty || saveState === "saving") return;
    setSaveState("saving");
    try {
      const results = await Promise.all([
        Promise.resolve(
          supabase.rpc("update_profile_safe", {
            p_user_id: userId,
            p_display_name: fullName.trim(),
          }),
        ),
        supabase.auth.updateUser({ data: { full_name: fullName.trim() } }),
      ]);
      const err = results.find((r: any) => r?.error)?.error;
      if (err) throw err;

      const { invalidateOwnProfile } = await import("@/lib/ownProfile");
      invalidateOwnProfile();
      savedRef.current = { fullName };
      setSaveState("saved");
      setTimeout(() => setSaveState("idle"), 1400);
    } catch (err: any) {
      setSaveState("idle");
      toast.error(sanitizeErrorMessage(err, "Failed to save"));
    }
  };

  const goBack = () => navigate("/settings");

  const pickAvatar = () => fileRef.current?.click();

  const handleAvatarFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !userId) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image file");
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      toast.error("Image is too large (max 15MB)");
      return;
    }
    setAvatarBusy(true);
    try {
      // Telegram links expire, so store a compact, permanent JPEG data URL.
      const url = await compressAvatar(file);
      const { error: rpcErr } = await supabase.rpc("update_profile_safe", {
        p_user_id: userId,
        p_avatar_url: url,
      });
      if (rpcErr) throw rpcErr;
      await supabase.auth.updateUser({ data: { avatar_url: null } }).catch(() => {});
      const { data: check } = await supabase
        .from("profiles").select("avatar_url").eq("id", userId).maybeSingle();
      if ((check as any)?.avatar_url !== url) throw new Error("Photo was not saved");
      const { invalidateOwnProfile } = await import("@/lib/ownProfile");
      invalidateOwnProfile();
      setAvatarUrl(url);
      toast.success("Profile photo updated");
    } catch (err: any) {
      toast.error(sanitizeErrorMessage(err, "Failed to update photo"));
    } finally {
      setAvatarBusy(false);
    }
  };

  const openDelete = () => setConfirmOpen(true);
  const confirmDelete = () => {
    setConfirmOpen(false);
    navigate("/settings/delete-account");
  };


  // ============================== MOBILE ==============================
  if (isMobile) {
    const initial = (fullName || "U").trim().charAt(0).toUpperCase();
    return (
      <div className="pep-root" dir={isAr ? "rtl" : "ltr"}>
        <style>{pepCss}</style>

        {/* Sheet — opens as a stacked layer over the settings page */}
        <div className="pep-sheet">
        <header className="pep-topbar">
          <button className="pep-icon-btn" aria-label={tx("Back")} onClick={goBack}>
            <ChevronLeft className="pep-chev" strokeWidth={2.1} />
          </button>
          <h1 className="pep-title">{tx("Account")}</h1>
          <button
            type="button"
            className={`pep-save${dirty || saveState !== "idle" ? " pep-save-live" : ""}`}
            aria-live="polite"
            disabled={!dirty || saveState === "saving"}
            onClick={handleSave}
          >
            {saveState === "saving" ? (
              <Loader2 className="pep-spin animate-spin" />
            ) : saveState === "saved" ? (
              <Check strokeWidth={2.4} />
            ) : (
              tx("Save")
            )}
          </button>
        </header>

        <main className="pep-main">
          <section className="pep-card">
            <button type="button" className="pep-row pep-row-btn" onClick={pickAvatar} disabled={avatarBusy}>
              <span className="pep-avatar">
                {avatarUrl && failedAvatar !== avatarUrl ? <img src={avatarUrl} alt="" className="pep-avatar-img" onError={() => setFailedAvatar(avatarUrl)} /> : initial}
              </span>
              <span className="pep-row-label">{tx("Profile photo")}</span>
              <span className="pep-row-trailing">
                {avatarBusy ? (
                  <Loader2 className="pep-spin animate-spin" />
                ) : (
                  <Camera className="pep-row-ico" strokeWidth={1.7} />
                )}
                {avatarBusy ? tx("Uploading…") : tx("Change")}
              </span>
            </button>
          </section>

          <section className="pep-card">
            <div className="pep-row">
              <label htmlFor="pep-full" className="pep-row-label">{tx("Full name")}</label>
              <input
                id="pep-full"
                className="pep-row-input"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder={tx("Your name")}
                autoComplete="name"
              />
            </div>
          </section>
          <p className="pep-hint">{tx("Megsy calls you by this name in chat.")}</p>

          <button className="pep-danger" type="button" onClick={openDelete}>
            <Trash2 className="pep-danger-ico" strokeWidth={1.7} />
            <span>{tx("Delete account")}</span>
          </button>

          <div className="pep-spacer" />
        </main>
        </div>

        <input ref={fileRef} type="file" accept="image/*" hidden onChange={handleAvatarFile} />

        <ConfirmDialog
          open={confirmOpen}
          tone="danger"
          title={tx("Delete account")}
          description={tx("This permanently removes your account, chats and files. This cannot be undone.")}
          confirmLabel={tx("Delete")}
          onConfirm={confirmDelete}
          onCancel={() => setConfirmOpen(false)}
        />
      </div>
    );
  }


  // ============================== DESKTOP ==============================
  return (
    <SubShell
      title={tx("Account")}
      subtitle={tx("Changes are saved automatically.")}
      backTo="/settings"
      action={
        <button
          type="button"
          onClick={handleSave}
          disabled={!dirty || saveState === "saving"}
          className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[12.5px] font-medium border transition-all duration-300 ${
            dirty || saveState !== "idle"
              ? "bg-foreground text-background border-foreground"
              : "bg-muted/50 text-muted-foreground border-border/60"
          }`}
        >
          {saveState === "saving" && (<><Loader2 className="w-3.5 h-3.5 animate-spin" /> {tx("Saving…")}</>)}
          {saveState === "saved" && (<><Check className="w-3.5 h-3.5" /> {tx("Saved")}</>)}
          {saveState === "idle" && tx("Save")}
        </button>
      }
    >
      <SubSection title={tx("Photo")} description={tx("Shown across Megsy.")}>
        <SubCard>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={pickAvatar}
              disabled={avatarBusy}
              className="relative w-16 h-16 rounded-full overflow-hidden border border-border/70 bg-muted grid place-items-center text-[22px] font-medium text-foreground"
              aria-label={tx("Change profile photo")}
            >
              {avatarUrl ? (
                <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                (fullName || "U").trim().charAt(0).toUpperCase()
              )}
              {avatarBusy && (
                <span className="absolute inset-0 grid place-items-center bg-background/60">
                  <Loader2 className="w-4 h-4 animate-spin" />
                </span>
              )}
            </button>
            <div>
              <button
                type="button"
                onClick={pickAvatar}
                disabled={avatarBusy}
                className="px-3.5 py-2 rounded-lg text-[13px] font-medium bg-background/60 border border-border/70 hover:border-foreground/40 transition-colors inline-flex items-center gap-2"
              >
                <Camera className="w-3.5 h-3.5" /> {tx("Upload photo")}
              </button>
              <p className="mt-2 text-[12px] text-muted-foreground">{tx("PNG or JPG, up to 5MB.")}</p>
            </div>
          </div>
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={handleAvatarFile} />
        </SubCard>
      </SubSection>

      <SubSection title={tx("Name")} description={tx("How Megsy addresses you.")}>
        <SubCard>
          <div>
            <label className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground font-medium">
              {tx("Full name")}
            </label>
            <input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder={tx("Your name")}
              className="mt-2 w-full px-3.5 py-2.5 rounded-lg bg-background/60 border border-border/70 text-[14px] text-foreground outline-none focus:border-foreground/40 transition-colors"
            />
            <p className="mt-2 text-[12px] text-muted-foreground">
              {tx("Megsy calls you by this name in chat.")}
            </p>
          </div>
        </SubCard>
      </SubSection>

      <SubSection title={tx("Danger zone")} description={tx("Irreversible actions.")}>
        <DangerCallout
          title={tx("Delete account")}
          description={tx("Permanently remove your account and all associated data.")}
          action={
            <button
              onClick={openDelete}
              className="px-4 py-2 rounded-lg text-[13px] font-medium bg-rose-500/10 text-rose-300 border border-rose-500/30 hover:bg-rose-500/20 transition-colors"
            >
              {tx("Delete account")}
            </button>
          }
        />
      </SubSection>

      <ConfirmDialog
        open={confirmOpen}
        tone="danger"
        title={tx("Delete account")}
        description={tx("This permanently removes your account, chats and files. This cannot be undone.")}
        confirmLabel={tx("Delete")}
        onConfirm={confirmDelete}
        onCancel={() => setConfirmOpen(false)}
      />
    </SubShell>
  );
};

export const pepCss = `
/* Account editor — same glass canvas as the settings home so it reads as an
   open section of that page. Reuses the settings-home tokens. */
.pep-root {
  position: fixed; inset: 0; z-index: 80;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  color: var(--settings-ink);
  font-family: -apple-system, "SF Pro Display", Inter, "Segoe UI", Roboto, sans-serif;
}
.pep-root::before {
  content: "";
  position: fixed; inset: 0; z-index: 0;
  background: color-mix(in oklab, var(--settings-backdrop) 45%, transparent);
  backdrop-filter: blur(10px) saturate(1.1);
  -webkit-backdrop-filter: blur(10px) saturate(1.1);
  animation: pep-scrim .35s ease both;
}
.pep-sheet {
  position: relative; z-index: 1;
  min-height: 100%;
  margin-top: 14px;
  background: var(--settings-backdrop);
  background-attachment: fixed;
  border-radius: 26px 26px 0 0;
  box-shadow: 0 -24px 60px color-mix(in oklab, var(--settings-ink) 22%, transparent);
  overflow: hidden;
  animation: pep-sheet-in .5s cubic-bezier(.22,1,.36,1) both;
  padding-bottom: env(safe-area-inset-bottom, 0px);
}
@keyframes pep-sheet-in {
  from { opacity: .4; translate: 0 7%; scale: .97; }
  to   { opacity: 1; translate: 0 0; scale: 1; }
}
@keyframes pep-scrim {
  from { opacity: 0; }
  to   { opacity: 1; }
}
.pep-topbar {
  position: sticky; top: 0; z-index: 5;
  display: grid; grid-template-columns: 46px 1fr auto;
  align-items: center;
  padding: max(20px, env(safe-area-inset-top)) 20px 16px;
}
.pep-title {
  margin: 0;
  text-align: center;
  font-size: 22px; font-weight: 600;
  letter-spacing: 0;
  color: var(--settings-ink);
}
.pep-icon-btn {
  width: 46px; height: 46px;
  display: inline-grid; place-items: center;
  border-radius: 50%;
  background: var(--settings-surface);
  border: 1px solid var(--settings-glass-edge);
  box-shadow: var(--settings-shadow);
  backdrop-filter: var(--settings-frost);
  color: var(--settings-ink);
  cursor: pointer;
  transition: transform .25s cubic-bezier(.22,1,.36,1);
}
.pep-icon-btn:active { transform: scale(.93); }
.pep-chev { width: 24px; height: 24px; }
[dir="rtl"] .pep-chev { transform: scaleX(-1); }

.pep-save {
  justify-self: end;
  min-width: 46px;
  height: 46px;
  padding: 0 17px;
  display: inline-flex; align-items: center; justify-content: center;
  border-radius: 999px;
  background: var(--settings-surface);
  border: 1px solid var(--settings-glass-edge);
  box-shadow: var(--settings-shadow);
  backdrop-filter: var(--settings-frost);
  color: var(--settings-muted);
  font: inherit;
  font-size: 14.5px; font-weight: 600;
  cursor: pointer;
  opacity: .8;
  transition: background .3s ease, color .3s ease, opacity .3s ease, border-color .3s ease, transform .25s cubic-bezier(.22,1,.36,1);
}
.pep-save:disabled { cursor: default; }
.pep-save:not(:disabled):active { transform: scale(.94); }
.pep-save-live {
  background: var(--settings-ink);
  border-color: var(--settings-ink);
  color: var(--settings-backdrop);
  opacity: 1;
  animation: pep-save-pop .35s cubic-bezier(.34,1.56,.64,1) both;
}
@keyframes pep-save-pop {
  from { transform: scale(.9); }
  to   { transform: scale(1); }
}
.pep-save svg { width: 18px; height: 18px; }
.pep-spin { width: 18px; height: 18px; }

.pep-main {
  padding: 0 20px;
  display: flex; flex-direction: column; gap: 14px;
}
.pep-card {
  background: var(--settings-surface);
  border: 1px solid var(--settings-glass-edge);
  border-radius: 20px;
  overflow: hidden;
  box-shadow: var(--settings-shadow);
  backdrop-filter: var(--settings-frost);
  animation: pep-in .4s cubic-bezier(.22,1,.36,1) both;
}
@keyframes pep-in {
  from { opacity: 0; translate: 0 8px; }
  to   { opacity: 1; translate: 0 0; }
}

.pep-row {
  display: flex; align-items: center; gap: 13px;
  padding: 11px 16px;
  min-height: 56px;
}
.pep-row-btn {
  width: 100%;
  border: 0; background: transparent;
  color: var(--settings-ink);
  font: inherit; text-align: start;
  cursor: pointer;
  transition: background .2s;
}
.pep-row-btn:active:not(:disabled) { background: var(--settings-line); }
.pep-row-btn:disabled { opacity: .7; }

.pep-avatar {
  width: 40px; height: 40px; border-radius: 50%;
  overflow: hidden; flex-shrink: 0;
  display: grid; place-items: center;
  background: var(--settings-line);
  color: var(--settings-ink);
  font-size: 17px; font-weight: 600;
}
.pep-avatar-img { width: 100%; height: 100%; object-fit: cover; display: block; }

.pep-row-label {
  font-size: 15px; font-weight: 450;
  color: var(--settings-ink);
  flex-shrink: 0;
}
.pep-row-trailing {
  margin-inline-start: auto;
  display: inline-flex; align-items: center; gap: 6px;
  font-size: 13.5px;
  color: var(--settings-muted);
}
.pep-row-ico { width: 16px; height: 16px; }

/* Scoped input overrides so app-theme input rules don't repaint the field. */
.pep-root .pep-row-input {
  flex: 1;
  min-width: 0;
  background: transparent !important;
  background-image: none !important;
  border: 0 !important;
  outline: none;
  color: var(--settings-ink) !important;
  font: inherit;
  font-size: 15px; font-weight: 500;
  text-align: end;
  -webkit-appearance: none;
  appearance: none;
  box-shadow: none !important;
  caret-color: var(--settings-ink);
}
.pep-root .pep-row-input::placeholder { color: var(--settings-muted) !important; }
.pep-root .pep-row-input:-webkit-autofill,
.pep-root .pep-row-input:-webkit-autofill:hover,
.pep-root .pep-row-input:-webkit-autofill:focus {
  -webkit-box-shadow: 0 0 0 1000px transparent inset;
  -webkit-text-fill-color: var(--settings-ink);
  caret-color: var(--settings-ink);
}

.pep-hint {
  margin: -6px 8px 0;
  font-size: 12.5px;
  line-height: 1.45;
  color: var(--settings-muted);
}

.pep-danger {
  display: flex; align-items: center; gap: 10px;
  width: 100%;
  padding: 13px 16px;
  border-radius: 20px;
  border: 1px solid var(--settings-glass-edge);
  background: var(--settings-surface);
  box-shadow: var(--settings-shadow);
  backdrop-filter: var(--settings-frost);
  color: var(--settings-red);
  font: inherit;
  font-size: 15px; font-weight: 450;
  cursor: pointer;
  transition: transform .25s cubic-bezier(.22,1,.36,1), background .2s;
}
.pep-danger:active { transform: scale(.98); }
.pep-danger-ico { width: 18px; height: 18px; }

.pep-spacer { height: max(24px, env(safe-area-inset-bottom)); }

@media (prefers-reduced-motion: reduce) {
  .pep-card, .pep-root::before, .pep-root .pep-sheet, .pep-root .pep-save-live { animation: none; }
  .pep-root .pep-icon-btn, .pep-root .pep-danger, .pep-root .pep-row-btn, .pep-root .pep-save { transition: none; }
}
`;

export default ProfileEditPage;

async function compressAvatar(file: File): Promise<string> {
  const src = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((res, rej) => {
      const i = new Image();
      i.onload = () => res(i);
      i.onerror = () => rej(new Error("Could not read this image"));
      i.src = src;
    });
    const size = 320;
    const side = Math.min(img.naturalWidth, img.naturalHeight);
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Could not process image");
    ctx.drawImage(
      img,
      (img.naturalWidth - side) / 2,
      (img.naturalHeight - side) / 2,
      side, side, 0, 0, size, size,
    );
    return canvas.toDataURL("image/jpeg", 0.85);
  } finally {
    URL.revokeObjectURL(src);
  }
}
