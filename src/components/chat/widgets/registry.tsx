/** @doc Widget registry — the single map from a widget name to its component.
 *
 *  Adding a widget is one entry here plus one component. Anything the registry
 *  does not know yet still renders: it falls back to the universal service
 *  widget, so no integration is ever left without a card.
 */
import type { ReactNode } from "react";
import ServiceActionWidget from "./ServiceActionWidget";
import { MEDIA_WIDGETS } from "./media";
import { DATA_WIDGETS } from "./data";
import { TIME_WIDGETS } from "./time";
import { PLACES_WIDGETS } from "./places";
import { ACTION_WIDGETS } from "./action";
import { COMMERCE_WIDGETS } from "./commerce";
import { WORK_WIDGETS } from "./work";

export type WidgetCtx = { onSend: (text: string) => void };
export type WidgetFn = (data: any, ctx: WidgetCtx) => ReactNode;

export const WIDGETS: Record<string, WidgetFn> = {
  ...MEDIA_WIDGETS,
  ...DATA_WIDGETS,
  ...TIME_WIDGETS,
  ...PLACES_WIDGETS,
  ...ACTION_WIDGETS,
  ...COMMERCE_WIDGETS,
  ...WORK_WIDGETS,
};

export const WIDGET_NAMES = Object.keys(WIDGETS);

/** Renders any widget payload; unknown names fall back to the universal card. */
export function renderWidget(name: string, data: any, ctx: WidgetCtx): ReactNode {
  const fn = WIDGETS[name];
  if (fn) return fn(data ?? {}, ctx);
  return <ServiceActionWidget data={data ?? {}} onSend={ctx.onSend} />;
}
