import { useEffect, useRef } from "react";
import type { Location, NavigateFunction } from "react-router-dom";

/** Short starter the user edits before sending — never auto-sent. */
const AGENT_CREATION_STARTER = "I want to create an agent that ";

/** Drop a starter line into the composer once auth is ready; the user edits and sends it. */
export function useAgentCreationEntry(userId: string | null, location: Location, navigate: NavigateFunction, _send: (text: string) => void) {
  const consumed = useRef(false);
  useEffect(() => {
    if (!userId || consumed.current || !(location.state as { agentCreation?: boolean } | null)?.agentCreation) return;
    consumed.current = true;
    navigate("/chat", { replace: true, state: {} });
    requestAnimationFrame(() => {
      window.dispatchEvent(new CustomEvent("megsy:prefill-composer", { detail: { text: AGENT_CREATION_STARTER } }));
    });
  }, [userId, location.state, navigate]);
}
