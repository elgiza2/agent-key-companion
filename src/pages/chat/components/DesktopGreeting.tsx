import { useEffect, useState } from "react";
import { m as motion } from "framer-motion";
import { useUserLang } from "@/lib/authI18n";
import { useLocation } from "react-router-dom";
import { AgentOrb, type OrbState } from "@/components/agent/AgentOrb";
import { useWorkspaceStore } from "@/lib/agentsky/store";

interface DesktopGreetingProps {
  userName: string | null | undefined;
  isFirstVisit: boolean;
  returningGreetingIdx: number;
}

// Keys resolved through the shared UI dictionary so the hero line follows the
// user's language instead of always rendering English.

/**
 * Chat empty-state greeting. The line changes once per page entry and then
 * stays fixed. Renders above the centered composer on desktop and centered
 * in the middle of the screen on mobile (positioned by ChatComposerSection).
 */
export const DesktopGreeting = ({ userName }: DesktopGreetingProps) => {
  const lang = useUserLang();
  const [presence, setPresence] = useState<OrbState>("hello");
  const location = useLocation();
  const { agents, tier } = useWorkspaceStore();
  const agentId = new URLSearchParams(location.search).get("agent");
  const agent = (tier === "pro" ? agents.find((item) => item.id === agentId) : undefined) ?? agents.find((item) => item.isDefault);

  useEffect(() => {
    setPresence("hello");
    const hello = window.setTimeout(() => setPresence("idle"), 2600);
    const sleep = window.setTimeout(() => setPresence("sleeping"), 15000);
    return () => { window.clearTimeout(hello); window.clearTimeout(sleep); };
  }, [agent?.id]);



  return (
    <>
      {/* Flat unified surface — decorative wave removed. */}

      <div className="relative z-[7] flex items-center justify-center px-6 md:pb-6 w-full">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          className="relative flex flex-col items-center text-center max-w-4xl mx-auto"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.86 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="mb-5 md:mb-6 p-4"
            onPointerEnter={() => setPresence("hello")}
            onPointerLeave={() => setPresence("idle")}
          >
            <AgentOrb size={88} state={presence} color={agent?.isDefault ? "aurora" : agent?.color ?? "aurora"} className="ag-orb--chat" />
          </motion.div>
          <p className="mb-2 text-sm text-muted-foreground">{lang === "ar-eg" ? `أهلاً${userName ? ` يا ${userName.split(" ")[0]}` : ""}، أنا ${agent?.name ?? "Megsy"}` : `Hello${userName ? `, ${userName.split(" ")[0]}` : ""}. I'm ${agent?.name ?? "Megsy"}`}</p>

        </motion.div>
      </div>
    </>
  );
};

export default DesktopGreeting;
