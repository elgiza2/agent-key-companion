/** @doc Action widgets: approval · form · question · connect_app · account_picker · error_card. */
import { useState } from "react";
import {
  GlassWidget,
  WidgetActions,
  WidgetBadge,
  WidgetBody,
  WidgetButton,
  WidgetError,
  WidgetHead,
  WidgetMark,
  WidgetRow,
} from "./GlassWidget";
import type { WidgetFn } from "./registry";

const approval: WidgetFn = (d, ctx) => (
  <GlassWidget className="max-w-[520px]">
    <WidgetHead
      mark={<WidgetMark alt={d.service || "!"} fallback={<span className="text-[15px]">⚠</span>} />}
      title={d.title || "Approve this action"}
      subtitle={d.service}
      badge={<WidgetBadge tone="warn">Needs approval</WidgetBadge>}
    />
    <WidgetBody>
      {d.summary && <p className="text-[12.5px] leading-relaxed text-foreground/90">{d.summary}</p>}
      {!!(d.effects ?? []).length && (
        <ul className="mt-2.5 flex flex-col gap-1.5">
          {(d.effects ?? []).map((e: string, i: number) => (
            <li key={i} className="flex gap-2 text-[12px] leading-relaxed text-muted-foreground">
              <span className="mt-[6px] size-1.5 shrink-0 rounded-full bg-white/30" />
              {e}
            </li>
          ))}
        </ul>
      )}
    </WidgetBody>
    <WidgetActions>
      <WidgetButton variant="primary" onClick={() => ctx.onSend("Approved — go ahead.")}>Approve</WidgetButton>
      <WidgetButton onClick={() => ctx.onSend("Cancel that, do not proceed.")}>Cancel</WidgetButton>
    </WidgetActions>
  </GlassWidget>
);

const form: WidgetFn = (d, ctx) => {
  const fields: { name: string; label: string; value?: string; required?: boolean }[] = d.fields ?? [];
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(fields.map((f) => [f.name, f.value ?? ""])),
  );
  const ready = fields.every((f) => !f.required || (values[f.name] ?? "").trim());
  return (
    <GlassWidget className="max-w-[520px]">
      <WidgetHead title={d.title || "A few details"} subtitle={d.subtitle} />
      <WidgetBody>
        <div className="flex flex-col gap-2.5">
          {fields.map((f) => (
            <label key={f.name} className="flex flex-col gap-1">
              <span className="text-[11.5px] text-muted-foreground">
                {f.label}
                {f.required && <span className="text-red-300"> *</span>}
              </span>
              <input
                value={values[f.name] ?? ""}
                onChange={(e) => setValues((v) => ({ ...v, [f.name]: e.target.value }))}
                className="rounded-[12px] border border-white/15 bg-white/[0.05] px-3 py-2 text-[12.5px] text-foreground outline-none focus:border-primary/60"
              />
            </label>
          ))}
        </div>
      </WidgetBody>
      <WidgetActions>
        <WidgetButton
          variant="primary"
          disabled={!ready}
          onClick={() =>
            ctx.onSend(
              `${d.title || "Form"} — ${fields.map((f) => `${f.label}: ${values[f.name] || "—"}`).join(" · ")}`,
            )
          }
        >
          Submit
        </WidgetButton>
      </WidgetActions>
    </GlassWidget>
  );
};

const question: WidgetFn = (d, ctx) => (
  <GlassWidget className="max-w-[520px]">
    <WidgetHead title={d.question || "One question"} subtitle={d.hint} />
    <WidgetBody>
      <div className="flex flex-wrap gap-1.5">
        {(d.options ?? []).map((o: string, i: number) => (
          <button
            key={i}
            type="button"
            onClick={() => ctx.onSend(o)}
            className="rounded-full border border-white/15 bg-white/[0.05] px-3.5 py-2 text-[12.5px] text-foreground/90 transition-colors hover:border-primary/50 hover:bg-primary/15"
          >
            {o}
          </button>
        ))}
      </div>
    </WidgetBody>
    {d.allowFreeText !== false && (
      <WidgetActions>
        <WidgetButton onClick={() => ctx.onSend("Something else — let me explain.")}>Something else</WidgetButton>
      </WidgetActions>
    )}
  </GlassWidget>
);

const connectApp: WidgetFn = (d, ctx) => (
  <GlassWidget className="max-w-[480px]">
    <WidgetHead
      mark={<WidgetMark src={d.logo} alt={d.name || "App"} />}
      title={d.name || "Connect an app"}
      subtitle={d.description}
      badge={d.connected ? <WidgetBadge tone="ok">Connected</WidgetBadge> : undefined}
    />
    <WidgetBody>
      {!!(d.permissions ?? []).length && (
        <ul className="flex flex-col gap-1.5">
          {(d.permissions ?? []).map((p: string, i: number) => (
            <li key={i} className="flex items-center gap-2 text-[12px] text-muted-foreground">
              <span className="text-emerald-300">✓</span>
              {p}
            </li>
          ))}
        </ul>
      )}
    </WidgetBody>
    <WidgetActions>
      {d.connected ? (
        <WidgetButton variant="primary" onClick={() => ctx.onSend(`Manage my ${d.name} connection.`)}>Manage</WidgetButton>
      ) : (
        <WidgetButton variant="primary" onClick={() => ctx.onSend(`Connect ${d.name} for me.`)}>Connect</WidgetButton>
      )}
      <WidgetButton onClick={() => ctx.onSend(`Not now, skip ${d.name}.`)}>Not now</WidgetButton>
    </WidgetActions>
  </GlassWidget>
);

const accountPicker: WidgetFn = (d, ctx) => (
  <GlassWidget className="max-w-[480px]">
    <WidgetHead title={d.title || "Choose an account"} subtitle={d.service} />
    <WidgetBody>
      <div className="flex flex-col gap-2">
        {(d.accounts ?? []).map((a: any, i: number) => (
          <WidgetRow key={i} className="flex items-center gap-3">
            {a.avatar ? (
              <img src={a.avatar} alt="" loading="lazy" className="size-8 rounded-full object-cover" />
            ) : (
              <span className="grid size-8 place-items-center rounded-full bg-white/[0.08] text-[12px] text-foreground/80">
                {(a.email ?? a.name ?? "?").slice(0, 1).toUpperCase()}
              </span>
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-[12.5px] text-foreground">{a.email ?? a.name}</p>
              {a.name && a.email && <p className="truncate text-[11.5px] text-muted-foreground">{a.name}</p>}
            </div>
            <WidgetButton onClick={() => ctx.onSend(`Use ${a.email ?? a.name} for ${d.service || "this"}.`)}>Use</WidgetButton>
          </WidgetRow>
        ))}
      </div>
    </WidgetBody>
  </GlassWidget>
);

const errorCard: WidgetFn = (d, ctx) => (
  <GlassWidget className="max-w-[520px]">
    <WidgetHead title={d.title || "Something stopped"} subtitle={d.service} badge={<WidgetBadge tone="bad">Failed</WidgetBadge>} />
    <div className="px-4 py-3">
      <WidgetError text={d.message || "This step could not finish."} />
    </div>
    <WidgetActions>
      <WidgetButton variant="primary" onClick={() => ctx.onSend(d.retryPrompt || "Try that again.")}>Retry</WidgetButton>
      {d.details && <WidgetButton onClick={() => ctx.onSend("Explain what went wrong in detail.")}>Details</WidgetButton>}
    </WidgetActions>
  </GlassWidget>
);

export const ACTION_WIDGETS = {
  approval,
  form,
  question,
  connect_app: connectApp,
  account_picker: accountPicker,
  error_card: errorCard,
};
