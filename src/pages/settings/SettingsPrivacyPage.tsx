/** @doc Data & privacy — unified glass sub-page: usage note, policy links, delete account. */
import { useNavigate } from "react-router-dom";
import { ShieldCheck, Share2, FileText, ScrollText, UserRoundX } from "lucide-react";
import { translateExactText, useUserLang } from "@/lib/authI18n";
import {
  SubShell,
  SubSection,
  SubCard,
  SubRowList,
  SubRow,
} from "@/components/settings/SubShell";

export default function SettingsPrivacyPage() {
  const navigate = useNavigate();
  const lang = useUserLang();
  const isAr = lang === "ar-eg";
  const tx = (t: string) => translateExactText(t, lang);
  const ar = (a: string, e: string) => (isAr ? a : e);

  return (
    <SubShell title={ar("البيانات والخصوصية", "Data & privacy")} backTo="/settings">
      <SubSection title={ar("كيف نستخدم بياناتك", "How we use your data")}>
        <SubCard className="flex flex-col gap-3">
          <div className="flex items-start gap-3">
            <span className="gx-tile shrink-0">
              <ShieldCheck strokeWidth={1.7} />
            </span>
            <p className="text-[14px] leading-relaxed text-[color:var(--settings-muted)]">
              {ar(
                "بنستخدم رسايلك وملفاتك عشان Megsy يرد عليك وينفذ شغلك بس. محادثاتك خاصة بيك ومحدش غيرك يقدر يشوفها.",
                "We use your messages and files only to answer you and get your work done. Your chats are private to you.",
              )}
            </p>
          </div>
          <div className="flex items-start gap-3">
            <span className="gx-tile shrink-0">
              <Share2 strokeWidth={1.7} />
            </span>
            <p className="text-[14px] leading-relaxed text-[color:var(--settings-muted)]">
              {ar(
                "مش بنبيع بياناتك ومش بنستخدمها في إعلانات. بنبعت للمزودين اللي بيشغلوا الذكاء الاصطناعي اللازم بس لتنفيذ طلبك.",
                "We never sell your data or use it for ads. Only what's needed to run your request is sent to our AI providers.",
              )}
            </p>
          </div>
        </SubCard>
      </SubSection>

      <SubSection title={tx("Legal")}>
        <SubRowList>
          <SubRow
            icon={FileText}
            label={ar("سياسة الخصوصية", "Privacy policy")}
            onClick={() => navigate("/privacy")}
          />
          <SubRow
            icon={ScrollText}
            label={ar("شروط الخدمة", "Terms of service")}
            onClick={() => navigate("/terms")}
          />
        </SubRowList>
      </SubSection>

      <SubSection title={tx("Danger zone")}>
        <SubRowList>
          <SubRow
            icon={UserRoundX}
            label={ar("حذف الحساب", "Delete account")}
            danger
            onClick={() => navigate("/settings/delete-account")}
          />
        </SubRowList>
      </SubSection>
    </SubShell>
  );
}
