import { lazy, Suspense, useContext } from "react";
import { ClientOnly } from "@tanstack/react-router";
import { GenUIActionContext } from "../genui/GenUIBlock";
const Render = lazy(() => import("./OpenUIRenderer"));
export function OpenUIBlock({
  source,
  streaming = false,
}: {
  source: string;
  streaming?: boolean;
}) {
  const onSend = useContext(GenUIActionContext);
  const wait = <div className="my-4 h-40 animate-pulse rounded-lg bg-muted" />;
  return (
    <ClientOnly fallback={wait}>
      <Suspense fallback={wait}>
        <Render source={source} streaming={streaming} onSend={onSend} />
      </Suspense>
    </ClientOnly>
  );
}
