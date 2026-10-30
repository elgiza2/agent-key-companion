/** @doc Renders a validated ```ui spec as a polished card with real photos; clicks go back to the agent. */
import { createContext, useMemo } from "react";
import { parseUISpec } from "./schema";
import { specToOpenUI } from "../openui/compat";
import { OpenUIBlock } from "../openui/OpenUIBlock";

export const GenUIActionContext = createContext<((text: string) => void) | undefined>(undefined);
export function GenUIBlock({ source }: { source: string }) {
  const spec = useMemo(() => parseUISpec(source), [source]);
  if (!spec) return <div className="my-4 h-40 animate-pulse rounded-lg bg-muted" />;
  return <OpenUIBlock source={specToOpenUI(spec)} />;
}
