/** @doc Time widgets: calendar_event · slot_picker · day_view · countdown · timezone. */
import { useState } from "react";
import {
  GlassWidget,
  WidgetActions,
  WidgetBadge,
  WidgetBody,
  WidgetButton,
  WidgetEmpty,
  WidgetField,
  WidgetHead,
  WidgetRow,
} from "./GlassWidget";
import type { WidgetFn } from "./registry";

const calendarEvent: WidgetFn = (d, ctx) => (
  <GlassWidget className="max-w-[520px]">
    <WidgetHead
      title={d.title || "New event"}
      subtitle={d.when || d.start}
      badge={d.status && <WidgetBadge tone="ok">{d.status}</WidgetBadge>}
    />
    <WidgetBody>
      <div className="rounded-[14px] border border-white/10 bg-white/[0.04] px-3 py-1.5">
        <WidgetField label="When" value={d.when || d.start || "—"} />
        {d.duration && <WidgetField label="Duration" value={d.duration} />}
        {d.location && <WidgetField label="Where" value={d.location} />}
        {d.calendar && <WidgetField label="Calendar" value={d.calendar} />}
      </div>
      {!!(d.attendees ?? []).length && (
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {(d.attendees ?? []).map((a: any, i: number) => (
            <span key={i} className="rounded-full border border-white/15 bg-white/[0.06] px-2.5 py-1 text-[11.5px] text-foreground/85">
              {a.name ?? a.email ?? a}
            </span>
          ))}
        </div>
      )}
    </WidgetBody>
    <WidgetActions>
      <WidgetButton variant="primary" onClick={() => ctx.onSend(`Confirm and create the event "${d.title}".`)}>Create</WidgetButton>
      <WidgetButton onClick={() => ctx.onSend(`Change the time of the event "${d.title}".`)}>Change time</WidgetButton>
    </WidgetActions>
  </GlassWidget>
);

const slotPicker: WidgetFn = (d, ctx) => {
  const days: { label: string; slots: string[] }[] = d.days ?? [];
  const [pick, setPick] = useState<string | null>(null);
  return (
    <GlassWidget className="max-w-[520px]">
      <WidgetHead title={d.title || "Pick a time"} subtitle={d.timezone} />
      <WidgetBody>
        <div className="flex flex-col gap-3">
          {days.map((day, i) => (
            <div key={i}>
              <p className="mb-1.5 text-[11.5px] font-medium text-muted-foreground">{day.label}</p>
              <div className="flex flex-wrap gap-1.5">
                {day.slots.map((slot) => {
                  const id = `${day.label} ${slot}`;
                  const active = pick === id;
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setPick(id)}
                      className={`rounded-full border px-3 py-1.5 text-[12px] transition-colors ${
                        active ? "border-primary/60 bg-primary/20 text-foreground" : "border-white/15 bg-white/[0.05] text-muted-foreground hover:text-foreground"
                      }`}
                      dir="ltr"
                    >
                      {slot}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </WidgetBody>
      <WidgetActions>
        <WidgetButton variant="primary" disabled={!pick} onClick={() => pick && ctx.onSend(`Book ${pick}.`)}>
          {pick ? `Confirm ${pick}` : "Pick a slot"}
        </WidgetButton>
      </WidgetActions>
    </GlassWidget>
  );
};

const dayView: WidgetFn = (d) => (
  <GlassWidget className="max-w-[520px]">
    <WidgetHead title={d.date || "Today"} subtitle={`${(d.events ?? []).length} events`} />
    <WidgetBody>
      {(d.events ?? []).length ? (
        <div className="flex flex-col gap-2">
          {(d.events ?? []).map((e: any, i: number) => (
            <WidgetRow key={i} className="flex items-start gap-3">
              <span className="w-[52px] shrink-0 font-mono text-[11.5px] text-muted-foreground" dir="ltr">{e.time}</span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[12.5px] font-medium text-foreground">{e.title}</p>
                {e.location && <p className="mt-0.5 truncate text-[11.5px] text-muted-foreground">{e.location}</p>}
              </div>
            </WidgetRow>
          ))}
        </div>
      ) : (
        <WidgetEmpty text="Nothing on the calendar." />
      )}
    </WidgetBody>
  </GlassWidget>
);

const countdown: WidgetFn = (d) => (
  <GlassWidget className="max-w-[420px]">
    <WidgetHead title={d.title || "Countdown"} subtitle={d.until} />
    <div className="px-4 pb-4">
      <div className="text-[28px] font-semibold leading-none text-foreground" dir="ltr">{d.value}</div>
      {d.caption && <p className="mt-1.5 text-[12px] text-muted-foreground">{d.caption}</p>}
    </div>
  </GlassWidget>
);

const timezone: WidgetFn = (d) => (
  <GlassWidget className="max-w-[460px]">
    <WidgetHead title={d.title || "Time zones"} subtitle={d.reference} />
    <WidgetBody>
      <div className="rounded-[14px] border border-white/10 bg-white/[0.04] px-3 py-1.5">
        {(d.cities ?? []).map((c: any, i: number) => (
          <WidgetField key={i} label={c.city} value={c.time} />
        ))}
      </div>
    </WidgetBody>
  </GlassWidget>
);

export const TIME_WIDGETS = {
  calendar_event: calendarEvent,
  slot_picker: slotPicker,
  day_view: dayView,
  countdown,
  timezone,
};
