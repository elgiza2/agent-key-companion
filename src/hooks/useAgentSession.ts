/** @doc Live AgentSky session: history + SSE stream, running state, stop, and a send queue
 *  that lets the user type while the agent works (queued messages go out when it finishes). */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { agentApi, openStream, type AgentRequest, type RawEvent } from "@/lib/agentsky/client";
import { buildTranscript, type Lang } from "@/lib/agentsky/transcript";

export type Queued = { id: string; text: string; images: string[] };

export function useAgentSession(sessionId: string | null, lang: Lang) {
  const [events, setEvents] = useState<RawEvent[]>([]);
  const [running, setRunning] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [queue, setQueue] = useState<Queued[]>([]);
  const [requests, setRequests] = useState<AgentRequest[]>([]);
  const [stopping, setStopping] = useState(false);
  const seen = useRef(new Set<string>());
  const sidRef = useRef(sessionId);
  sidRef.current = sessionId;

  const reload = useCallback(async (sid: string) => {
    const r = await agentApi.events(sid);
    if (sidRef.current !== sid) return;
    seen.current = new Set(r.events.map((e) => e.id));
    setEvents(r.events);
    setRunning(r.status === "running");
  }, []);

  const loadRequests = useCallback(async (sid: string) => {
    try {
      const r = await agentApi.requests(sid);
      if (sidRef.current === sid) setRequests(r.requests);
    } catch {
      /* optional */
    }
  }, []);

  useEffect(() => {
    setEvents([]);
    setRunning(false);
    setQueue([]);
    setRequests([]);
    setError(null);
    seen.current = new Set();
    if (!sessionId) return;
    const sid = sessionId;
    const ctl = new AbortController();
    let retry = 0;
    setLoading(true);
    reload(sid)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
    void loadRequests(sid);

    const loop = async () => {
      while (!ctl.signal.aborted) {
        try {
          await openStream(
            sid,
            (e) => {
              retry = 0;
              if (e.type === "session.status_running") setRunning(true);
              if (e.type === "session.status_idle" || e.type === "session.error") {
                setRunning(false);
                setStopping(false);
                setTimeout(() => {
                  void reload(sid).catch(() => {});
                  void loadRequests(sid);
                }, 600);
              }
              if (!e.id || seen.current.has(e.id)) return;
              seen.current.add(e.id);
              setEvents((prev) => [...prev, e]);
            },
            ctl.signal,
          );
        } catch {
          if (ctl.signal.aborted) return;
        }
        retry++;
        await new Promise((r) => setTimeout(r, Math.min(1000 * 2 ** retry, 15000)));
        if (!ctl.signal.aborted) await reload(sid).catch(() => {});
      }
    };
    void loop();
    return () => ctl.abort();
  }, [sessionId, reload, loadRequests]);

  const sendNow = useCallback(async (text: string, images: string[] = []) => {
    const sid = sidRef.current;
    if (!sid) return;
    setRunning(true);
    try {
      await agentApi.send(sid, text, images);
    } catch (e: any) {
      setRunning(false);
      setError(e.message);
    }
  }, []);

  /** While running, messages wait in the queue and go out automatically when the agent finishes. */
  const send = useCallback(
    (text: string, images: string[] = []) => {
      if (running) setQueue((q) => [...q, { id: crypto.randomUUID(), text, images }]);
      else void sendNow(text, images);
    },
    [running, sendNow],
  );

  useEffect(() => {
    if (running || stopping || !queue.length) return;
    const [next, ...rest] = queue;
    setQueue(rest);
    void sendNow(next.text, next.images);
  }, [running, stopping, queue, sendNow]);

  const stop = useCallback(async () => {
    const sid = sidRef.current;
    if (!sid) return;
    setStopping(true);
    try {
      await agentApi.interrupt(sid);
    } catch (e: any) {
      setError(e.message);
    }
    // the idle event clears running; fall back if it never arrives
    setTimeout(() => {
      setStopping(false);
      setRunning(false);
    }, 8000);
  }, []);

  const unqueue = (id: string) => setQueue((q) => q.filter((x) => x.id !== id));

  const turns = useMemo(() => buildTranscript(events, lang, running), [events, lang, running]);

  return { turns, running, loading, error, queue, unqueue, send, stop, stopping, requests, setRequests };
}
