/** Credit top-up packs for Pro members (Kashier checkout by sku). */
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { invokeFunction } from "@/lib/supabaseFunction";
import { openCheckoutUrl } from "@/lib/openCheckout";
import { translateExactText, useUserLang } from "@/lib/authI18n";

export const CREDIT_PACKS = [
  { sku: "pack_500", credits: 500, price: 9, note: "" },
  { sku: "pack_1200", credits: 1200, price: 19, note: "Most popular · save 12%" },
  { sku: "pack_3000", credits: 3000, price: 39, note: "Best value · save 28%" },
];

export default function CreditPacks({ isPro }: { isPro: boolean }) {
  const lang = useUserLang();
  const t = (s: string) => translateExactText(s, lang);
  const [loading, setLoading] = useState<string | null>(null);

  const buy = async (sku: string) => {
    if (!isPro) {
      window.location.href = "/pricing";
      return;
    }
    setLoading(sku);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        window.location.href = "/auth?redirect=/usage";
        return;
      }
      const { data, error } = await invokeFunction("kashier-checkout", {
        body: { kind: "checkout", sku, provider: "kashier", method: "card", display: "en", tier: "pro", interval: "monthly" },
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (error) throw error;
      const url = data?.url || data?.checkout_url;
      if (!url) throw new Error(data?.error || "Checkout failed");
      openCheckoutUrl(url);
    } catch (e: any) {
      toast.error(e?.message || t("Failed to open checkout. Please try again."));
    } finally {
      setLoading(null);
    }
  };

  return (
    <section className="py-10">
      <h2 className="text-[22px] font-semibold">{t("Top up credits")}</h2>
      <p className="mt-2 text-[13px] text-muted-foreground">
        {isPro ? t("Purchased credits never expire.") : t("Credit packs are available for Pro members.")}
      </p>
      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        {CREDIT_PACKS.map((p) => (
          <button
            key={p.sku}
            onClick={() => buy(p.sku)}
            disabled={loading !== null}
            className={`flex flex-col items-start rounded-2xl border p-5 text-start transition-colors disabled:opacity-60 ${
              p.sku === "pack_300" ? "border-foreground" : "border-border hover:border-foreground/50"
            }`}
          >
            <span className="h-4 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">{p.note && t(p.note)}</span>
            <span className="mt-2 text-[28px] font-semibold tabular-nums">{p.credits}</span>
            <span className="text-[13px] text-muted-foreground">{t("credits")}</span>
            <span className="mt-4 inline-flex items-center gap-2 text-[15px] font-semibold">
              {loading === p.sku ? <Loader2 className="h-4 w-4 animate-spin" /> : `$${p.price}`}
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}
