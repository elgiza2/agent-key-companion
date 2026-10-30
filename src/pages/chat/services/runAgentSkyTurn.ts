/** Runs OpenClaw through AgentSky while preserving Megsy's original chat surface. */
import type React from "react";
import { agentApi, openStream, type AgentRequest, type RawEvent } from "@/lib/agentsky/client";
import { buildTranscript, orbStateFor, type AgentTurn, type Lang } from "@/lib/agentsky/transcript";
import type { Message, ToolPart } from "../chatConstants";
import { loadWorkspace, workspace } from "@/lib/agentsky/store";
import { detectMediaIntent } from "@/lib/agentsky/mediaIntent";
import { shouldFallbackToBrowserUse } from "@/lib/agentsky/fallbackPolicy";
import type { AttachedFile } from "../hooks/useAttachments";

type Args = {
  text: string;
  userMsg: Message;
  localTurnId: string;
  sessionId?: string;
  agentId?: string;
  hasPriorTurns?: boolean;
  lang: Lang;
  images?: string[];
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  setInput: (value: string) => void;
  setAttachedFiles: React.Dispatch<React.SetStateAction<AttachedFile[]>>;
  setIsLoading: (value: boolean) => void;
  setIsThinking: (value: boolean) => void;
  abortControllerRef: React.MutableRefObject<AbortController | null>;
  createOrUpdateConversation: (title: string) => Promise<string | null>;
  saveMessage: (
    conversationId: string,
    role: "user" | "assistant",
    content: string,
    images?: string[],
    metadata?: Record<string, unknown>,
  ) => Promise<string | undefined>;
  ownInsertedIdsRef: React.MutableRefObject<Set<string>>;
  onRequests: (requests: AgentRequest[]) => void;
  onSession: (sessionId: string) => void;
  onFallback?: (reason: string) => Promise<boolean>;
};

const toToolParts = (turn?: AgentTurn): ToolPart[] | undefined =>
  turn?.steps
    .filter((step) => step.kind !== "thought")
    .map((step) => ({
      id: step.id,
      name: step.label,
      state: step.status === "active" ? "running" : step.status,
    }));

/** Transient failures worth one silent retry before bothering the fallback. */
function isRetriableAgentError(error: unknown): boolean {
  const status = Number((error as { status?: unknown } | null)?.status);
  if (Number.isFinite(status) && status > 0) {
    return status === 408 || status === 425 || status === 429 || status >= 500;
  }
  if (error instanceof TypeError) return true;
  const message = error instanceof Error ? error.message : String(error || "");
  return /network|fetch|connection|stream|timeout|timed out|unavailable/i.test(message);
}

/** A dead/gone session must not poison the turn: drop it and start fresh. */
function isDeadSessionError(error: unknown): boolean {
  const status = Number((error as { status?: unknown } | null)?.status);
  if (status === 404 || status === 410) return true;
  const message = error instanceof Error ? error.message : String(error || "");
  return /not_found|not found|session.*(expired|archived|deleted|missing)|gone/i.test(message);
}

/** Never show a raw provider/status string: explain what happened and the fix. */
function friendlyAgentError(error: unknown, lang: Lang): string {
  const ar = lang === "ar";
  const status = Number((error as { status?: unknown } | null)?.status);
  const raw = error instanceof Error ? error.message : String(error || "");
  if (/not_configured|AgentSky is not configured/i.test(raw)) {
    return ar
      ? "الوكيل مش متظبط على السيرفر (مفيش مفتاح AgentSky). ضيف مفتاحًا من بوت التليجرام وجرب تاني."
      : "The agent is not configured on the server (no AgentSky key). Add a key from the Telegram bot and try again.";
  }
  if (status === 401 || status === 403 || /unauthorized|forbidden/i.test(raw)) {
    return ar
      ? "مفتاح الوكيل مرفوض (401/403). حدّث مفتاح AgentSky من بوت التليجرام وجرب تاني."
      : "The agent key was rejected (401/403). Refresh the AgentSky key from the Telegram bot and try again.";
  }
  if (status === 402 || /insufficient_credits|upgrade_required|out of credits/i.test(raw)) {
    return ar
      ? "رصيد الوكيل خلص. اشحن الرصيد أو حدّث الخطة وجرب تاني."
      : "The agent is out of credits. Top up or upgrade the plan and try again.";
  }
  if (status === 429 || /rate.?limit|too many requests/i.test(raw)) {
    return ar
      ? "الوكيل مضغوط حاليًا (rate limit). استنى ثواني وجرب تبعت تاني."
      : "The agent is rate-limited right now. Wait a few seconds and resend.";
  }
  if (status === 404 || status === 410 || isDeadSessionError(error)) {
    return ar
      ? "الجلسة القديمة انتهت، وبدأت جلسة جديدة تلقائيًا. ابعت رسالتك تاني لو متحفظتش."
      : "The old session expired and a fresh one was started automatically. Resend your message if it was not kept.";
  }
  if (isRetriableAgentError(error)) {
    return ar
      ? "الاتصال بالوكيل اتقطع مؤقتًا. جرب تبعت تاني، ولو استمرت المشكلة هيتحول تلقائيًا للمسار البديل."
      : "The agent connection dropped temporarily. Resend, and if it persists it will move to the fallback path automatically.";
  }
  return raw || (ar ? "تعذّر تشغيل الوكيل." : "Could not run the agent.");
}

export async function runAgentSkyTurn(args: Args): Promise<void> {
  const mediaTurn = Boolean(detectMediaIntent(args.text));
  // Higgsfield only handles images and video; other messages go to the regular agent.
  const selectedAgentId = mediaTurn
    ? "higgsfield"
    : args.agentId === "higgsfield"
      ? undefined
      : args.agentId;
  const assistantClientId = `assistant-${args.localTurnId}`;
  const controller = new AbortController();
  args.abortControllerRef.current = controller;
  const update = (patch: Partial<Message>) =>
    args.setMessages((prev) =>
      prev.map((message) =>
        message.clientId === assistantClientId ? { ...message, ...patch } : message,
      ),
    );
  args.setMessages((prev) => [
    ...prev,
    args.userMsg,
    {
      role: "assistant",
      content: "",
      clientId: assistantClientId,
      agentPending: true,
      agentSkyState: args.sessionId || args.hasPriorTurns ? "thinking" : "awakening",
      modelLabel: mediaTurn ? "higgsfield · Hypit" : "OpenClaw · gpt-5.6-luna",
      ...(mediaTurn
        ? { agentSkyAgent: { id: "higgsfield", name: "higgsfield", color: "sun" as const } }
        : {}),
    },
  ]);
  args.setInput("");
  args.setAttachedFiles([]);
  args.setIsLoading(true);
  args.setIsThinking(true);

  let sid = mediaTurn ? undefined : args.sessionId;
  let events: RawEvent[] = [];
  let turn: AgentTurn | undefined;
  let conversationId: string | null = null;
  let requests: AgentRequest[] = [];
  let identity: Message["agentSkyAgent"];
  let failure: string | undefined;
  let fallbackUsed = false;
  let stopped = false;
  const baseline = new Set<string>();
  const received = new Set<string>();
  let started = false;
  const apply = (running: boolean) => {
    const turns = buildTranscript(events, args.lang, running);
    turn = [...turns].reverse().find((item): item is AgentTurn => item.type === "agent");
    update({
      content: turn?.text || "",
      agentPending: running && !turn?.text,
      agentSkyState: stopped ? "idle" : orbStateFor(turn, running),
      agentSkySteps: turn?.steps ?? [],
      toolParts: toToolParts(turn),
      agentSkyCards: turn?.cards,
      agentSkyStopped: stopped,
      reasoning: turn?.steps
        .filter((step) => step.kind === "thought")
        .map((step) => step.detail || step.label)
        .join("\n"),
    });
  };
  const tryFallback = async (error: unknown) => {
    const hasVisibleOutput = Boolean(turn?.text.trim());
    const hasPerformedAction = Boolean(turn?.steps.some((step) => step.kind !== "thought"));
    if (
      !shouldFallbackToBrowserUse(error, {
        isMedia: mediaTurn,
        hasVisibleOutput,
        hasPerformedAction,
      }) ||
      !args.onFallback
    ) {
      return false;
    }
    try {
      return await args.onFallback(error instanceof Error ? error.message : String(error));
    } catch {
      return false;
    }
  };
  const conversationPromise = args
    .createOrUpdateConversation(args.text || "New chat")
    .catch(() => null);
  try {
    await loadWorkspace();
    if (mediaTurn) identity = { id: "higgsfield", name: "higgsfield", color: "sun" };
    // A stale session id must never kill the turn: verify it once, and on a
    // dead/transient lookup failure drop it and continue as a fresh session.
    if (sid) {
      try {
        const existing = await agentApi.session(sid);
        identity = workspace.agent(existing.session.agentId);
        const history = await agentApi.events(sid);
        history.events.forEach((event) => baseline.add(event.id));
      } catch (error) {
        if (controller.signal.aborted) {
          stopped = true;
          return;
        }
        if (isDeadSessionError(error)) {
          sid = undefined;
          baseline.clear();
        } else if (isRetriableAgentError(error)) {
          await new Promise((r) => setTimeout(r, 800));
          try {
            const existing = await agentApi.session(sid);
            identity = workspace.agent(existing.session.agentId);
            const history = await agentApi.events(sid);
            history.events.forEach((event) => baseline.add(event.id));
          } catch (retryError) {
            if (isDeadSessionError(retryError)) {
              sid = undefined;
              baseline.clear();
            } else {
              throw retryError;
            }
          }
        } else {
          throw error;
        }
      }
    }
    if (!sid && !mediaTurn) identity = workspace.agent(selectedAgentId);
    if (identity) identity = { id: identity.id, name: identity.name, color: identity.color };
    update({ agentSkyAgent: identity });
    if (controller.signal.aborted) {
      stopped = true;
      return;
    }
    // Session creation/delivery gets one silent retry on transient faults so a
    // single blip does not push the user to the slower fallback path.
    if (!sid) {
      let created: Awaited<ReturnType<typeof agentApi.createSession>> | null = null;
      try {
        created = await agentApi.createSession({
          agentId: selectedAgentId,
          text: args.text,
          images: args.images,
        });
      } catch (error) {
        if (!controller.signal.aborted && isRetriableAgentError(error)) {
          await new Promise((r) => setTimeout(r, 800));
          created = await agentApi.createSession({
            agentId: selectedAgentId,
            text: args.text,
            images: args.images,
          });
        } else {
          throw error;
        }
      }
      sid = created.session.id;
      workspace.upsertSession(created.session);
      if (created.agent) workspace.addAgent(created.agent);
      const selected = created.agent ?? workspace.agent(created.session.agentId);
      if (selected) identity = { id: selected.id, name: selected.name, color: selected.color };
    } else {
      try {
        await agentApi.send(sid, args.text, args.images);
      } catch (error) {
        if (controller.signal.aborted) {
          stopped = true;
          return;
        }
        if (isDeadSessionError(error)) {
          // The session died between lookup and send: start fresh in this turn.
          sid = undefined;
          baseline.clear();
          const created = await agentApi.createSession({
            agentId: selectedAgentId,
            text: args.text,
            images: args.images,
          });
          sid = created.session.id;
          workspace.upsertSession(created.session);
          if (created.agent) workspace.addAgent(created.agent);
          const selected = created.agent ?? workspace.agent(created.session.agentId);
          if (selected) identity = { id: selected.id, name: selected.name, color: selected.color };
        } else if (isRetriableAgentError(error)) {
          await new Promise((r) => setTimeout(r, 800));
          try {
            await agentApi.send(sid, args.text, args.images);
          } catch (retryError) {
            if (isDeadSessionError(retryError)) {
              sid = undefined;
              baseline.clear();
              const created = await agentApi.createSession({
                agentId: selectedAgentId,
                text: args.text,
                images: args.images,
              });
              sid = created.session.id;
              workspace.upsertSession(created.session);
              if (created.agent) workspace.addAgent(created.agent);
              const selected = created.agent ?? workspace.agent(created.session.agentId);
              if (selected)
                identity = { id: selected.id, name: selected.name, color: selected.color };
            } else {
              throw retryError;
            }
          }
        } else {
          throw error;
        }
      }
    }
    const activeSid = sid;
    args.onSession(activeSid);
    update({ agentSkySessionId: activeSid, agentSkyAgent: identity });
    const interrupt = () => {
      void agentApi.interrupt(activeSid).catch(() => undefined);
    };
    if (controller.signal.aborted) {
      stopped = true;
      interrupt();
      return;
    }
    controller.signal.addEventListener("abort", interrupt, { once: true });
    const feedController = new AbortController();
    const abortFeed = () => feedController.abort();
    controller.signal.addEventListener("abort", abortFeed, { once: true });
    let terminalSeen = false;
    let checking = false;
    const accept = (event: RawEvent) => {
      if (baseline.has(event.id) || received.has(event.id)) return false;
      received.add(event.id);
      if (event.type === "session.status_idle" && !started) return false;
      if (event.type === "session.status_running" || event.type.startsWith("agent."))
        started = true;
      events.push(event);
      const terminal = event.type === "session.status_idle" || event.type === "session.error";
      terminalSeen ||= terminal;
      apply(!terminal);
      return terminal;
    };
    // The standing feed can omit status frames; reconcile against persisted events.
    const reconcile = setInterval(async () => {
      if (checking || terminalSeen || controller.signal.aborted) return;
      checking = true;
      try {
        const history = await agentApi.events(activeSid);
        if (controller.signal.aborted || terminalSeen) return;
        for (const event of history.events) {
          if (accept(event)) {
            feedController.abort();
            break;
          }
        }
      } catch {
        /* Keep the live feed; the next check can recover. */
      } finally {
        checking = false;
      }
    }, 2500);
    try {
      // Long missions: keep the stream alive for hours. Transient drops are
      // recovered with backoff; a heartbeat reconcile keeps progress moving
      // even when status frames are sparse. Only a long outage (or an explicit
      // stop) ends the watch — never a short blip.
      let failures = 0;
      let lastProgressAt = Date.now();
      while (!terminalSeen && !controller.signal.aborted) {
        const attemptController = new AbortController();
        const abortAttempt = () => attemptController.abort();
        feedController.signal.addEventListener("abort", abortAttempt, { once: true });
        let idleTimer: ReturnType<typeof setTimeout> | null = null;
        const resetIdleTimer = () => {
          if (idleTimer) clearTimeout(idleTimer);
          // 10 minutes of total silence before recycling the connection; the
          // reconcile below keeps pulling persisted events in between.
          idleTimer = setTimeout(() => attemptController.abort(), 600_000);
        };
        const acceptStreamEvent = (event: RawEvent) => {
          failures = 0;
          lastProgressAt = Date.now();
          resetIdleTimer();
          return accept(event);
        };
        resetIdleTimer();
        try {
          await openStream(activeSid, acceptStreamEvent, attemptController.signal);
          if (terminalSeen) failures = 0;
          else failures++;
        } catch {
          if (terminalSeen || controller.signal.aborted) break;
          failures++;
          // ~30 minutes of continuous outage before giving up the watch.
          if (failures >= 60 || Date.now() - lastProgressAt > 30 * 60_000) {
            throw new Error("AgentSky stream unavailable after extended reconnect attempts");
          }
        } finally {
          if (idleTimer) clearTimeout(idleTimer);
          feedController.signal.removeEventListener("abort", abortAttempt);
        }
        if (terminalSeen || controller.signal.aborted) break;
        if (failures >= 60 || Date.now() - lastProgressAt > 30 * 60_000) {
          throw new Error("AgentSky stream unavailable after extended reconnect attempts");
        }
        await new Promise((r) =>
          setTimeout(r, Math.min(30_000, 1000 * 2 ** Math.min(failures, 4))),
        );
      }
    } finally {
      clearInterval(reconcile);
      controller.signal.removeEventListener("abort", abortFeed);
      controller.signal.removeEventListener("abort", interrupt);
    }
    if (controller.signal.aborted) {
      stopped = true;
      return;
    }
    apply(false);
    if (turn?.error) {
      failure = turn.error;
      fallbackUsed = await tryFallback(new Error(`session.error: ${turn.error}`));
      if (fallbackUsed) return;
    }
    requests = (await agentApi.requests(activeSid).catch(() => ({ requests: [], sessions: [] })))
      .requests;
    args.onRequests(requests);
    update({ agentSkyRequests: requests });
    if (!turn?.text.trim() && !turn?.cards.length && requests.length === 0 && !turn?.error) {
      failure = "AgentSky completed without a response";
      fallbackUsed = await tryFallback(new Error(`session.error: ${failure}`));
      if (fallbackUsed) return;
    }
  } catch (error) {
    stopped = controller.signal.aborted;
    if (!stopped) {
      failure = friendlyAgentError(error, args.lang);
      fallbackUsed = await tryFallback(error);
    }
  } finally {
    stopped = stopped || controller.signal.aborted;
    if (!fallbackUsed) {
      apply(false);
      update({
        agentPending: false,
        agentSkyState: failure || turn?.error ? "error" : stopped ? "idle" : "done",
        agentSkyStopped: stopped,
        ...(failure ? { content: turn?.text ? `${turn.text}\n\n${failure}` : failure } : {}),
      });
    }
    if (args.abortControllerRef.current === controller) args.abortControllerRef.current = null;
    args.setIsLoading(false);
    args.setIsThinking(false);
    conversationId = await conversationPromise;
    if (conversationId && !fallbackUsed) {
      try {
        const userId = await args.saveMessage(
          conversationId,
          "user",
          args.userMsg.content,
          args.images,
        );
        if (userId) args.ownInsertedIdsRef.current.add(userId);
        const metadata = {
          kind: "agentSky",
          agentSkySessionId: sid,
          agentSkyAgent: identity,
          agentSkySteps: turn?.steps ?? [],
          agentSkyStopped: stopped,
          agentSkyState: failure || turn?.error ? "error" : "done",
          agentSkyCards: turn?.cards ?? [],
          agentSkyRequests: requests,
          reasoning: turn?.steps
            .filter((step) => step.kind === "thought")
            .map((step) => step.detail || step.label)
            .join("\n"),
          toolParts: toToolParts(turn),
          modelLabel: mediaTurn ? "higgsfield · Hypit" : "OpenClaw · gpt-5.6-luna",
        };
        const text =
          failure ||
          turn?.error ||
          turn?.text ||
          (stopped ? (args.lang === "ar" ? "اتوقف." : "Stopped.") : "");
        const assistantId = await args.saveMessage(
          conversationId,
          "assistant",
          text,
          undefined,
          metadata,
        );
        if (assistantId) args.ownInsertedIdsRef.current.add(assistantId);
        update({ id: assistantId });
        window.dispatchEvent(new CustomEvent("megsy:conversations-changed"));
      } catch (error) {
        console.error("Could not save agent conversation", error);
      }
    }
  }
}
