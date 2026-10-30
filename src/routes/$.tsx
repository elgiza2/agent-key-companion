import { createFileRoute } from "@tanstack/react-router";
import { SpaMount } from "@/lib/spaMount";

// Client-only: the whole Megsy app (its own router included) mounts here.
// Dynamic imports inside `spaMount` keep every app module out of the SSR graph.
export const Route = createFileRoute("/$")({
  ssr: false,
  component: SpaMount,
  head: ({ params }) => {
    const section = String(params._splat || "Workspace").split("/")[0].replace(/[-_]/g, " ");
    const name = section.charAt(0).toUpperCase() + section.slice(1);
    const title = `${name} — Megsy AI`;
    const description = `Explore ${name.toLowerCase()} in Megsy AI, your workspace for creating and getting work done.`;
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary_large_image" },
      ],
    };
  },
});
