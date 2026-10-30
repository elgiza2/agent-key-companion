/** @doc Referral earnings — verified invites and the credits they earned (20 each).
 *  Rendered with the shared glass vocabulary so it matches every settings surface. */
import { translateExactText, useUserLang } from "@/lib/authI18n";
import { GlassCard } from "@/components/profile/ProfileGlassShell";

export const CREDITS_PER_REFERRAL = 20;

export default function ReferralProgressBar({
  referrals,
  className = "",
}: {
  referrals: number;
  className?: string;
}) {
  const lang = useUserLang();
  const copy = (t: string) => translateExactText(t, lang);
  const earned = referrals * CREDITS_PER_REFERRAL;

  return (
    <GlassCard className={`gx-card-pad ${className}`}>
      <div className="gx-fact">
        <span className="gx-fact-label">{copy("Referrals")}</span>
        <span className="gx-fact-value" dir="ltr">
          {referrals}
        </span>
      </div>
      <div className="gx-fact">
        <span className="gx-fact-label">{copy("Credits earned")}</span>
        <span className="gx-fact-value" dir="ltr">
          +{earned}
        </span>
      </div>
      <p className="gx-field-hint">
        {copy("A friend counts after their first real use (an image, a video or an agent task).")}
      </p>
    </GlassCard>
  );
}
