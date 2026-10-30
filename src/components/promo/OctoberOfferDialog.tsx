import { useEffect, useState } from "react";
import { useUserLang } from "@/lib/authI18n";
import { Sheet, SheetContent, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ArrowUpRight } from "lucide-react";
import { isOctoberOfferActive, OCTOBER_OFFER_END } from "@/lib/octoberOffer";
import { getAuthState, subscribeAuthState } from "@/lib/authStore";

const dismissalKey = "megsy-october-6-2026-auth-sheet-seen";

export default function OctoberOfferDialog() {
  const ar = useUserLang() === "ar-eg";
  const [open, setOpen] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  useEffect(() => {
    const unsubscribe = subscribeAuthState((state) => setAuthenticated(state.resolved && state.authenticated));
    const state = getAuthState();
    setAuthenticated(state.resolved && state.authenticated);
    return () => { unsubscribe(); };
  }, []);
  useEffect(() => {
    setOpen(false);
    if (!authenticated) return;
    if (!isOctoberOfferActive()) return;
    try { if (!localStorage.getItem(dismissalKey)) setOpen(true); } catch { setOpen(true); }
    const timer = setTimeout(() => setOpen(false), Math.max(0, OCTOBER_OFFER_END - Date.now()));
    return () => clearTimeout(timer);
  }, [authenticated]);
  const close = () => { setOpen(false); try { localStorage.setItem(dismissalKey, "1"); } catch {} };
  return <Sheet open={authenticated && open} onOpenChange={(v) => { if (!v) close(); }}>
    <SheetContent
      side="bottom"
      className="megsy-october-sheet"
      dir={ar ? "rtl" : "ltr"}
      data-no-translate
      onPointerDownOutside={(e) => e.preventDefault()}
      onInteractOutside={(e) => e.preventDefault()}
      onEscapeKeyDown={(e) => e.preventDefault()}
    >
      <div className="october-sheet-handle" aria-hidden="true" />
      <div className="october-sheet-inner">
        <img src="/promo/october-6.png" alt={ar ? "تصميم ذكرى ٦ أكتوبر: أنور السادات وعبد الفتاح السيسي وعلم مصر والقاهرة" : "October 6 commemorative artwork with Anwar Sadat, Abdel Fattah el-Sisi, Egypt’s flag and Cairo"} width={1365} height={768} className="october-sheet-artwork" />
        <div className="october-sheet-copy">
          <div className="october-sheet-eyebrow">
            <span>{ar ? "٦ أكتوبر 🇪🇬" : "OCTOBER 6 🇪🇬"}</span>
          </div>
          <SheetTitle className="october-sheet-title">{ar ? "يوم النصر… وهديتك وصلت" : "Victory day — your gift is here"}</SheetTitle>
          <SheetDescription className="october-sheet-description">{ar ? "٢٤ ساعة كل حاجة مجانية وبلا حدود. عدا الصور والفيديو." : "24 hours, everything free and unlimited. Except images and video."}</SheetDescription>
          <div className="october-sheet-footer"><Button variant="neutral" onClick={close}>{ar ? "يلا نبدأ" : "Let’s go"}<ArrowUpRight size={16} /></Button></div>
        </div>
      </div>
    </SheetContent>
  </Sheet>;
}