import type { ChatMode } from "../chatConstants";

export type ChatSeoMeta = { title: string; description: string; path: string };

/**
 * Per-mode SEO metadata for the Chat page. Each entry maps a ChatMode to a
 * concise, keyword-rich title and description plus the canonical path used
 * by SEOHead. Kept in a data module so the giant ChatPage component does not
 * carry this constant in its render scope.
 */
export const SEO_BY_MODE: Record<ChatMode, ChatSeoMeta> = {
  normal: {
    title: "AI Chat with 80+ Models — Megsy AI Agent Workspace",
    description:
      "Chat with leading AI models, compare answers, upload files and get work done in one AI agent workspace. One Pro plan, metered by real usage.",
    path: "/chat",
  },
  learning: {
    title: "AI Tutor for Any Subject — Megsy Learning Mode",
    description:
      "Learn step by step with an adaptive AI tutor, practice questions, clear explanations and study support for any subject.",
    path: "/chat?mode=learning",
  },
  shopping: {
    title: "AI Shopping Assistant — Compare Products and Prices",
    description:
      "Compare products, research options and find better prices with an AI shopping assistant that searches the web for you.",
    path: "/chat?mode=shopping",
  },
  "deep-research": {
    title: "Deep Research AI — Cited Reports from Real Sources",
    description:
      "Run multi-source web research with citations. Megsy reads, verifies, synthesizes and writes an exportable research report.",
    path: "/chat?mode=deep-research",
  },
  slides: {
    title: "AI Presentation Maker — Create Slides from a Prompt",
    description:
      "Create polished presentations from a prompt with research-backed content, visual layouts and fast export.",
    path: "/chat?mode=slides",
  },
  "slides-images": {
    title: "AI Presentation Maker with Images — Visual Slides Fast",
    description:
      "Build visual slide decks with custom AI-generated images, coherent layouts and on-brand creative direction.",
    path: "/chat?mode=slides-images",
  },
  operator: {
    title: "Autonomous Browser Agent — Megsy Operator",
    description:
      "Delegate browser tasks to an autonomous AI agent that can research, navigate, click and complete workflows under your supervision.",
    path: "/chat?mode=operator",
  },
  images: {
    title: "AI Image Generator — Create and Edit Images in Chat",
    description:
      "Create and edit images from text in chat, with consistent scenes, creative direction and multiple AI image models.",
    path: "/chat?mode=images",
  },
  video: {
    title: "AI Video Generator — Create Cinematic Clips from Text",
    description:
      "Turn a prompt into cinematic AI video clips with Runway-powered generation, shot planning and guided creative control.",
    path: "/chat?mode=video",
  },
  code: {
    title: "AI Coding Assistant — Build Apps with Live Preview",
    description:
      "Build React, TypeScript, HTML and Python projects with an AI coding assistant, live previews and practical explanations.",
    path: "/chat?mode=code",
  },
};

export function getSeoMeta(mode: ChatMode): ChatSeoMeta {
  return SEO_BY_MODE[mode] || SEO_BY_MODE.normal;
}
