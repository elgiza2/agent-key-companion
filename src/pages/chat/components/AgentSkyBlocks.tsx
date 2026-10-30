/** AgentSky-specific steps and interactive results embedded in Megsy's original messages. */
import { Fragment } from "react";
import { useNavigate } from "react-router-dom";
import { useUserLang } from "@/lib/authI18n";
import { useWorkspaceStore } from "@/lib/agentsky/store";
import type { Message } from "../chatConstants";
import { Tool, ToolContent, ToolHeader } from "@/components/ai-elements/tool";
import { ApprovalCard, FileCard, MediaCard, PlanCard, QuestionCard, TaskCard, VideoProposalCard } from "@/components/agent/Cards";
import { AgentProposalCard } from "@/components/agent/AgentProposalCard";
import ServiceActionWidget from "@/components/chat/widgets/ServiceActionWidget";
import { renderWidget } from "@/components/chat/widgets/registry";

const toolState = (state: "running" | "done" | "error") =>
  state === "running" ? "input-available" as const : state === "error" ? "output-error" as const : "output-available" as const;

export default function AgentSkyBlocks({ message, onSend }: { message: Message; onSend: (text: string) => void }) {
  const lang = useUserLang() === "ar-eg" ? "ar" : "en";
  const navigate = useNavigate();
  const workspace = useWorkspaceStore();
  const tools = message.agentSkySteps ? [] : message.toolParts ?? [];
  const cards = message.agentSkyCards ?? [];
  const requests = message.agentSkyRequests ?? [];

  if (!tools.length && !cards.length && !requests.length) return null;
  return (
    <div className="mt-3 space-y-2 px-3 md:px-12">
      {tools.map((part) => (
        <Tool key={part.id} defaultOpen={false} className="mb-0 max-w-[560px] border-border/70 bg-card/70 shadow-none">
          <ToolHeader type="dynamic-tool" toolName={part.name} title={part.name} state={toolState(part.state)} />
          <ToolContent className="pt-0 text-sm text-muted-foreground">
            {part.state === "running" ? (lang === "ar" ? "شغال دلوقتي…" : "Working now…") : part.state === "error" ? (lang === "ar" ? "الخطوة دي وقفت." : "This step stopped.") : (lang === "ar" ? "الخطوة خلصت." : "Step completed.")}
          </ToolContent>
        </Tool>
      ))}
      {cards.some((c) => c.kind === "file") && (
        <div className="ag-files">
          <div className="ag-files__title">{lang === "ar" ? "الملفات" : "Files"}</div>
          <div className="grid gap-2 sm:grid-cols-2">
            {cards.map((card) => card.kind === "file" ? <FileCard key={card.id} name={card.name} url={card.url} content={card.content} mime={card.mime} size={card.size} lang={lang} /> : null)}
          </div>
        </div>
      )}
      {cards.map((card) => {
        if (card.kind === "agent-proposal") return <AgentProposalCard key={card.id} proposal={card.proposal} />;
        if (card.kind === "media") return <MediaCard key={card.id} media={card.media} lang={lang} />;
        if (card.kind === "video") return <VideoProposalCard key={card.id} proposal={card.proposal} models={workspace.models} tier={workspace.tier} lang={lang} onUpgrade={() => navigate("/pricing")} />;
        if (card.kind === "question") return <QuestionCard key={card.id} question={card.question} options={card.options} allowFreeText={card.allowFreeText} answered={card.answered} lang={lang} onAnswer={onSend} />;
        if (card.kind === "task") return <TaskCard key={card.id} title={card.title} dueAt={card.dueAt} lang={lang} onOpen={() => navigate("/chat")} />;
        if (card.kind === "plan") return <PlanCard key={card.id} title={card.title} steps={card.steps} lang={lang} />;
        if (card.kind === "service-action") return <ServiceActionWidget key={card.id} data={card.data} onSend={onSend} />;
        // Named widgets come from the registry; anything unknown already fell back to
        // the universal service card inside renderWidget.
        if (card.kind === "widget") return <Fragment key={card.id}>{renderWidget(card.name, card.data, { onSend })}</Fragment>;
        return null;
      })}
      {requests.map((request) => <ApprovalCard key={request.id} request={request} lang={lang} onAnswer={onSend} />)}
    </div>
  );
}
