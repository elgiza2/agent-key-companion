/**
 * @doc The hello every signed-in person gets the first time they land.
 * A fresh storage key means every existing account sees it once, exactly like
 * a brand-new signup, and it never repeats afterwards.
 */
import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AgentOrb } from "@/components/agent/AgentOrb";
import { useDynamicNotifications } from "./DynamicNotifications";

/** Bump the version to greet everyone again. */
const WELCOME_KEY = "megsy_welcome_notice_v1";
/** Off = one greeting per account, ever. Flip it on only to review the card. */
const ALWAYS_SHOW = false;

export default function FirstRunWelcome() {
  const { trigger } = useDynamicNotifications();
  const navigate = useNavigate();
  const greeted = useRef<string | null>(null);

  useEffect(() => {
    let alive = true;

    const greet = (userId: string) => {
      if (!alive || greeted.current === userId) return;
      const key = `${WELCOME_KEY}:${userId}`;
      let seen = false;
      try {
        seen = Boolean(localStorage.getItem(key));
        localStorage.setItem(key, String(Date.now()));
      } catch {
        // Storage can be unavailable (private mode) — the greeting still shows.
      }
      if (seen && !ALWAYS_SHOW) return;
      greeted.current = userId;
      window.setTimeout(() => {
        if (!alive) return;
        trigger({
          id: "first-run-welcome",
          title: "Welcome to Megsy",
          message: "I'm your personal assistant. Ask me anything and I'll get it done.",
          leading: <AgentOrb color="aurora" size={34} state="hello" />,
          duration: 6000,
          onPress: () => navigate("/chat"),
        });
      }, 1100);
    };

    void supabase.auth.getSession().then(({ data }) => {
      const id = data.session?.user?.id;
      if (id) greet(id);
    });

    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      const id = session?.user?.id;
      if (id) greet(id);
    });

    return () => {
      alive = false;
      data.subscription.unsubscribe();
    };
  }, [trigger, navigate]);

  return null;
}
