import { memo } from "react";

import { t as uiT, useUserLang } from "@/lib/authI18n";
import LoaderLetters from "./LoaderLetters";

interface ThinkingLoaderProps {
  searchStatus?: string;
}

const ThinkingLoader = ({ searchStatus }: ThinkingLoaderProps) => {
  const lang = useUserLang();
  const thinkingLabel = uiT("thinking", lang);
  const rtl = lang === "ar-eg";
  return (
    <div className="mtrace flex items-center gap-2.5 py-1" aria-live="polite" dir={rtl ? "rtl" : undefined}>
      <span className="mring" aria-hidden />
      <LoaderLetters text={searchStatus?.trim() || thinkingLabel} className="text-[13px] font-medium" />
    </div>
  );
};

export default memo(ThinkingLoader);
