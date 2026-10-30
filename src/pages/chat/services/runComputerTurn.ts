/** @doc Chat turn handler that runs a request on the Computer Agent and renders
 * a live run card. The turn is split into clearly separate stages:
 *   1. a model-written intro saying what it is about to do,
 *   2. a short model-written step plan,
 *   3. the live run (screen + steps),
 *   4. a model-written wrap-up (rendered by the run card).
 */
import { toast } from "sonner";
import { stripComputerMention } from "@/lib/computer/shouldUseComputer";
import type { Message } from "../chatConstants";
import { PENDING_COMPUTER_RUN } from "@/lib/computer/activeRun";
import { clearComputerLiveView } from "@/lib/computer/liveView";
import type { AttachedFile } from "../hooks/useAttachments";

export interface RunComputerArgs {
  text: string;
  userMsg: Message;
  localTurnId: string;
  attachments?: string[];
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  setInput: (v: string) => void;
  setAttachedFiles: React.Dispatch<React.SetStateAction<AttachedFile[]>>;
  createOrUpdateConversation: (title: string) => Promise<string | null>;
  saveMessage: (
    cid: string,
    role: string,
    content: string,
    modelId?: unknown,
    meta?: Record<string, unknown>,
  ) => Promise<string | undefined>;
  ownInsertedIdsRef: React.MutableRefObject<Set<string>>;
}

export async function runComputerTurn({
  text,
  userMsg,
  localTurnId,
  attachments,
  setMessages,
  setInput,
  setAttachedFiles,
  createOrUpdateConversation,
  saveMessage,
  ownInsertedIdsRef,
}: RunComputerArgs): Promise<boolean> {
  const prompt = stripComputerMention(text);
  const computerPrompt = prompt || text;
  const assistantClientId = `assistant-${localTurnId}`;
  const preIsAr = /[\u0600-\u06FF]/.test(computerPrompt);
  // Pre-start message: the user always reads what the agent is about to do
  // BEFORE it starts. A concrete step plan fills in below it as soon as it
  // is ready — both generated in parallel with the task creation so the
  // first paint never waits on them.
  const preStartText = preIsAr
    ? `تمام، هبدأ دلوقتي: ${computerPrompt.slice(0, 160)}`
    : `On it — starting now: ${computerPrompt.slice(0, 160)}`;
  setMessages((prev) => {
    const userExists = prev.some((message) => message.clientId === userMsg.clientId);
    const withUser = userExists ? prev : [...prev, userMsg];
    const assistantExists = withUser.some((message) => message.clientId === assistantClientId);
    const placeholder = {
      role: "assistant" as const,
      content: preStartText,
      clientId: assistantClientId,
      agentPending: true,
    };
    return assistantExists
      ? withUser.map((message) => (message.clientId === assistantClientId ? placeholder : message))
      : [...withUser, placeholder];
  });
  setInput("");
  setAttachedFiles([]);
  void (async () => {
    try {
      const { generateRunPlan } = await import("@/lib/computer/narration");
      const steps = await generateRunPlan(computerPrompt);
      if (!steps.length) return;
      const bullet = steps.map((st) => `• ${st}`).join("\n");
      setMessages((prev) =>
        prev.map((m) =>
          m.clientId === assistantClientId && !m.computerTaskId
            ? { ...m, content: `${preStartText}\n\n${bullet}` }
            : m,
        ),
      );
    } catch {
      /* the pre-start line alone is enough */
    }
  })();

  // Flip the send button into a stop button right away. The computer screen
  // itself only appears later, if the agent really opens a page.
  const { setActiveComputerRun, clearActiveComputerRun } = await import("@/lib/computer/activeRun");
  setActiveComputerRun(PENDING_COMPUTER_RUN);

  try {
    const cid = await createOrUpdateConversation(prompt || "Computer task");
    if (cid) {
      const userMessageId = await saveMessage(cid, "user", userMsg.content);
      if (userMessageId) ownInsertedIdsRef.current.add(userMessageId);
    }

    // Start the durable Browser Use task immediately. Narration is generated in
    // parallel, so the user never waits through two extra model calls before
    // the real work begins.
    const { createComputerTask, computerErrorMessage } = await import("@/lib/computer/client");
    const taskPromise = createComputerTask({
      prompt: computerPrompt,
      conversation_id: cid,
      attachments,
    });

    const intro = "";
    const plan: string[] = [];

    try {
      const task = await taskPromise;
      if (!task?.task_id || task.status === "failed") {
        throw new Error(
          computerErrorMessage(task?.error, task?.message) ||
            "تعذّر بدء المهمة على الكمبيوتر. حاول تاني.",
        );
      }
      setActiveComputerRun(task.task_id);
      let assistantId: string | undefined;
      if (cid) {
        assistantId = await saveMessage(cid, "assistant", intro, undefined, {
          kind: "computerTask",
          computerTaskId: task.task_id,
          computerPlan: plan,
        });
        if (assistantId) ownInsertedIdsRef.current.add(assistantId);
      }
      setMessages((prev) =>
        prev.map((m) =>
          m.clientId === assistantClientId
            ? {
                ...m,
                id: assistantId || m.id,
                content: intro,
                computerTaskId: task.task_id,
                computerPlan: plan,
                agentPending: false,
              }
            : m,
        ),
      );
      window.dispatchEvent(new CustomEvent("megsy:conversations-changed"));
      return true;
    } catch (e) {
      const msg = e instanceof Error ? e.message : "تعذّر بدء المهمة على الكمبيوتر.";
      setMessages((prev) =>
        prev.map((m) =>
          m.clientId === assistantClientId
            ? {
                ...m,
                content: intro ? `${intro}\n\n${msg}` : msg,
                agentPending: false,
              }
            : m,
        ),
      );
      clearActiveComputerRun(PENDING_COMPUTER_RUN);
      clearComputerLiveView(PENDING_COMPUTER_RUN);
      toast.error(msg);
      return false;
    }
  } catch (e) {
    clearActiveComputerRun(PENDING_COMPUTER_RUN);
    clearComputerLiveView(PENDING_COMPUTER_RUN);
    const msg = e instanceof Error ? e.message : "المهمة على الكمبيوتر فشلت";
    setMessages((prev) =>
      prev.map((m) =>
        m.clientId === assistantClientId
          ? { ...m, content: msg, agentPending: false }
          : m,
      ),
    );
    toast.error(msg);
    return false;
  }
}
