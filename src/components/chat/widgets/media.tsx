/** @doc Media and file widgets: image · image_grid · video · audio · file · code · diff · chart · table · diagram. */
import {
  GlassWidget,
  WidgetActions,
  WidgetBadge,
  WidgetBody,
  WidgetButton,
  WidgetHead,
  WidgetTable,
  WidgetRow,
} from "./GlassWidget";
import type { WidgetFn } from "./registry";

const bytes = (n?: number) => {
  if (!n || n < 0) return "";
  const u = ["B", "KB", "MB", "GB"];
  let i = 0;
  let v = n;
  while (v >= 1024 && i < u.length - 1) {
    v /= 1024;
    i += 1;
  }
  return `${v.toFixed(v < 10 && i > 0 ? 1 : 0)} ${u[i]}`;
};

const image: WidgetFn = (d) => (
  <GlassWidget className="max-w-[520px]">
    <WidgetHead title={d.title || "Image"} subtitle={d.model} badge={d.status && <WidgetBadge tone="ok">{d.status}</WidgetBadge>} />
    <div className="p-3">
      <img src={d.url} alt={d.alt || d.title || "Generated image"} loading="lazy" className="w-full rounded-[16px] border border-white/10 object-cover" />
    </div>
    <WidgetActions>
      <WidgetButton variant="primary" onClick={() => window.open(d.url, "_blank", "noopener")}>Open</WidgetButton>
      <WidgetButton onClick={() => window.open(d.url, "_blank", "noopener")}>Download</WidgetButton>
    </WidgetActions>
  </GlassWidget>
);

const imageGrid: WidgetFn = (d) => (
  <GlassWidget className="max-w-[560px]">
    <WidgetHead title={d.title || "Gallery"} subtitle={`${(d.items ?? []).length} images`} />
    <WidgetBody>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {(d.items ?? []).map((it: any, i: number) => (
          <img key={i} src={it.url ?? it} alt={it.alt || `Image ${i + 1}`} loading="lazy" className="aspect-square w-full rounded-[14px] border border-white/10 object-cover" />
        ))}
      </div>
    </WidgetBody>
  </GlassWidget>
);

const video: WidgetFn = (d) => (
  <GlassWidget className="max-w-[560px]">
    <WidgetHead title={d.title || "Video"} subtitle={d.model} />
    <div className="p-3">
      <video src={d.url} poster={d.poster} controls playsInline className="w-full rounded-[16px] border border-white/10" />
    </div>
  </GlassWidget>
);

const audio: WidgetFn = (d) => (
  <GlassWidget className="max-w-[520px]">
    <WidgetHead title={d.title || "Audio"} subtitle={d.voice || d.model} />
    <div className="px-4 pb-3">
      <audio src={d.url} controls className="w-full" />
      {d.transcript && <p className="mt-2 max-h-[160px] overflow-y-auto text-[12px] leading-relaxed text-muted-foreground">{d.transcript}</p>}
    </div>
  </GlassWidget>
);

const file: WidgetFn = (d) => (
  <GlassWidget className="max-w-[520px]">
    <WidgetHead title={d.name || "File"} subtitle={[d.mime, bytes(d.size)].filter(Boolean).join(" · ")} />
    <WidgetActions>
      {d.url && <WidgetButton variant="primary" onClick={() => window.open(d.url, "_blank", "noopener")}>Download</WidgetButton>}
      {d.content && <WidgetButton onClick={() => navigator.clipboard?.writeText(String(d.content))}>Copy contents</WidgetButton>}
    </WidgetActions>
  </GlassWidget>
);

const code: WidgetFn = (d) => (
  <GlassWidget className="max-w-[560px]">
    <WidgetHead title={d.title || d.lang || "Code"} subtitle={d.path} />
    <WidgetBody className="px-3">
      <pre className="overflow-x-auto rounded-[14px] border border-white/10 bg-white/[0.04] px-3 py-2.5 font-mono text-[11.5px] leading-relaxed text-foreground/85">
        {String(d.code ?? "")}
      </pre>
    </WidgetBody>
    <WidgetActions>
      <WidgetButton variant="primary" onClick={() => navigator.clipboard?.writeText(String(d.code ?? ""))}>Copy</WidgetButton>
      <WidgetButton onClick={() => window.open(d.url, "_blank", "noopener")}>Open file</WidgetButton>
    </WidgetActions>
  </GlassWidget>
);

const diff: WidgetFn = (d) => (
  <GlassWidget className="max-w-[560px]">
    <WidgetHead title={d.path || "Changes"} subtitle="Before → after" />
    <WidgetBody className="px-3">
      <div className="grid gap-2 sm:grid-cols-2">
        <pre className="overflow-auto rounded-[14px] border border-red-400/20 bg-red-400/[0.06] px-3 py-2 font-mono text-[11px] leading-relaxed">{String(d.before ?? "")}</pre>
        <pre className="overflow-auto rounded-[14px] border border-emerald-400/20 bg-emerald-400/[0.06] px-3 py-2 font-mono text-[11px] leading-relaxed">{String(d.after ?? "")}</pre>
      </div>
    </WidgetBody>
    <WidgetActions>
      <WidgetButton variant="primary" onClick={() => d.onApply?.()}>Apply</WidgetButton>
      <WidgetButton onClick={() => d.onReject?.()}>Reject</WidgetButton>
    </WidgetActions>
  </GlassWidget>
);

const chart: WidgetFn = (d) => {
  const series: { label: string; value: number }[] = d.series ?? [];
  const max = Math.max(1, ...series.map((s) => Number(s.value) || 0));
  return (
    <GlassWidget className="max-w-[560px]">
      <WidgetHead title={d.title || "Chart"} subtitle={d.summary} />
      <WidgetBody>
        <div className="flex h-[160px] items-end gap-2">
          {series.map((s, i) => (
            <div key={i} className="flex min-w-0 flex-1 flex-col items-center gap-1.5">
              <span className="text-[10.5px] text-muted-foreground" dir="ltr">{s.value}</span>
              <div className="w-full rounded-t-[8px] bg-primary/60" style={{ height: `${Math.max(4, (Number(s.value) / max) * 110)}px` }} />
              <span className="w-full truncate text-center text-[10.5px] text-muted-foreground">{s.label}</span>
            </div>
          ))}
        </div>
      </WidgetBody>
    </GlassWidget>
  );
};

const table: WidgetFn = (d) => (
  <GlassWidget className="max-w-[560px]">
    <WidgetHead title={d.title || "Table"} subtitle={`${(d.rows ?? []).length} rows`} />
    <WidgetBody>
      <WidgetTable columns={d.columns ?? []} rows={d.rows ?? []} />
    </WidgetBody>
    <WidgetActions>
      <WidgetButton onClick={() => window.open(`data:text/csv;charset=utf-8,${encodeURIComponent([(d.columns ?? []).join(","), ...(d.rows ?? []).map((r: string[]) => r.join(","))].join("\n"))}`, "_blank")}>
        Export CSV
      </WidgetButton>
    </WidgetActions>
  </GlassWidget>
);

const diagram: WidgetFn = (d) => (
  <GlassWidget className="max-w-[560px]">
    <WidgetHead title={d.title || "Diagram"} subtitle={d.kind} />
    {d.url ? (
      <div className="p-3">
        <img src={d.url} alt={d.title || "Diagram"} loading="lazy" className="w-full rounded-[16px] border border-white/10" />
      </div>
    ) : (
      <WidgetBody className="px-3">
        <WidgetRow>
          <pre className="overflow-x-auto font-mono text-[11px] leading-relaxed text-muted-foreground">{String(d.source ?? "")}</pre>
        </WidgetRow>
      </WidgetBody>
    )}
  </GlassWidget>
);

export const MEDIA_WIDGETS = {
  image,
  image_grid: imageGrid,
  video,
  audio,
  file,
  code,
  diff,
  chart,
  table,
  diagram,
};
