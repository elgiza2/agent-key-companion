/** @doc Data widgets: kpi · kpi_grid · result_list · result_detail · funnel · schema_card · query_result. */
import {
  GlassWidget,
  WidgetActions,
  WidgetBody,
  WidgetButton,
  WidgetField,
  WidgetHead,
  WidgetRow,
  WidgetTable,
} from "./GlassWidget";
import type { WidgetFn } from "./registry";

const kpi: WidgetFn = (d) => (
  <GlassWidget className="max-w-[420px]">
    <WidgetHead title={d.label || "Metric"} subtitle={d.caption} />
    <div className="px-4 pb-4">
      <div className="text-[30px] font-semibold leading-none text-foreground" dir="ltr">
        {d.value}
      </div>
      {d.delta != null && (
        <p className={`mt-1.5 text-[12.5px] ${String(d.delta).startsWith("-") ? "text-red-300" : "text-emerald-300"}`} dir="ltr">
          {d.delta}
        </p>
      )}
    </div>
  </GlassWidget>
);

const kpiGrid: WidgetFn = (d) => (
  <GlassWidget className="max-w-[560px]">
    <WidgetHead title={d.title || "Overview"} />
    <WidgetBody>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {(d.items ?? []).map((it: any, i: number) => (
          <WidgetRow key={i}>
            <p className="text-[11.5px] text-muted-foreground">{it.label}</p>
            <p className="mt-1 text-[16px] font-semibold text-foreground" dir="ltr">{it.value}</p>
          </WidgetRow>
        ))}
      </div>
    </WidgetBody>
  </GlassWidget>
);

const resultList: WidgetFn = (d) => (
  <GlassWidget className="max-w-[560px]">
    <WidgetHead title={d.title || "Results"} subtitle={`${(d.items ?? []).length} items`} />
    <WidgetBody>
      <div className="flex flex-col gap-2">
        {(d.items ?? []).map((it: any, i: number) => (
          <WidgetRow key={i} className="flex items-center gap-3">
            {it.logo && <img src={it.logo} alt="" width={20} height={20} loading="lazy" className="size-5 shrink-0 object-contain" />}
            <div className="min-w-0 flex-1">
              <p className="truncate text-[12.5px] font-medium text-foreground">{it.title ?? it.name}</p>
              {it.subtitle && <p className="mt-0.5 truncate text-[11.5px] text-muted-foreground">{it.subtitle}</p>}
            </div>
            {it.meta && <span className="shrink-0 text-[11.5px] text-muted-foreground" dir="ltr">{it.meta}</span>}
          </WidgetRow>
        ))}
      </div>
    </WidgetBody>
  </GlassWidget>
);

const resultDetail: WidgetFn = (d) => (
  <GlassWidget className="max-w-[520px]">
    <WidgetHead title={d.title || "Details"} subtitle={d.subtitle} />
    <WidgetBody>
      <div className="rounded-[14px] border border-white/10 bg-white/[0.04] px-3 py-1.5">
        {(d.fields ?? []).map((f: any, i: number) => (
          <WidgetField key={i} label={f.label} value={f.value ?? "—"} />
        ))}
      </div>
    </WidgetBody>
    {d.url && (
      <WidgetActions>
        <WidgetButton variant="primary" onClick={() => window.open(d.url, "_blank", "noopener")}>Open</WidgetButton>
      </WidgetActions>
    )}
  </GlassWidget>
);

const funnel: WidgetFn = (d) => {
  const steps: { label: string; value: number }[] = d.steps ?? [];
  const top = Math.max(1, ...steps.map((s) => Number(s.value) || 0));
  return (
    <GlassWidget className="max-w-[560px]">
      <WidgetHead title={d.title || "Funnel"} subtitle={d.summary} />
      <WidgetBody>
        <div className="flex flex-col gap-2">
          {steps.map((s, i) => (
            <div key={i}>
              <div className="flex items-baseline justify-between">
                <span className="text-[12px] text-muted-foreground">{s.label}</span>
                <span className="text-[12px] font-medium text-foreground" dir="ltr">{s.value}</span>
              </div>
              <div className="mt-1 h-2 overflow-hidden rounded-full bg-white/[0.06]">
                <div className="h-full rounded-full bg-primary/60" style={{ width: `${Math.max(3, (Number(s.value) / top) * 100)}%` }} />
              </div>
            </div>
          ))}
        </div>
      </WidgetBody>
    </GlassWidget>
  );
};

const schemaCard: WidgetFn = (d) => (
  <GlassWidget className="max-w-[560px]">
    <WidgetHead title={d.table || d.title || "Schema"} subtitle={d.database} />
    <WidgetBody>
      <div className="flex flex-col gap-2">
        {(d.columns ?? []).map((c: any, i: number) => (
          <WidgetRow key={i} className="flex items-center justify-between gap-3">
            <span className="truncate font-mono text-[12px] text-foreground/90">{c.name ?? c}</span>
            <span className="shrink-0 font-mono text-[11px] text-muted-foreground">{c.type}</span>
          </WidgetRow>
        ))}
      </div>
    </WidgetBody>
  </GlassWidget>
);

const queryResult: WidgetFn = (d) => (
  <GlassWidget className="max-w-[560px]">
    <WidgetHead title={d.title || "Query result"} subtitle={d.database} />
    <WidgetBody>
      {d.sql && (
        <pre className="mb-2.5 overflow-x-auto rounded-[14px] border border-white/10 bg-white/[0.04] px-3 py-2 font-mono text-[11px] text-muted-foreground">{String(d.sql)}</pre>
      )}
      <WidgetTable columns={d.columns ?? []} rows={d.rows ?? []} />
    </WidgetBody>
  </GlassWidget>
);

export const DATA_WIDGETS = {
  kpi,
  kpi_grid: kpiGrid,
  result_list: resultList,
  result_detail: resultDetail,
  funnel,
  schema_card: schemaCard,
  query_result: queryResult,
};
