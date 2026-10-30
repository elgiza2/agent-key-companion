/** Agent pages use the same original navigation as the chat. */
import { useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import AppSidebar from "@/components/layout/AppSidebar";
import MobileSidebarButton from "@/components/shared/MobileSidebarButton";
import { useSidebarCollapsed } from "@/hooks/useSidebarCollapsed";

export function AgentShell({ lang, title, actions, children }: { lang: "en" | "ar"; title?: ReactNode; actions?: ReactNode; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [collapsed] = useSidebarCollapsed();
  const nav = useNavigate();
  const newChat = () => nav("/chat");
  const select = (id: string) => nav(`/chat?conv=${encodeURIComponent(id)}`);
  return (
    <div className="agent-glass-shell flex h-[100dvh] w-full overflow-hidden bg-background text-foreground" dir={lang === "ar" ? "rtl" : "ltr"}>
      <aside className={`relative hidden shrink-0 overflow-hidden transition-[width] duration-300 md:flex ${collapsed ? "w-[60px]" : "w-[280px]"}`}>
        <AppSidebar inline open forceExpanded={!collapsed} onClose={() => {}} onNewChat={newChat} onSelectConversation={select} currentMode="chat" />
      </aside>
      <div className="md:hidden"><AppSidebar open={open} onClose={() => setOpen(false)} onNewChat={newChat} onSelectConversation={select} currentMode="chat" /></div>
      <section className="agent-glass-main flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="agent-glass-header flex min-h-16 shrink-0 items-center gap-3 border-b border-border px-4 md:px-8">
          <MobileSidebarButton onClick={() => setOpen(true)} ariaLabel={lang === "ar" ? "فتح القائمة" : "Open menu"} />
          <div className="min-w-0 flex-1 truncate text-base font-semibold">{title}</div>
          <div className="shrink-0">{actions}</div>
        </header>
        {children}
      </section>
    </div>
  );
}
