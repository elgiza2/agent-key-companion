# Agent chat work — status (megsyai.com)

## What the user asked for (latest)
1. Design still not good enough — the chat must stay glassy/clean like the rest of the app.
2. The **Agents** section is a *chat with agents* ("personal AI agent"), the normal **Chat** is the everyday chat.
   Both use a normal chat interface, but they are two different things.
3. In the agent chat, **every agent message shows that agent's image/robot** (per selected agent).
4. Subscribers can run **more than one agent together** (team).
5. First time a user opens an agent, they get a **welcome message explaining the agents**.
6. The agent chat is saved as **ONE conversation per agent**; reopening it shows the saved thread.

## Design language (already shipped, keep using it)
- Tokens from `src/styles/settings-home.css` (`--settings-*`: canvas, surface, frost, ink, muted, line,
  violet/pink/green/blue/yellow/red, backdrop, shadow). Glass = `--settings-surface` +
  `backdrop-filter: var(--settings-frost)` + `box-shadow: var(--settings-shadow)`.
- `src/styles/chat-glass.css` is imported **last** in `src/styles/app.css` and re-skins the chat
  (aurora backdrop, frosted header/composer, agents panel, "+" menu).
  - The old chat skin pins the surface with `!important`, so the glass rules need
    `html body [data-shell="megsy"] [data-chat-main="true"][data-chat-glass="true"][data-chat-empty="true"]`
    (specificity beats `[data-skin=claude] .chat-surface-dark[data-chat-main=true][data-chat-empty=true]`).
  - Do **not** use `background:` shorthand together with `background-attachment` — the Lightning CSS
    minifier mangles it into `background-position-x: !important`. Use longhands only.
  - `color-mix()` with `var()` is dropped by the minifier → set tints with inline styles (runtime).

## Implemented in this round (code, deployed unless noted)
- `src/lib/agentChat.ts` — NEW: `agentConversationKey`, `agentsFromKey`, `findAgentConversation`,
  `ensureAgentConversation` (creates the conversation with `agent_key` + reports `created`),
  `agentWelcomeText(agent, {team, pro})` (English first-run explainer).
- Supabase migration `agent_chat_conversations`: `conversations.agent_key text` + index
  `(user_id, agent_key)`. Project `qdnqxjzjecaieuavagvq`.
- `runAgentSkyTurn.ts` — new optional `appendUser?: boolean` so a team turn reuses ONE user message
  across several agents.
- `src/pages/chat/components/ChatAgentsPanel.tsx` — agents half of the chat page (hero + search +
  tinted glass tiles; `onPick` → `/chat?agent=<id>`).
- `MobileChatHeader` — avatar (opens drawer) + segmented **Chat | Agents** + round options button;
  `tab`/`onTabChange` forwarded by `MobileChatHeaderMount`.
- `PlusContent.tsx` → `PlusMain` rebuilt: 3 sections (Add / Create / More), 12 tinted glass tiles.
- Composer (`AnimatedInput`): visible "Ask anything…" placeholder, round "+" button.

## Still to do (this round)
1. `ChatPage`: derive `urlAgentIds` from `?agent=` / `?agents=a,b`, `agentKey`, then an effect that
   calls `ensureAgentConversation` → writes the welcome message once (`insertAssistantNarration`) →
   `loadConversation(id)`.
2. Agent bar at the top of the thread: agent logo + name + "Personal agent" + switch → Agents tab.
3. Avatar/robot on **every** agent message: in `ChatMessageItem`, render the agent mark whenever
   `msg.role === "assistant" && msg.agentSkyAgent` (use `AgentIcon`/`AgentOrb`).
4. Team turns: loop `runAgentSkyTurn` over the selected agents, keeping one AgentSky session per agent
   (`agentSessionsRef`), `appendUser: false` after the first.
5. Directory (ChatAgentsPanel): "Your AI team" explainer + team picker for paid tiers.

## Facts worth keeping
- `/chat?agent=<id>` already routes the turn to that agent (`runAgentSkyTurn({agentId})`).
- Message metadata keeps `agentSkyAgent {id,name,color}`; `rowToMessage.ts` restores it.
- Conversation URL state is `?conv=<id>` (`useChatUrlState`).
- Supabase: project `qdnqxjzjecaieuavagvq`; Vercel project `agentsky-nexus-3df67cfc`
  (`prj_wmbClZ0GOOxXnnqC5dPMRC0iSU43`, team `team_x5ksi93MYOB5oHR8EXsqd2Aw`), deploy from
  `elgiza2/sky-nexus-hub@main`, then `get_deployment` until READY.
- Test account: `support@megsyai.com` / `Habibam8n11@`.
