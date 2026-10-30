import { createFileRoute } from "@tanstack/react-router";
import { SpaMount } from "@/lib/spaMount";

// The home page is the Megsy SPA itself (same mount as the catch-all `$` route).
export const Route = createFileRoute("/")({
  ssr: false,
  component: SpaMount,
  head: () => ({
    meta: [
      { title: "Megsy AI — AI Agent Workspace for Chat, Research, Images & Video" },
      {
        name: "description",
        content:
          "Use one AI agent workspace for chat, deep research, image and video generation, presentations, coding and browser automation in English and Arabic.",
      },
      { property: "og:title", content: "Megsy AI — AI Agent Workspace for Real Work" },
      {
        property: "og:description",
        content:
          "Chat, research the web, generate images and videos, build presentations and delegate browser tasks from one AI workspace.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Megsy AI — AI Agent Workspace for Real Work" },
      {
        name: "twitter:description",
        content:
          "Chat, research the web, generate images and videos, build presentations and delegate browser tasks from one AI workspace.",
      },
    ],
  }),
});
