/**
 * @doc The "all payment methods" grid — every method Megsy can offer, side by side,
 * grouped so the list stays readable at a glance.
 *
 * It reads `@/lib/payments/paymentMethods`, so adding a method there is enough.
 */
import { Loader2 } from "lucide-react";
import { PaymentMethodMarks } from "./PaymentMethodMark";
import {
  PAYMENT_METHODS_BY_GROUP,
  type PaymentMethod,
} from "@/lib/payments/paymentMethods";

interface Props {
  /** When provided, chips become buttons that start the matching rail. */
  onSelect?: (method: PaymentMethod) => void;
  busyId?: string | null;
  /** Highlight the method currently chosen in the checkout. */
  activeId?: string;
  className?: string;
  showNote?: boolean;
}

export default function PaymentMethodsShowcase({
  onSelect,
  busyId = null,
  activeId,
  className = "",
  showNote = true,
}: Props) {
  return (
    <div className={`flex flex-col gap-5 ${className}`}>
      {PAYMENT_METHODS_BY_GROUP.map((section) => (
        <section key={section.group} className="flex flex-col gap-2.5">
          <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-foreground/55">
            {section.label}
          </h3>
          <div className="flex flex-wrap gap-2">
            {section.methods.map((method) => {
              const busy = busyId === method.id;
              const interactive = Boolean(onSelect);
              const Tag = interactive ? "button" : "div";
              // A single wordmark that already reads as the method name (Meeza,
              // iDEAL, BLIK, ...) is printed once, in its brand colour.
              const single = method.marks.length === 1 ? method.marks[0] : null;
              const wordmarkOnly =
                single?.kind === "word" &&
                single.text.trim().toLowerCase() === method.label.trim().toLowerCase();
              return (
                <Tag
                  key={method.id}
                  {...(interactive
                    ? { type: "button" as const, onClick: () => onSelect?.(method), disabled: busyId !== null }
                    : {})}
                  data-method={method.id}
                  data-rail={method.rail}
                  data-live={method.live ? "true" : "false"}
                  data-active={activeId === method.id ? "true" : undefined}
                  title={`${method.label} · ${method.region}`}
                  aria-label={`${method.label} — ${method.region}`}
                  className={[
                    "flex h-11 items-center gap-2 rounded-2xl border px-3 transition-colors",
                    interactive
                      ? "cursor-pointer hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 disabled:opacity-60"
                      : "cursor-default",
                    activeId === method.id
                      ? "border-foreground/35 bg-muted/60"
                      : "border-border/60 bg-card/60",
                  ].join(" ")}
                >
                  {wordmarkOnly && single?.kind === "word" ? (
                    <span
                      className="text-[12.5px] font-bold leading-none tracking-[-0.01em]"
                      style={{ color: single.color }}
                    >
                      {method.label}
                    </span>
                  ) : (
                    <>
                      <PaymentMethodMarks marks={method.marks} />
                      <span className="text-[12.5px] font-medium leading-none text-foreground/90">
                        {method.label}
                      </span>
                    </>
                  )}
                  {busy && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
                </Tag>
              );
            })}
          </div>
        </section>
      ))}

      {showNote && (
        <p className="text-[12px] leading-relaxed text-foreground/50">
          Cards, Apple Pay, Meeza and Egyptian wallets are handled right here inside Megsy. Every
          other method opens a secure Dodo Payments checkout.
        </p>
      )}
    </div>
  );
}
