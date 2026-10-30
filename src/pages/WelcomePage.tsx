import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { useUserLang } from "@/lib/authI18n";

export const WELCOME_SEEN_KEY = "megsy_welcome_seen_v1";

const SLIDES = {
  en: [
    {
      t: "One calm place\nfor all your work.",
      d: "Chat, write and think with one AI agent that truly understands you.",
    },
    {
      t: "Create anything\nyou can imagine.",
      d: "Images, slides and websites — made in seconds from a single message.",
    },
    {
      t: "Your agent,\nalways by your side.",
      d: "Megsy Computer handles the busywork so you can focus on what matters.",
    },
  ],
  "ar-eg": [
    { t: "مكان هادي واحد\nلكل شغلك.", d: "اتكلم واكتب وفكّر مع وكيل ذكي واحد فاهمك بجد." },
    { t: "اعمل أي حاجة\nتتخيلها.", d: "صور وعروض ومواقع — بتتعمل في ثواني من رسالة واحدة." },
    { t: "وكيلك\nدايمًا جنبك.", d: "ميغسي كمبيوتر بيخلّص الشغل المتعب وانت ركّز في المهم." },
  ],
};
// Keep each restored image paired with its matching slide copy on every visit.
const IMAGES = [
  "/project-assets/welcome-hero-1.webp",
  "/project-assets/welcome-hero-2.webp",
  "/project-assets/welcome-hero-3.webp",
];

export default function WelcomePage() {
  const lang = useUserLang();
  const ar = lang === "ar-eg";
  const slides = SLIDES[lang] ?? SLIDES.en;
  const [i, setI] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    IMAGES.forEach((src) => {
      const im = new Image();
      im.src = src;
    });
  }, []);

  const finish = async () => {
    try {
      localStorage.setItem(WELCOME_SEEN_KEY, "1");
    } catch {
      /* ignore */
    }
    try {
      const { supabase } = await import("@/integrations/supabase/client");
      const { data } = await supabase.auth.getSession();
      navigate(data.session ? "/" : "/auth", { replace: true });
    } catch {
      navigate("/auth", { replace: true });
    }
  };
  const next = () => (i < slides.length - 1 ? setI(i + 1) : void finish());

  const s = slides[i];
  const ease = [0.22, 1, 0.36, 1] as const;

  const text = (
    <AnimatePresence mode="wait">
      <motion.div
        key={i}
        initial="hidden"
        animate="show"
        exit="exit"
        variants={{
          hidden: {},
          show: { transition: { staggerChildren: 0.09, delayChildren: 0.05 } },
          exit: { opacity: 0, y: -10, transition: { duration: 0.25, ease } },
        }}
      >
        <motion.h1
          className="welcome-title whitespace-pre-line"
          variants={{
            hidden: { opacity: 0, y: 22, filter: "blur(6px)" },
            show: { opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: 0.55, ease } },
          }}
        >
          {s.t}
        </motion.h1>
        <motion.p
          className="welcome-desc mt-4 max-w-[320px]"
          variants={{
            hidden: { opacity: 0, y: 16 },
            show: { opacity: 1, y: 0, transition: { duration: 0.5, ease } },
          }}
        >
          {s.d}
        </motion.p>
      </motion.div>
    </AnimatePresence>
  );

  const controls = (
    <div className="flex items-center justify-between">
      <div className="flex gap-1.5">
        {slides.map((_, k) => (
          <button
            key={k}
            aria-label={`Slide ${k + 1}`}
            onClick={() => setI(k)}
            className="h-[3px] w-6 rounded-full transition-colors duration-300"
            style={{ background: k === i ? "var(--w-fg)" : "var(--w-dim)" }}
          />
        ))}
      </div>
      <button onClick={next} className="welcome-btn">
        {i < slides.length - 1 ? (ar ? "متابعة" : "Continue") : ar ? "ابدأ الآن" : "Get started"}
      </button>
    </div>
  );

  const image = (cls: string) => (
    <AnimatePresence initial={false}>
      <motion.img
        key={i}
        src={IMAGES[i]}
        alt=""
        initial={{ opacity: 0, scale: 1.04 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.7, ease }}
        className={`welcome-hero-img absolute inset-0 h-full w-full object-cover ${cls}`}
      />
    </AnimatePresence>
  );

  return (
    <div className="welcome-root" dir={ar ? "rtl" : "ltr"}>
      {/* Mobile */}
      <div className="relative flex h-[100dvh] flex-col overflow-hidden md:hidden">
        {image("")}
        <div className="welcome-scrim absolute inset-0" />
        <div className="relative z-10 flex h-full flex-col px-6 pb-8 pt-[max(env(safe-area-inset-top),28px)]">
          <span className="welcome-logo">Megsy</span>
          <div className="mt-auto">{text}</div>
          <div className="mt-10">{controls}</div>
        </div>
      </div>

      {/* Desktop */}
      <div className="hidden h-[100dvh] gap-6 p-6 md:flex">
        <div className="flex flex-1 flex-col px-8 py-6">
          <span className="welcome-logo">Megsy</span>
          <div className="my-auto">{text}</div>
          {controls}
        </div>
        <div className="relative w-[44%] overflow-hidden rounded-[24px]">{image("")}</div>
      </div>
    </div>
  );
}
