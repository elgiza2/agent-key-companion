/** @doc Referral overview — invite artwork and live progress toward Pro.
 *  Uses the shared glass cards so the referral page reads like the settings pages. */
import { translateExactText, useUserLang } from "@/lib/authI18n";
import heroImage from "@/assets/megsy-referral-hero.jpg";
import { GlassCard } from "@/components/profile/ProfileGlassShell";
import ReferralProgressBar from "@/components/billing/ReferralProgressBar";
import ReferralCreditRewards from "@/components/billing/ReferralCreditRewards";
import { useReferrals } from "@/pages/billing/ReferralsPage";

export default function DashboardTab() {
  const lang = useUserLang();
  const copy = (text: string) => translateExactText(text, lang);
  const { milestone } = useReferrals();

  return (
    <div className="flex flex-col gap-[22px]">
      <GlassCard className="ref-hero">
        <img
          src={heroImage}
          alt={copy("Megsy Pro invitation artwork")}
          width={1280}
          height={960}
          loading="lazy"
          decoding="async"
          className="block w-full"
        />
      </GlassCard>

      <ReferralProgressBar referrals={milestone.referrals} />

      <ReferralCreditRewards />

    </div>
  );
}
