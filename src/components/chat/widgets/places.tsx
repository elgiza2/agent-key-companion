/** @doc Place widgets: map · places · route · address · weather_now · weather_forecast. */
import {
  GlassWidget,
  WidgetActions,
  WidgetBody,
  WidgetButton,
  WidgetHead,
  WidgetRow,
} from "./GlassWidget";
import type { WidgetFn } from "./registry";

const mapsUrl = (q: string) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;

const map: WidgetFn = (d) => {
  const label = d.address || d.name || d.query || "";
  return (
    <GlassWidget className="max-w-[520px]">
      <WidgetHead title={d.name || d.query || "Location"} subtitle={d.address} />
      <div className="relative">
        {d.url ? (
          <img src={d.url} alt={label} loading="lazy" className="h-[200px] w-full object-cover" />
        ) : (
          <div className="grid h-[160px] w-full place-items-center bg-white/[0.04]">
            <span className="rounded-full border border-white/15 bg-black/30 px-3 py-1.5 text-[12px] text-foreground/90">{label}</span>
          </div>
        )}
      </div>
      <WidgetActions>
        <WidgetButton variant="primary" onClick={() => window.open(d.directionsUrl || mapsUrl(label), "_blank", "noopener")}>Directions</WidgetButton>
        <WidgetButton onClick={() => navigator.clipboard?.writeText(label)}>Copy address</WidgetButton>
      </WidgetActions>
    </GlassWidget>
  );
};

const places: WidgetFn = (d, ctx) => (
  <GlassWidget className="max-w-[560px]">
    <WidgetHead title={d.title || "Nearby places"} subtitle={d.query} />
    <WidgetBody>
      <div className="flex flex-col gap-2">
        {(d.items ?? []).map((p: any, i: number) => (
          <WidgetRow key={i} className="flex items-center gap-3">
            {p.photo && <img src={p.photo} alt="" loading="lazy" className="size-12 shrink-0 rounded-[12px] object-cover" />}
            <div className="min-w-0 flex-1">
              <p className="truncate text-[12.5px] font-medium text-foreground">{p.name}</p>
              <p className="mt-0.5 truncate text-[11.5px] text-muted-foreground">
                {[p.rating ? `★ ${p.rating}` : null, p.distance, p.open === false ? "Closed" : p.open ? "Open" : null].filter(Boolean).join(" · ")}
              </p>
            </div>
            <WidgetButton onClick={() => ctx.onSend(`Tell me more about ${p.name}.`)}>Details</WidgetButton>
          </WidgetRow>
        ))}
      </div>
    </WidgetBody>
  </GlassWidget>
);

const route: WidgetFn = (d) => (
  <GlassWidget className="max-w-[520px]">
    <WidgetHead title={d.title || "Route"} subtitle={[d.distance, d.duration].filter(Boolean).join(" · ")} />
    <WidgetBody>
      <div className="flex flex-col gap-0">
        {(d.steps ?? []).map((s: any, i: number) => (
          <div key={i} className="flex gap-3">
            <div className="flex flex-col items-center pt-1.5">
              <span className="size-2 rounded-full bg-primary/70" />
              {i < (d.steps ?? []).length - 1 && <span className="w-px flex-1 bg-white/15" />}
            </div>
            <div className="pb-3">
              <p className="text-[12.5px] text-foreground/90">{s.instruction ?? s.text}</p>
              {s.distance && <p className="mt-0.5 text-[11.5px] text-muted-foreground">{s.distance}</p>}
            </div>
          </div>
        ))}
      </div>
    </WidgetBody>
    <WidgetActions>
      <WidgetButton variant="primary" onClick={() => window.open(d.url || mapsUrl(d.to || ""), "_blank", "noopener")}>Start</WidgetButton>
    </WidgetActions>
  </GlassWidget>
);

const address: WidgetFn = (d) => (
  <GlassWidget className="max-w-[460px]">
    <WidgetHead title={d.label || "Address"} />
    <WidgetBody>
      <p className="text-[12.5px] leading-relaxed text-foreground/90">{(d.lines ?? []).join(", ") || d.address}</p>
    </WidgetBody>
    <WidgetActions>
      <WidgetButton variant="primary" onClick={() => navigator.clipboard?.writeText((d.lines ?? []).join(", ") || d.address || "")}>Copy</WidgetButton>
      <WidgetButton onClick={() => window.open(mapsUrl((d.lines ?? []).join(", ") || d.address || ""), "_blank", "noopener")}>Directions</WidgetButton>
    </WidgetActions>
  </GlassWidget>
);

const weatherNow: WidgetFn = (d) => (
  <GlassWidget className="max-w-[460px]">
    <WidgetHead title={d.city || "Weather"} subtitle={d.description} />
    <div className="flex items-center gap-4 px-4 pb-3">
      <div className="text-[40px] font-semibold leading-none text-foreground" dir="ltr">
        {d.temp}°
      </div>
      {d.icon ? (
        <img src={d.icon} alt={d.description || "Weather"} width={44} height={44} loading="lazy" className="size-11 object-contain" />
      ) : (
        <span className="text-[32px]">{d.emoji || "⛅"}</span>
      )}
      <div className="ml-auto text-right">
        {d.feelsLike && <p className="text-[12px] text-muted-foreground">Feels like {d.feelsLike}°</p>}
        {d.range && <p className="text-[12px] text-muted-foreground" dir="ltr">{d.range}</p>}
      </div>
    </div>
    <div className="grid grid-cols-3 gap-2 px-4 pb-4">
      {[
        { label: "Humidity", value: d.humidity },
        { label: "Wind", value: d.wind },
        { label: "UV", value: d.uv },
      ]
        .filter((c) => c.value != null)
        .map((c) => (
          <WidgetRow key={c.label}>
            <p className="text-[11px] text-muted-foreground">{c.label}</p>
            <p className="mt-0.5 text-[13px] font-medium text-foreground" dir="ltr">{c.value}</p>
          </WidgetRow>
        ))}
    </div>
  </GlassWidget>
);

const weatherForecast: WidgetFn = (d) => (
  <GlassWidget className="max-w-[520px]">
    <WidgetHead title={d.city || "Forecast"} subtitle={d.summary} />
    <WidgetBody>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {(d.days ?? []).map((day: any, i: number) => (
          <div
            key={i}
            className={`flex min-w-[68px] flex-1 flex-col items-center gap-1 rounded-[14px] border px-2 py-2.5 ${
              day.today ? "border-primary/50 bg-primary/10" : "border-white/10 bg-white/[0.04]"
            }`}
          >
            <span className="text-[11px] text-muted-foreground">{day.label}</span>
            {day.icon ? (
              <img src={day.icon} alt="" width={24} height={24} loading="lazy" className="size-6 object-contain" />
            ) : (
              <span className="text-[18px]">{day.emoji || "⛅"}</span>
            )}
            <span className="text-[12px] font-medium text-foreground" dir="ltr">{day.high}°</span>
            <span className="text-[11px] text-muted-foreground" dir="ltr">{day.low}°</span>
          </div>
        ))}
      </div>
    </WidgetBody>
  </GlassWidget>
);

export const PLACES_WIDGETS = {
  map,
  places,
  route,
  address,
  weather_now: weatherNow,
  weather_forecast: weatherForecast,
};
