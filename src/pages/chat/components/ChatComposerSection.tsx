
import { useEffect, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowUp, Paperclip } from "lucide-react";
import ComposerAttachments from "./ComposerAttachments";
import { RemoteAiBusyBanner } from "./RemoteAiBusyBanner";
import { MentionDropdown } from "./MentionDropdown";
import { ComposerMobileModeBar } from "./ComposerMobileModeBar";
import { ComposerAnimatedInput } from "./ComposerAnimatedInput";
import { prewarmSendPath } from "../lib/prewarmSendPath";
import ComposerServicePanel from "./ComposerServicePanel";
import StarterCards, { StarterChips } from "./StarterCards";

import { ComposerComputerProvider } from "@/components/chat/ComposerComputerContext";
import ComputerRunViewport from "@/components/chat/ComputerRunViewport";
import { useComputerLiveView } from "@/lib/computer/liveView";
import { Button } from "@/components/ui/button";
import { BrandLogo } from "@/components/brand/BrandLogo";

import type { AttachedFile } from "../hooks/useAttachments";





interface ChatComposerSectionProps {
  sidebarCollapsed: boolean;
  sidebarOffset?: number;
  loadingMessages: boolean;
  messagesLength: number;
  attachedFiles: AttachedFile[];
  removeAttachment: (i: number) => void;
  remoteAiBusy: { name: string } | null;
  plusMenuOpen: boolean;
  renderPlusMenu: () => ReactNode;
  mentionQuery: { q: string } | null;
  members: any[];
  onlineUsers: any;
  colorForUser: (id?: string | null) => any;
  insertMention: (name: string) => void;
  composerMobileModeBarProps: Record<string, any>;
  composerAnimatedInputProps: Record<string, any>;
  navigate: any;
  desktopModeChipsProps: Record<string, any>;
  /** Optional greeting node rendered just above the input on empty desktop state. */
  desktopGreeting?: ReactNode;
  /** Ref forwarded to the composer wrapper so the plus menu can anchor to it. */
  composerRef?: React.Ref<HTMLDivElement>;
  /** Image-mode tools strip (upload / background removal / characters). */
  imageTools?: ReactNode;
}

const EMPTY_VIDEO = "https://d2ol7oe51mr4n9.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/4b73c700-3112-4c07-bd48-0af2893dff7c.mp4";
const EMPTY_VIDEO_POSTER = "https://d2ol7oe51mr4n9.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/0bf7409c-9fa2-4bef-a49d-34903dcc91ad.png";

function DesktopFastshotComposer({ props }: { props: ChatComposerSectionProps }) {
  const c = props.composerAnimatedInputProps as any;
  const d = props.desktopModeChipsProps as any;
  const value = String(c.input ?? "");
  const send = () => { if (value.trim() || props.attachedFiles.length > 0) void c.handleSend(value); };
  const hasActiveMode = Boolean(d.chatMode && d.chatMode !== "normal");
  return (
    <section className="desktop-fastshot-empty" aria-label="Start a new chat">
      <video className="desktop-fastshot-video" autoPlay muted loop playsInline poster={EMPTY_VIDEO_POSTER} aria-hidden="true"><source src={EMPTY_VIDEO} type="video/mp4" /></video>
      <div className="desktop-fastshot-shade" aria-hidden="true" />
      <div className="desktop-fastshot-frame">
        <header className="desktop-fastshot-nav">
          <a className="desktop-fastshot-brand" href="/" aria-label="Megsy home"><span>Megsy</span></a>
          <Button className="desktop-fastshot-cta" onClick={() => props.navigate("/pricing")}>Upgrade</Button>
        </header>
        <main className="desktop-fastshot-hero">
          {props.desktopGreeting}
          <form className="desktop-fastshot-card" onSubmit={(event) => { event.preventDefault(); send(); }}>
            {hasActiveMode ? (
              <div className="desktop-fastshot-service-bar">
                <ComposerServicePanel
                  chatMode={d.chatMode}
                  mediaModel={d.mediaModel ?? null}
                  setMediaModel={d.setMediaModel}
                  slidesTemplate={d.slidesTemplate}
                  onOpenTemplatePicker={() => d.setSlidesPickerOpen?.(true)}
                  onClear={() => d.handleModeChange?.("normal")}
                />
                {(d.chatMode === "images" || d.chatMode === "video") && props.imageTools ? props.imageTools : null}
              </div>
            ) : null}
            <textarea value={value} onChange={(event) => { c.setInput(event.target.value); const t = event.currentTarget; t.style.height = "auto"; t.style.height = `${Math.min(t.scrollHeight, 240)}px`; }} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); send(); } }} placeholder="Build a fintech tracking app with bank level privacy and..." aria-label="Message Megsy" rows={1} />
            {props.attachedFiles.length > 0 ? (
              <div className="desktop-fastshot-attachments">
                {props.attachedFiles.map((f: any, i: number) => (
                  <span key={i} className="desktop-fastshot-attachment">
                    {f?.type === "image" && f?.data ? <img src={f.data} alt="" /> : null}
                    <span className="fs-att-name">{f?.name ?? `File ${i + 1}`}</span>
                    <button type="button" aria-label="Remove attachment" onClick={() => props.removeAttachment(i)}>×</button>
                  </span>
                ))}
              </div>
            ) : null}
            <div className="desktop-fastshot-tools">
              <div className="desktop-fastshot-right">
                <Button type="button" variant="ghost" className="desktop-fastshot-attach" aria-label="Attach files" onClick={() => { c.setPlusView("main"); c.setPlusMenuOpen(!c.plusMenuOpen); }}><Paperclip /></Button>
                <Button type="submit" variant="neutral" className="desktop-fastshot-send" aria-label="Send message" disabled={!value.trim() && props.attachedFiles.length === 0}><ArrowUp /></Button>
              </div>
            </div>
            <div className="desktop-fastshot-menu-anchor">{props.plusMenuOpen ? props.renderPlusMenu() : null}</div>
          </form>
          <StarterChips className="desktop-fastshot-starters" activeMode={d.chatMode} onPick={(_prompt, mode) => { if (mode) d.handleModeChange?.(d.chatMode === mode ? "normal" : mode); }} />

        </main>
      </div>
    </section>
  );
}

/**
 * Floating bottom composer dock. Lifts to vertical-center on empty desktop
 * state, otherwise sticks to the bottom. Hosts attachments preview, busy
 * banner, plus-menu overlay, @mention dropdown, mobile mode bar, animated
 * input, desktop integrations strip, and the desktop mode chips row.
 */
export function ChatComposerSection(props: ChatComposerSectionProps) {
  const computerView = useComputerLiveView();
  const {
    sidebarCollapsed,
    sidebarOffset,
    loadingMessages,
    messagesLength,
    attachedFiles,
    removeAttachment,
    remoteAiBusy,
    plusMenuOpen,
    renderPlusMenu,
    mentionQuery,
    members,
    onlineUsers,
    colorForUser,
    insertMention,
    composerMobileModeBarProps,
    composerAnimatedInputProps,
    navigate,
    desktopModeChipsProps,
    desktopGreeting,
    composerRef,
  } = props;

  const isEmpty = messagesLength === 0 && !loadingMessages;
  const isDesktopLanding = messagesLength === 0 && !loadingMessages;
  const isMobileViewport = Boolean((composerAnimatedInputProps as any).isMobileViewport);
  // Chips/modes bar visibility: always shown by default; user can toggle via the
  // modes button. Do NOT auto-hide based on active service — chatMode is
  // persisted in localStorage, so auto-hiding causes chips to disappear every
  // time the user returns to the chat page.
  const [modesShown, setModesShown] = useState(true);
  const [inputFocused, setInputFocused] = useState(false);
  const d = desktopModeChipsProps as any;
  // Modes that already render their own labelled header panel. Showing the
  // ActiveServicePill for these too is what produced two chips at once.
  // Every service now renders through the single ComposerServicePanel chip,
  // so there is exactly one indicator on screen for every mode.
  const isDocsAgent = d.selectedAgent?.id === "docs";
  const isDevAgent = d.selectedAgent?.id === "dev";
  const hasActiveService = isDocsAgent || isDevAgent || (d.chatMode && d.chatMode !== "normal");
  const hasHeaderService = hasActiveService;

  // Hide chips whenever a service is active; also hide on mobile once the
  // conversation has started or the user is typing (input focused). They
  // auto-return when the service pill is cleared or the user opens a fresh
  // conversation on desktop.
  const effectiveModesShown = modesShown && !hasActiveService;

  // When the active service clears itself (e.g. automatically after the message
  // it was picked for was sent), bring the modes bar back.
  useEffect(() => {
    if (!hasActiveService) setModesShown(true);
  }, [hasActiveService]);


  // Starter chips: only on the empty landing state, and they disappear the
  // moment the user clicks into the input, types anything, or activates a
  // service. They come back when the service X button clears the mode.
  const composerInputText = String((composerAnimatedInputProps as any)?.input ?? "");
  const starterChipsVisible =
    isEmpty && !hasActiveService && composerInputText.trim().length === 0;



  return (
    <ComposerComputerProvider>
    {isDesktopLanding && !isMobileViewport ? <DesktopFastshotComposer props={props} /> : null}
    <div
      style={{
        ["--sb-left" as any]: (sidebarOffset ?? (sidebarCollapsed ? 56 : 260)) + "px",
        transitionTimingFunction: "cubic-bezier(0.34, 1.35, 0.64, 1)",
      }}
      className={`chat-composer-dock fixed end-0 bottom-[var(--kb-offset,0px)] z-30 px-2 md:px-6 pb-[calc(env(safe-area-inset-bottom)+0.5rem)] md:pb-[calc(env(safe-area-inset-bottom)+1.25rem)] pt-3 md:pt-6 pointer-events-none transition-[inset-inline-start,top,bottom,transform] duration-[520ms] bg-transparent will-change-transform ${
        isDesktopLanding
          ? "md:hidden"
          : "md:bg-transparent md:backdrop-blur-0 md:border-0"
      }`}
    >
      <div className={`${isDesktopLanding ? "md:max-w-4xl" : "max-w-3xl"} max-w-3xl mx-auto space-y-2 pointer-events-none w-full`}>
        <div className="pointer-events-auto">
          <RemoteAiBusyBanner remoteAiBusy={remoteAiBusy} />
        </div>

        <div className="relative mx-auto w-full max-w-3xl">

            <div data-tour="composer" className="relative">
            <AnimatePresence initial={false}>
              {computerView?.active && (computerView.url || computerView.poster) ? (
                <motion.div
                  key={computerView.id}
                  initial={{ opacity: 0, y: 10, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.98 }}
                  className="pointer-events-auto mb-2 overflow-hidden rounded-3xl shadow-lg"
                >
                  <ComputerRunViewport
                    url={computerView.url}
                    poster={computerView.poster}
                    active={computerView.active}
                    status={computerView.status}
                  />
                </motion.div>
              ) : null}
            </AnimatePresence>
            {mentionQuery && (
              <MentionDropdown
                members={members}
                query={mentionQuery.q}
                onlineUsers={onlineUsers}
                colorForUser={colorForUser}
                insertMention={insertMention}
              />
            )}

            {/* Mode bar removed: the single agent picks its own tools. */}

            {isDesktopLanding && desktopGreeting ? (
              <div className="hidden md:flex justify-center mb-8">{desktopGreeting}</div>
            ) : null}

            {/* Mode chips row removed by design: modes live in the + menu. */}

            <AnimatePresence initial={false} mode="popLayout">
              {false && starterChipsVisible ? (
                <StarterCards
                  key="starter-chips"
                  className="mt-1 mb-1.5"
                  onPick={(_prompt, mode) => {
                    // Cards only turn the service chip on — they never prefill text.
                    if (mode) {
                      d.handleModeChange?.(mode);
                      setModesShown(false);
                    }
                  }}
                />
              ) : null}
            </AnimatePresence>


            <div className="md:contents">
              <div ref={composerRef as any} className="relative z-[8] pointer-events-auto md:p-[1px] md:rounded-[28px]">
                {plusMenuOpen && (!isDesktopLanding || isMobileViewport) ? renderPlusMenu() : null}
                <div className="md:rounded-[27px] md:overflow-hidden">


                <ComposerAnimatedInput
                {...(composerAnimatedInputProps as any)}
                
                modesShown={effectiveModesShown}
                onToggleModes={() => setModesShown((v) => !v)}
                chatContext
                onInputFocusChange={(focused) => {
                  setInputFocused(focused);
                  if (focused) prewarmSendPath(true);
                }}
                canSendWithoutText={attachedFiles.length > 0}
                activeServiceHeader={
                  hasHeaderService || attachedFiles.length > 0 ? (
                    <>
                      {hasHeaderService ? (
                        <div className="composer-active-service-bar -mx-3.5 flex min-h-11 w-[calc(100%+1.75rem)] items-center gap-2 border-b border-foreground/10 bg-foreground/[0.035] px-3.5 py-1.5 md:-mx-4 md:w-[calc(100%+2rem)] md:px-4">
                          <ComposerServicePanel
                            chatMode={d.chatMode}
                            isDocsAgent={isDocsAgent}
                            isDevAgent={isDevAgent}
                            mediaModel={d.mediaModel ?? null}
                            setMediaModel={d.setMediaModel}
                            slidesTemplate={d.slidesTemplate}
                            onOpenTemplatePicker={() => d.setSlidesPickerOpen?.(true)}
                            onClear={() => {
                              if (isDocsAgent || isDevAgent) d.setSelectedAgent?.(null);
                              else d.handleModeChange("normal");
                              setModesShown(true);
                            }}
                          />
                          {(d.chatMode === "images" || d.chatMode === "video") && props.imageTools
                            ? props.imageTools
                            : null}
                        </div>
                      ) : null}
                      {attachedFiles.length > 0 ? (
                        <ComposerAttachments files={attachedFiles} onRemove={removeAttachment} />
                      ) : null}
                    </>
                  ) : null
                }

                />
                </div>
              </div>

              {/* Desktop-only starter chips below the composer (icons, no images). */}
              {false && starterChipsVisible ? (
                <StarterChips
                  className="mt-3 pointer-events-auto"
                  onPick={(_prompt, mode) => {
                    if (mode) {
                      d.handleModeChange?.(mode);
                      setModesShown(false);
                    }
                  }}
                />
              ) : null}

            </div>

          </div>

          
        </div>
      </div>
    </div>
    </ComposerComputerProvider>
  );

}
