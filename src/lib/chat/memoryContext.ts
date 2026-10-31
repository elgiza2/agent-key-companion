/**
 * Memory brief for every chat turn.
 *
 * The fast lane never received the user's saved memory, so questions such as
 * "what do you know about me?" or "what did we talk about before?" were
 * answered blind. This module builds one compact, token-budgeted brief from:
 *  - durable facts the assistant learned (agent_memory),
 *  - the user's own memory entries and enabled knowledge notes,
 *  - and, only when the question is about the past, matching snippets and
 *    titles from the user's earlier conversations.
 * Everything is read with the user's session, so RLS limits it to their data.
 */
import { supabase } from "@/integrations/supabase/client";

const FACTS_TTL = 2 * 60_000;
export const MEMORY_BRIEF_BUDGET = 3500;

const RECALL_RE =
  /(فاكر|فاكره|فاكرة|تفتكر|افتكر|تتذكر|تذكر|اتذكر|أتذكر|ذاكرت?ك|الذاكره|الذاكرة|قبل كده|قبل كدا|قبل كدة|المره اللي فاتت|المرة اللي فاتت|المرة الماضية|سابقا|سابقاً|المحادثات|محادثات|محادثة|محادثه|اتكلمنا|كلمتك|قلتلك|قولتلك|قلت لك|قولت لك|تعرف عني|تعرف ايه عني|تعرف إيه عني|عارف عني|معلومات عني|بياناتي|داتا عني|عني|اسمي|انا مين|أنا مين|remember|recall|memory|earlier|before|last time|previous|past (chat|conversation)|we (talked|discussed)|i told you|about me|know me|my name|who am i)/i;

/** True when the user is asking about earlier chats or what is known about them. */
export function isRecallQuestion(text: string): boolean {
  return RECALL_RE.test(String(text || ""));
}

const STOP = new Set([
  "the", "and", "for", "with", "that", "this", "you", "your", "what", "about", "did", "we",
  "remember", "before", "earlier", "last", "time", "chat", "conversation", "tell", "know",
  "من", "في", "على", "عن", "الى", "إلى", "هو", "هي", "ما", "مع", "ان", "أن", "كان", "ده",
  "دي", "ايه", "إيه", "اللي", "انا", "أنا", "انت", "إنت", "كده", "قبل", "فاكر", "تفتكر",
  "محادثة", "محادثات", "اتكلمنا", "عني", "عليا", "ليا", "كنت", "كنا", "هل", "مش", "بتاع",
]);

/** Distinctive words from the question used to search earlier conversations. */
export function recallKeywords(text: string, max = 4): string[] {
  const words = (String(text || "").toLowerCase().match(/[\p{L}\p{N}_]{3,}/gu) ?? []).filter(
    (w) => !STOP.has(w) && !RECALL_RE.test(w),
  );
  return [...new Set(words)].sort((a, b) => b.length - a.length).slice(0, max);
}

export type MemoryFact = { kind?: string | null; key?: string | null; value?: string | null };
export type PastSnippet = { title?: string | null; role?: string | null; content: string; at?: string | null };

/** Builds the prompt block; returns "" when there is nothing to share. */
export function formatMemoryBrief(input: {
  facts: MemoryFact[];
  notes: string[];
  recentTitles: string[];
  snippets: PastSnippet[];
  recall: boolean;
  budget?: number;
}): string {
  const budget = input.budget ?? MEMORY_BRIEF_BUDGET;
  const seen = new Set<string>();
  const factLines: string[] = [];
  for (const f of input.facts) {
    const value = String(f.value || "").trim();
    if (!value) continue;
    const id = value.toLowerCase();
    if (seen.has(id)) continue;
    seen.add(id);
    factLines.push(`- ${f.key ? `${f.key}: ` : ""}${value.slice(0, 220)}`);
  }
  const parts: string[] = [];
  if (factLines.length || input.notes.length) {
    parts.push(
      `USER MEMORY (what you know about this user from earlier conversations; use it naturally. When the user asks what you remember or know about them, answer from this list):\n${[
        ...factLines.slice(0, 30),
        ...input.notes.slice(0, 8).map((n) => `- ${n.slice(0, 300)}`),
      ].join("\n")}`,
    );
  }
  if (input.recall) {
    if (input.recentTitles.length) {
      parts.push(`EARLIER CONVERSATIONS (most recent first):\n${input.recentTitles.slice(0, 12).map((t) => `- ${t}`).join("\n")}`);
    }
    if (input.snippets.length) {
      parts.push(
        `MATCHING EXCERPTS FROM EARLIER CONVERSATIONS:\n${input.snippets
          .slice(0, 6)
          .map((s) => `- [${s.title || "chat"}${s.at ? `, ${s.at.slice(0, 10)}` : ""}] ${s.role === "assistant" ? "You" : "User"}: ${s.content.replace(/\s+/g, " ").slice(0, 280)}`)
          .join("\n")}`,
      );
    }
    parts.push(
      "The user is asking about the past: answer from the memory above. If nothing above covers it, say honestly that you do not find it in your memory — never claim you cannot remember previous conversations at all.",
    );
  }
  const out = parts.join("\n\n");
  return out.length > budget ? out.slice(0, budget) : out;
}

let factsCache: { userId: string; at: number; facts: MemoryFact[]; notes: string[] } | null = null;

export function invalidateMemoryBrief() {
  factsCache = null;
}

async function loadFacts(userId: string) {
  if (factsCache && factsCache.userId === userId && Date.now() - factsCache.at < FACTS_TTL) return factsCache;
  const [mem, entries, knowledge] = await Promise.all([
    supabase.from("agent_memory").select("kind,key,value").eq("user_id", userId).order("updated_at", { ascending: false }).limit(40),
    supabase.from("user_memory_entries").select("title,summary").eq("user_id", userId).order("created_at", { ascending: false }).limit(20),
    supabase.from("user_knowledge").select("name,content").eq("user_id", userId).eq("enabled", true).limit(8),
  ]);
  const facts: MemoryFact[] = [
    ...(((mem.data as any[]) || []) as MemoryFact[]),
    ...(((entries.data as any[]) || []).map((e) => ({ key: e.title, value: e.summary }))),
  ];
  const notes = ((knowledge.data as any[]) || [])
    .map((k) => `${k.name ? `${k.name}: ` : ""}${String(k.content || "").replace(/\s+/g, " ")}`)
    .filter((n) => n.trim().length > 3);
  factsCache = { userId, at: Date.now(), facts, notes };
  return factsCache;
}

/** Fetches and formats the memory brief for this question. Never throws. */
export async function fetchMemoryBrief(question: string, currentConversationId?: string | null): Promise<string> {
  try {
    const { data } = await supabase.auth.getSession();
    const userId = data.session?.user?.id;
    if (!userId) return "";
    const recall = isRecallQuestion(question);
    const factsP = loadFacts(userId);
    let recentTitles: string[] = [];
    let snippets: PastSnippet[] = [];
    if (recall) {
      const keywords = recallKeywords(question);
      const [convs, ...matches] = await Promise.all([
        supabase.from("conversations").select("id,title,updated_at").eq("user_id", userId).order("updated_at", { ascending: false }).limit(20),
        ...keywords.map((k) =>
          supabase
            .from("messages")
            .select("conversation_id,role,content,created_at")
            .eq("user_id", userId)
            .ilike("content", `%${k.replace(/[%_]/g, "")}%`)
            .order("created_at", { ascending: false })
            .limit(4),
        ),
      ]);
      const convRows = ((convs.data as any[]) || []).filter((c) => c.id !== currentConversationId);
      const titleOf = new Map(convRows.map((c) => [c.id, String(c.title || "")]));
      recentTitles = convRows
        .map((c) => `${String(c.title || "Untitled").slice(0, 80)} (${String(c.updated_at || "").slice(0, 10)})`)
        .slice(0, 12);
      const seen = new Set<string>();
      for (const r of matches.flatMap((m: any) => (m.data as any[]) || [])) {
        if (r.conversation_id === currentConversationId) continue;
        const content = String(r.content || "").trim();
        if (!content || seen.has(content)) continue;
        seen.add(content);
        snippets.push({ title: titleOf.get(r.conversation_id) || null, role: r.role, content, at: r.created_at });
      }
      snippets = snippets.slice(0, 6);
    }
    const { facts, notes } = await factsP;
    return formatMemoryBrief({ facts, notes, recentTitles, snippets, recall });
  } catch {
    return "";
  }
}
