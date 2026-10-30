/** @doc Commerce widgets — the whole order inside the chat:
 *  product_menu → option_picker → cart → checkout → order_status → receipt. */
import { useState } from "react";
import {
  GlassWidget,
  WidgetActions,
  WidgetBadge,
  WidgetBody,
  WidgetButton,
  WidgetField,
  WidgetHead,
  WidgetMark,
  WidgetRow,
} from "./GlassWidget";
import type { WidgetFn } from "./registry";

const money = (n: any, currency = "$") => `${currency}${Number(n ?? 0).toFixed(2)}`;

const productMenu: WidgetFn = (d, ctx) => {
  const items: any[] = d.items ?? [];
  return (
    <GlassWidget className="max-w-[560px]">
      <WidgetHead
        mark={<WidgetMark src={d.logo} alt={d.store || "Store"} />}
        title={d.title || d.store || "Menu"}
        subtitle={`${items.length} items`}
      />
      {!!(d.categories ?? []).length && (
        <div className="flex gap-1.5 overflow-x-auto px-4 pb-1">
          {(d.categories ?? []).map((c: string, i: number) => (
            <span key={i} className="shrink-0 rounded-full border border-white/15 bg-white/[0.05] px-3 py-1 text-[11.5px] text-muted-foreground">
              {c}
            </span>
          ))}
        </div>
      )}
      <WidgetBody>
        <div className="grid grid-cols-2 gap-2">
          {items.map((it, i) => (
            <div key={i} className="overflow-hidden rounded-[16px] border border-white/10 bg-white/[0.04]">
              {it.image && <img src={it.image} alt={it.name} loading="lazy" className="aspect-square w-full object-cover" />}
              <div className="p-2.5">
                <p className="truncate text-[12.5px] font-medium text-foreground">{it.name}</p>
                {it.description && <p className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-muted-foreground">{it.description}</p>}
                <div className="mt-2 flex items-center justify-between gap-2">
                  <span className="text-[12.5px] font-semibold text-foreground" dir="ltr">{money(it.price, d.currency)}</span>
                  <button
                    type="button"
                    onClick={() => ctx.onSend(`Add ${it.name} to the order.`)}
                    className="grid size-7 shrink-0 place-items-center rounded-full border border-white/15 bg-white/[0.06] text-[15px] leading-none text-foreground/90 hover:bg-primary/20"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </WidgetBody>
    </GlassWidget>
  );
};

const optionPicker: WidgetFn = (d, ctx) => {
  const groups: { label: string; options: { label: string; price?: number }[] }[] = d.groups ?? [];
  const [pick, setPick] = useState<Record<string, string>>({});
  return (
    <GlassWidget className="max-w-[520px]">
      <WidgetHead title={d.title || d.product || "Customise"} subtitle={d.product} />
      <WidgetBody>
        <div className="flex flex-col gap-3">
          {groups.map((g) => (
            <div key={g.label}>
              <p className="mb-1.5 text-[11.5px] font-medium text-muted-foreground">{g.label}</p>
              <div className="flex flex-wrap gap-1.5">
                {g.options.map((o) => {
                  const active = pick[g.label] === o.label;
                  return (
                    <button
                      key={o.label}
                      type="button"
                      onClick={() => setPick((p) => ({ ...p, [g.label]: o.label }))}
                      className={`rounded-full border px-3 py-1.5 text-[12px] transition-colors ${
                        active ? "border-primary/60 bg-primary/20 text-foreground" : "border-white/15 bg-white/[0.05] text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {o.label}
                      {o.price ? <span dir="ltr"> +{money(o.price, d.currency)}</span> : null}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </WidgetBody>
      <WidgetActions>
        <WidgetButton
          variant="primary"
          onClick={() =>
            ctx.onSend(`Save options — ${Object.entries(pick).map(([k, v]) => `${k}: ${v}`).join(", ")}`)
          }
        >
          Save
        </WidgetButton>
      </WidgetActions>
    </GlassWidget>
  );
};

const cart: WidgetFn = (d, ctx) => {
  const items: any[] = d.items ?? [];
  return (
    <GlassWidget className="max-w-[520px]">
      <WidgetHead title={d.title || "Your order"} subtitle={d.store} />
      <WidgetBody>
        <div className="flex flex-col gap-2">
          {items.map((it, i) => (
            <WidgetRow key={i} className="flex items-center gap-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-[12.5px] font-medium text-foreground">{it.name}</p>
                {it.options && <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{it.options}</p>}
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                <button type="button" onClick={() => ctx.onSend(`Remove one ${it.name}.`)} className="grid size-6 place-items-center rounded-full border border-white/15 text-[13px] text-muted-foreground">−</button>
                <span className="w-5 text-center text-[12.5px] text-foreground" dir="ltr">{it.qty ?? 1}</span>
                <button type="button" onClick={() => ctx.onSend(`Add one more ${it.name}.`)} className="grid size-6 place-items-center rounded-full border border-white/15 text-[13px] text-muted-foreground">+</button>
              </div>
              <span className="w-[62px] shrink-0 text-right text-[12.5px] font-medium text-foreground" dir="ltr">
                {money((it.price ?? 0) * (it.qty ?? 1), d.currency)}
              </span>
            </WidgetRow>
          ))}
        </div>
        <div className="mt-2.5 rounded-[14px] border border-white/10 bg-white/[0.04] px-3 py-1.5">
          {d.subtotal != null && <WidgetField label="Subtotal" value={money(d.subtotal, d.currency)} />}
          {d.delivery != null && <WidgetField label="Delivery" value={money(d.delivery, d.currency)} />}
          {d.tax != null && <WidgetField label="Tax" value={money(d.tax, d.currency)} />}
          <div className="mt-1 flex items-baseline justify-between border-t border-white/10 pt-2">
            <span className="text-[12.5px] text-muted-foreground">Total</span>
            <span className="text-[15px] font-semibold text-foreground" dir="ltr">{money(d.total, d.currency)}</span>
          </div>
        </div>
      </WidgetBody>
      <WidgetActions>
        <WidgetButton variant="primary" onClick={() => ctx.onSend("Checkout this order.")}>Checkout</WidgetButton>
        <WidgetButton onClick={() => ctx.onSend("Clear the order.")}>Clear</WidgetButton>
      </WidgetActions>
    </GlassWidget>
  );
};

const checkout: WidgetFn = (d, ctx) => {
  const methods: { id: string; label: string; note?: string }[] = d.methods ?? [
    { id: "card", label: "Card" },
    { id: "vodafone", label: "Vodafone Cash" },
    { id: "google", label: "Google Pay" },
    { id: "more", label: "More" },
  ];
  const [method, setMethod] = useState(methods[0]?.id ?? "card");
  return (
    <GlassWidget className="max-w-[520px]">
      <WidgetHead title={d.title || "Checkout"} subtitle={d.store} />
      <WidgetBody>
        <div className="flex flex-col gap-2">
          {methods.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setMethod(m.id)}
              className={`flex items-center gap-3 rounded-[14px] border px-3 py-2.5 text-left transition-colors ${
                method === m.id ? "border-primary/60 bg-primary/15" : "border-white/10 bg-white/[0.04] hover:bg-white/[0.07]"
              }`}
            >
              <span className={`grid size-4 place-items-center rounded-full border ${method === m.id ? "border-primary bg-primary" : "border-white/25"}`}>
                {method === m.id && <span className="size-1.5 rounded-full bg-primary-foreground" />}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[12.5px] font-medium text-foreground">{m.label}</span>
                {m.note && <span className="block text-[11px] text-muted-foreground">{m.note}</span>}
              </span>
            </button>
          ))}
        </div>
        {d.address && (
          <div className="mt-2.5 rounded-[14px] border border-white/10 bg-white/[0.04] px-3 py-2.5">
            <p className="text-[11.5px] text-muted-foreground">Delivering to</p>
            <p className="mt-0.5 text-[12.5px] text-foreground/90">{d.address}</p>
          </div>
        )}
        <div className="mt-2.5 flex items-baseline justify-between">
          <span className="text-[12.5px] text-muted-foreground">Total</span>
          <span className="text-[16px] font-semibold text-foreground" dir="ltr">{money(d.total, d.currency)}</span>
        </div>
      </WidgetBody>
      <WidgetActions>
        <WidgetButton variant="primary" onClick={() => ctx.onSend(`Pay ${money(d.total, d.currency)} with ${method}.`)}>
          Pay {money(d.total, d.currency)}
        </WidgetButton>
        <WidgetButton onClick={() => ctx.onSend("Change the delivery address.")}>Address</WidgetButton>
      </WidgetActions>
    </GlassWidget>
  );
};

const orderStatus: WidgetFn = (d) => (
  <GlassWidget className="max-w-[520px]">
    <WidgetHead
      mark={<WidgetMark src={d.logo} alt={d.store || "Order"} />}
      title={d.title || `Order ${d.orderId || ""}`}
      subtitle={d.eta}
      badge={d.status && <WidgetBadge tone="ok">{d.status}</WidgetBadge>}
    />
    <WidgetBody>
      <div className="flex flex-col">
        {(d.steps ?? []).map((s: any, i: number) => (
          <div key={i} className="flex gap-3">
            <div className="flex flex-col items-center pt-1.5">
              <span className={`size-2.5 rounded-full ${s.done ? "bg-emerald-400" : "border border-white/25 bg-transparent"}`} />
              {i < (d.steps ?? []).length - 1 && <span className={`w-px flex-1 ${s.done ? "bg-emerald-400/40" : "bg-white/12"}`} />}
            </div>
            <div className="flex flex-1 items-baseline justify-between gap-3 pb-3">
              <span className={`text-[12.5px] ${s.done ? "text-foreground" : "text-muted-foreground"}`}>{s.label}</span>
              {s.at && <span className="shrink-0 font-mono text-[11px] text-muted-foreground" dir="ltr">{s.at}</span>}
            </div>
          </div>
        ))}
      </div>
    </WidgetBody>
    {d.trackingUrl && (
      <WidgetActions>
        <WidgetButton variant="primary" onClick={() => window.open(d.trackingUrl, "_blank", "noopener")}>Track</WidgetButton>
      </WidgetActions>
    )}
  </GlassWidget>
);

const receipt: WidgetFn = (d) => (
  <GlassWidget className="max-w-[520px]">
    <WidgetHead title={d.title || "Receipt"} subtitle={d.date} badge={<WidgetBadge tone="ok">Paid</WidgetBadge>} />
    <WidgetBody>
      <div className="rounded-[14px] border border-white/10 bg-white/[0.04] px-3 py-1.5">
        {(d.items ?? []).map((it: any, i: number) => (
          <WidgetField key={i} label={`${it.name}${it.qty ? ` ×${it.qty}` : ""}`} value={money(it.price, d.currency)} />
        ))}
        <div className="mt-1 flex items-baseline justify-between border-t border-white/10 pt-2">
          <span className="text-[12.5px] text-muted-foreground">Total</span>
          <span className="text-[15px] font-semibold text-foreground" dir="ltr">{money(d.total, d.currency)}</span>
        </div>
      </div>
    </WidgetBody>
    <WidgetActions>
      {d.url && <WidgetButton variant="primary" onClick={() => window.open(d.url, "_blank", "noopener")}>Download</WidgetButton>}
      <WidgetButton onClick={() => navigator.clipboard?.writeText(JSON.stringify(d.items ?? [], null, 2))}>Copy items</WidgetButton>
    </WidgetActions>
  </GlassWidget>
);

export const COMMERCE_WIDGETS = {
  product_menu: productMenu,
  option_picker: optionPicker,
  cart,
  checkout,
  order_status: orderStatus,
  receipt,
};
