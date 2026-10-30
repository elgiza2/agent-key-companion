/** Connects an app straight from a chat drawing's connect button, without leaving the chat. */
import { toast } from "sonner";
import { integrations, type Integration } from "@/lib/integrationsData";
import {
  loadIntegrationConnections,
  startIntegrationConnection,
  waitForConnectionRefresh,
} from "@/lib/integrationBackend";

export function findIntegration(app: string): Integration | undefined {
  const key = app.trim().toLowerCase().replace(/[\s_-]+/g, "");
  return integrations.find((i) =>
    [i.app, i.id, i.pipedreamSlug, i.name].some((v) => v && v.toLowerCase().replace(/[\s_-]+/g, "") === key),
  );
}

/** Returns the app name once connected, or null when it failed or was cancelled. */
export async function connectFromWidget(app: string, reply: (state: "busy" | "ok" | "err") => void): Promise<string | null> {
  const item = findIntegration(app);
  if (!item) {
    reply("err");
    toast.error("التطبيق ده مش متاح للربط");
    return null;
  }
  reply("busy");
  try {
    const snap = await loadIntegrationConnections([item]).catch(() => null);
    if (snap?.connectedApps?.[item.app]) {
      reply("ok");
      return item.name;
    }
    const result = await startIntegrationConnection(item);
    if (result.mode !== "local") {
      await waitForConnectionRefresh(async () => {
        const s = await loadIntegrationConnections([item]);
        return !!s.connectedApps[item.app];
      }, (result as { popup?: Window | null }).popup);
    }
    const after = await loadIntegrationConnections([item]);
    if (!after.connectedApps[item.app]) {
      reply("err");
      return null;
    }
    reply("ok");
    toast.success(`تم ربط ${item.name}`);
    return item.name;
  } catch (e) {
    reply("err");
    toast.error(e instanceof Error ? e.message : "الربط ما نجحش");
    return null;
  }
}
