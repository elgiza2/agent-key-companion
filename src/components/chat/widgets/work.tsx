/** @doc Work widgets — the everyday integration cards:
 *  email · chat · tasks · docs · sheets · CRM · support · payments · shipping · social · dev · HR. */
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

/* ---------- email & chat ---------- */

const emailDraft: WidgetFn = (d, ctx) => {
  const [body, setBody] = useState(String(d.body ?? ""));
  return (
    <GlassWidget className="max-w-[540px]">
      <WidgetHead mark={<WidgetMark src={d.logo} alt={d.provider || "Mail"} />} title="Draft email" subtitle={d.provider} />
      <WidgetBody>
        <div className="rounded-[14px] border border-white/10 bg-white/[0.04] px-3 py-1.5">
          <WidgetField label="To" value={d.to} />
          {d.cc && <WidgetField label="Cc" value={d.cc} />}
          <WidgetField label="Subject" value={d.subject} />
        </div>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={7}
          className="mt-2.5 w-full resize-y rounded-[14px] border border-white/15 bg-white/[0.05] px-3 py-2.5 text-[12.5px] leading-relaxed text-foreground outline-none focus:border-primary/60"
        />
      </WidgetBody>
      <WidgetActions>
        <WidgetButton variant="primary" onClick={() => ctx.onSend(`Send the email to ${d.to} with this body:\n\n${body}`)}>
          Send
        </WidgetButton>
        <WidgetButton onClick={() => ctx.onSend(`Rewrite the email to ${d.to} in a ${d.tone || "friendlier"} tone.`)}>Rewrite</WidgetButton>
        <WidgetButton onClick={() => ctx.onSend("Discard that email.")}>Discard</WidgetButton>
      </WidgetActions>
    </GlassWidget>
  );
};

const emailList: WidgetFn = (d, ctx) => (
  <GlassWidget className="max-w-[560px]">
    <WidgetHead title={d.title || "Inbox"} subtitle={`${(d.items ?? []).length} messages`} />
    <WidgetBody>
      <div className="flex flex-col gap-2">
        {(d.items ?? []).map((m: any, i: number) => (
          <WidgetRow key={i} className="flex items-start gap-3">
            <span className={`mt-[6px] size-1.5 shrink-0 rounded-full ${m.unread ? "bg-primary" : "bg-white/15"}`} />
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-2">
                <p className="truncate text-[12.5px] font-medium text-foreground">{m.from}</p>
                {m.at && <span className="shrink-0 text-[11px] text-muted-foreground" dir="ltr">{m.at}</span>}
              </div>
              <p className="truncate text-[12px] text-foreground/85">{m.subject}</p>
              {m.snippet && <p className="mt-0.5 line-clamp-2 text-[11.5px] leading-snug text-muted-foreground">{m.snippet}</p>}
            </div>
            <WidgetButton onClick={() => ctx.onSend(`Open the email from ${m.from} about "${m.subject}".`)}>Open</WidgetButton>
          </WidgetRow>
        ))}
      </div>
    </WidgetBody>
  </GlassWidget>
);

const messageCard: WidgetFn = (d, ctx) => (
  <GlassWidget className="max-w-[520px]">
    <WidgetHead mark={<WidgetMark src={d.logo} alt={d.service || "Chat"} />} title={d.channel || d.service || "Message"} subtitle={d.to} />
    <WidgetBody>
      <div className="rounded-[14px] border border-white/10 bg-white/[0.04] px-3 py-2.5">
        <p className="whitespace-pre-wrap text-[12.5px] leading-relaxed text-foreground/90">{d.text}</p>
      </div>
    </WidgetBody>
    <WidgetActions>
      <WidgetButton variant="primary" onClick={() => ctx.onSend(`Send that message to ${d.to}.`)}>Send</WidgetButton>
      <WidgetButton onClick={() => ctx.onSend("Edit that message.")}>Edit</WidgetButton>
    </WidgetActions>
  </GlassWidget>
);

const channelPicker: WidgetFn = (d, ctx) => (
  <GlassWidget className="max-w-[480px]">
    <WidgetHead title={d.title || "Pick a channel"} subtitle={d.service} />
    <WidgetBody>
      <div className="flex flex-col gap-2">
        {(d.channels ?? []).map((c: any, i: number) => (
          <WidgetRow key={i} className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-[12.5px] text-foreground">{c.name ?? c}</p>
              {c.members != null && <p className="text-[11px] text-muted-foreground">{c.members} members</p>}
            </div>
            <WidgetButton onClick={() => ctx.onSend(`Use the channel ${c.name ?? c}.`)}>Use</WidgetButton>
          </WidgetRow>
        ))}
      </div>
    </WidgetBody>
  </GlassWidget>
);

/* ---------- work items ---------- */

const taskCard: WidgetFn = (d, ctx) => (
  <GlassWidget className="max-w-[480px]">
    <WidgetHead
      mark={<WidgetMark src={d.logo} alt={d.service || "Task"} />}
      title={d.title || "Task"}
      subtitle={d.project}
      badge={d.priority && <WidgetBadge tone={d.priority === "high" ? "bad" : "muted"}>{d.priority}</WidgetBadge>}
    />
    <WidgetBody>
      <div className="rounded-[14px] border border-white/10 bg-white/[0.04] px-3 py-1.5">
        {d.assignee && <WidgetField label="Assignee" value={d.assignee} />}
        {d.dueAt && <WidgetField label="Due" value={d.dueAt} />}
        {d.status && <WidgetField label="Status" value={d.status} />}
      </div>
    </WidgetBody>
    <WidgetActions>
      <WidgetButton variant="primary" onClick={() => ctx.onSend(`Mark "${d.title}" as done.`)}>Done</WidgetButton>
      {d.url && <WidgetButton onClick={() => window.open(d.url, "_blank", "noopener")}>Open</WidgetButton>}
    </WidgetActions>
  </GlassWidget>
);

const noteCard: WidgetFn = (d) => (
  <GlassWidget className="max-w-[520px]">
    <WidgetHead mark={<WidgetMark src={d.logo} alt={d.service || "Note"} />} title={d.title || "Note"} subtitle={d.service} />
    <WidgetBody>
      {d.excerpt && <p className="whitespace-pre-wrap text-[12.5px] leading-relaxed text-foreground/90">{d.excerpt}</p>}
      {!!(d.tags ?? []).length && (
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {(d.tags ?? []).map((t: string, i: number) => (
            <span key={i} className="rounded-full border border-white/15 bg-white/[0.06] px-2.5 py-0.5 text-[11px] text-muted-foreground">{t}</span>
          ))}
        </div>
      )}
    </WidgetBody>
    {d.url && (
      <WidgetActions>
        <WidgetButton variant="primary" onClick={() => window.open(d.url, "_blank", "noopener")}>Open</WidgetButton>
      </WidgetActions>
    )}
  </GlassWidget>
);

const sheetRow: WidgetFn = (d, ctx) => {
  const cols: { name: string; label?: string; value?: string }[] = d.columns ?? [];
  const [values, setValues] = useState<Record<string, string>>(() => Object.fromEntries(cols.map((c) => [c.name, c.value ?? ""])));
  return (
    <GlassWidget className="max-w-[560px]">
      <WidgetHead mark={<WidgetMark src={d.logo} alt={d.service || "Sheet"} />} title={d.title || d.sheet || "Row"} subtitle={d.service} />
      <WidgetBody>
        <div className="flex flex-col gap-2">
          {cols.map((c) => (
            <label key={c.name} className="flex flex-col gap-1">
              <span className="text-[11.5px] text-muted-foreground">{c.label || c.name}</span>
              <input
                value={values[c.name] ?? ""}
                onChange={(e) => setValues((v) => ({ ...v, [c.name]: e.target.value }))}
                className="rounded-[12px] border border-white/15 bg-white/[0.05] px-3 py-2 text-[12.5px] text-foreground outline-none focus:border-primary/60"
              />
            </label>
          ))}
        </div>
      </WidgetBody>
      <WidgetActions>
        <WidgetButton variant="primary" onClick={() => ctx.onSend(`Save the row — ${cols.map((c) => `${c.label || c.name}: ${values[c.name]}`).join(" · ")}`)}>
          Save row
        </WidgetButton>
      </WidgetActions>
    </GlassWidget>
  );
};

const crmRecord: WidgetFn = (d, ctx) => (
  <GlassWidget className="max-w-[520px]">
    <WidgetHead
      mark={<WidgetMark src={d.logo} alt={d.service || "CRM"} />}
      title={d.name || d.company || "Record"}
      subtitle={d.company && d.name ? d.company : d.service}
      badge={d.stage && <WidgetBadge tone="ok">{d.stage}</WidgetBadge>}
    />
    <WidgetBody>
      <div className="rounded-[14px] border border-white/10 bg-white/[0.04] px-3 py-1.5">
        {d.email && <WidgetField label="Email" value={d.email} />}
        {d.phone && <WidgetField label="Phone" value={d.phone} />}
        {d.owner && <WidgetField label="Owner" value={d.owner} />}
        {d.amount != null && <WidgetField label="Amount" value={money(d.amount, d.currency)} />}
        {d.closeDate && <WidgetField label="Close date" value={d.closeDate} />}
      </div>
    </WidgetBody>
    <WidgetActions>
      <WidgetButton variant="primary" onClick={() => ctx.onSend(`Draft a follow-up to ${d.name || d.company}.`)}>Follow up</WidgetButton>
      {d.url && <WidgetButton onClick={() => window.open(d.url, "_blank", "noopener")}>Open deal</WidgetButton>}
    </WidgetActions>
  </GlassWidget>
);

const ticketCard: WidgetFn = (d, ctx) => (
  <GlassWidget className="max-w-[520px]">
    <WidgetHead
      mark={<WidgetMark src={d.logo} alt={d.service || "Support"} />}
      title={d.subject || d.title || "Ticket"}
      subtitle={d.requester}
      badge={d.priority && <WidgetBadge tone={d.priority === "urgent" ? "bad" : "warn"}>{d.priority}</WidgetBadge>}
    />
    <WidgetBody>
      {d.body && <p className="line-clamp-4 whitespace-pre-wrap text-[12.5px] leading-relaxed text-muted-foreground">{d.body}</p>}
      <div className="mt-2.5 rounded-[14px] border border-white/10 bg-white/[0.04] px-3 py-1.5">
        {d.status && <WidgetField label="Status" value={d.status} />}
        {d.assignee && <WidgetField label="Assignee" value={d.assignee} />}
        {d.sla && <WidgetField label="SLA" value={d.sla} />}
      </div>
    </WidgetBody>
    <WidgetActions>
      <WidgetButton variant="primary" onClick={() => ctx.onSend(`Draft a reply to ticket "${d.subject}".`)}>Reply</WidgetButton>
      {d.url && <WidgetButton onClick={() => window.open(d.url, "_blank", "noopener")}>Open ticket</WidgetButton>}
    </WidgetActions>
  </GlassWidget>
);

/* ---------- money & logistics ---------- */

const paymentLink: WidgetFn = (d, ctx) => (
  <GlassWidget className="max-w-[460px]">
    <WidgetHead mark={<WidgetMark src={d.logo} alt={d.service || "Pay"} />} title={d.title || "Invoice"} subtitle={d.to} />
    <div className="px-4 pb-3">
      <div className="text-[28px] font-semibold leading-none text-foreground" dir="ltr">{money(d.amount, d.currency)}</div>
      {d.dueAt && <p className="mt-1.5 text-[12px] text-muted-foreground">Due {d.dueAt}</p>}
    </div>
    <WidgetActions>
      {d.url && <WidgetButton variant="primary" onClick={() => window.open(d.url, "_blank", "noopener")}>Pay</WidgetButton>}
      <WidgetButton onClick={() => navigator.clipboard?.writeText(d.url || "")}>Copy link</WidgetButton>
    </WidgetActions>
  </GlassWidget>
);

const invoiceCard: WidgetFn = (d) => (
  <GlassWidget className="max-w-[520px]">
    <WidgetHead
      mark={<WidgetMark src={d.logo} alt={d.service || "Invoice"} />}
      title={d.number || "Invoice"}
      subtitle={d.customer}
      badge={d.status && <WidgetBadge tone={d.status === "paid" ? "ok" : "warn"}>{d.status}</WidgetBadge>}
    />
    <WidgetBody>
      <div className="rounded-[14px] border border-white/10 bg-white/[0.04] px-3 py-1.5">
        {d.issued && <WidgetField label="Issued" value={d.issued} />}
        {d.dueAt && <WidgetField label="Due" value={d.dueAt} />}
        <WidgetField label="Total" value={money(d.total, d.currency)} />
      </div>
    </WidgetBody>
    {d.url && (
      <WidgetActions>
        <WidgetButton variant="primary" onClick={() => window.open(d.url, "_blank", "noopener")}>Download</WidgetButton>
      </WidgetActions>
    )}
  </GlassWidget>
);

const shipment: WidgetFn = (d) => (
  <GlassWidget className="max-w-[520px]">
    <WidgetHead
      mark={<WidgetMark src={d.logo} alt={d.carrier || "Shipment"} />}
      title={d.carrier || "Shipment"}
      subtitle={d.trackingNumber}
      badge={d.status && <WidgetBadge tone="ok">{d.status}</WidgetBadge>}
    />
    <WidgetBody>
      <div className="flex flex-col">
        {(d.steps ?? []).map((s: any, i: number) => (
          <div key={i} className="flex gap-3">
            <div className="flex flex-col items-center pt-1.5">
              <span className={`size-2.5 rounded-full ${s.done ? "bg-emerald-400" : "border border-white/25"}`} />
              {i < (d.steps ?? []).length - 1 && <span className="w-px flex-1 bg-white/12" />}
            </div>
            <div className="flex flex-1 items-baseline justify-between gap-3 pb-3">
              <span className={`text-[12.5px] ${s.done ? "text-foreground" : "text-muted-foreground"}`}>{s.label}</span>
              {s.at && <span className="shrink-0 font-mono text-[11px] text-muted-foreground" dir="ltr">{s.at}</span>}
            </div>
          </div>
        ))}
      </div>
    </WidgetBody>
    {d.url && (
      <WidgetActions>
        <WidgetButton variant="primary" onClick={() => window.open(d.url, "_blank", "noopener")}>Track</WidgetButton>
      </WidgetActions>
    )}
  </GlassWidget>
);

/* ---------- growth ---------- */

const socialPost: WidgetFn = (d, ctx) => (
  <GlassWidget className="max-w-[520px]">
    <WidgetHead
      mark={<WidgetMark src={d.logo} alt={d.network || "Social"} />}
      title={d.network || "Post"}
      subtitle={d.account}
      badge={d.scheduledAt ? <WidgetBadge tone="muted">Scheduled</WidgetBadge> : undefined}
    />
    <WidgetBody>
      <div className="rounded-[14px] border border-white/10 bg-white/[0.04] p-3">
        <p className="whitespace-pre-wrap text-[12.5px] leading-relaxed text-foreground/90">{d.text}</p>
        {!!(d.media ?? []).length && (
          <div className="mt-2 grid grid-cols-2 gap-2">
            {(d.media ?? []).map((m: any, i: number) => (
              <img key={i} src={m.url ?? m} alt="" loading="lazy" className="aspect-video w-full rounded-[12px] object-cover" />
            ))}
          </div>
        )}
      </div>
      {d.scheduledAt && <p className="mt-2 text-[11.5px] text-muted-foreground">Goes live {d.scheduledAt}</p>}
    </WidgetBody>
    <WidgetActions>
      <WidgetButton variant="primary" onClick={() => ctx.onSend(`Schedule that post${d.scheduledAt ? ` for ${d.scheduledAt}` : ""}.`)}>
        Schedule
      </WidgetButton>
      <WidgetButton onClick={() => ctx.onSend("Edit that post.")}>Edit</WidgetButton>
    </WidgetActions>
  </GlassWidget>
);

const campaign: WidgetFn = (d, ctx) => (
  <GlassWidget className="max-w-[520px]">
    <WidgetHead
      mark={<WidgetMark src={d.logo} alt={d.channel || "Campaign"} />}
      title={d.name || "Campaign"}
      subtitle={d.channel}
      badge={d.status && <WidgetBadge tone="ok">{d.status}</WidgetBadge>}
    />
    <WidgetBody>
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: "Budget", value: d.budget != null ? money(d.budget, d.currency) : null },
          { label: "Reach", value: d.reach },
          { label: "Cost", value: d.cost },
        ]
          .filter((c) => c.value != null)
          .map((c) => (
            <WidgetRow key={c.label}>
              <p className="text-[11px] text-muted-foreground">{c.label}</p>
              <p className="mt-0.5 text-[13px] font-medium text-foreground" dir="ltr">{c.value}</p>
            </WidgetRow>
          ))}
      </div>
    </WidgetBody>
    <WidgetActions>
      <WidgetButton variant="primary" onClick={() => ctx.onSend(`Launch the campaign "${d.name}".`)}>Launch</WidgetButton>
      <WidgetButton onClick={() => ctx.onSend(`Change the budget of "${d.name}".`)}>Budget</WidgetButton>
    </WidgetActions>
  </GlassWidget>
);

/* ---------- engineering & people ---------- */

const repoCard: WidgetFn = (d, ctx) => (
  <GlassWidget className="max-w-[520px]">
    <WidgetHead
      mark={<WidgetMark src={d.logo} alt={d.service || "Repo"} />}
      title={d.name || "Repository"}
      subtitle={d.description}
      badge={d.private ? <WidgetBadge tone="muted">Private</WidgetBadge> : undefined}
    />
    <WidgetBody>
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: "Stars", value: d.stars },
          { label: "Forks", value: d.forks },
          { label: "Open issues", value: d.issues },
        ]
          .filter((c) => c.value != null)
          .map((c) => (
            <WidgetRow key={c.label}>
              <p className="text-[11px] text-muted-foreground">{c.label}</p>
              <p className="mt-0.5 text-[13px] font-medium text-foreground" dir="ltr">{c.value}</p>
            </WidgetRow>
          ))}
      </div>
    </WidgetBody>
    <WidgetActions>
      {d.url && <WidgetButton variant="primary" onClick={() => window.open(d.url, "_blank", "noopener")}>Open repo</WidgetButton>}
      <WidgetButton onClick={() => ctx.onSend(`List the open pull requests in ${d.name}.`)}>Pull requests</WidgetButton>
    </WidgetActions>
  </GlassWidget>
);

const issueCard: WidgetFn = (d, ctx) => (
  <GlassWidget className="max-w-[520px]">
    <WidgetHead
      mark={<WidgetMark src={d.logo} alt={d.service || "Issue"} />}
      title={d.title || "Issue"}
      subtitle={[d.repo, d.number ? `#${d.number}` : null].filter(Boolean).join(" · ")}
      badge={d.state && <WidgetBadge tone={d.state === "open" ? "ok" : "muted"}>{d.state}</WidgetBadge>}
    />
    <WidgetBody>
      {d.body && <p className="line-clamp-4 whitespace-pre-wrap text-[12.5px] leading-relaxed text-muted-foreground">{d.body}</p>}
      {!!(d.labels ?? []).length && (
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {(d.labels ?? []).map((l: any, i: number) => (
            <span key={i} className="rounded-full border border-white/15 bg-white/[0.06] px-2.5 py-0.5 text-[11px] text-muted-foreground">{l.name ?? l}</span>
          ))}
        </div>
      )}
    </WidgetBody>
    <WidgetActions>
      <WidgetButton variant="primary" onClick={() => ctx.onSend(`Fix issue #${d.number} in ${d.repo}.`)}>Fix it</WidgetButton>
      {d.url && <WidgetButton onClick={() => window.open(d.url, "_blank", "noopener")}>Open</WidgetButton>}
    </WidgetActions>
  </GlassWidget>
);

const deployStatus: WidgetFn = (d) => (
  <GlassWidget className="max-w-[480px]">
    <WidgetHead
      mark={<WidgetMark src={d.logo} alt={d.service || "Deploy"} />}
      title={d.project || "Deployment"}
      subtitle={d.commit}
      badge={<WidgetBadge tone={d.state === "ready" ? "ok" : d.state === "error" ? "bad" : "muted"}>{d.state || "Building"}</WidgetBadge>}
    />
    <WidgetBody>
      <div className="rounded-[14px] border border-white/10 bg-white/[0.04] px-3 py-1.5">
        {d.branch && <WidgetField label="Branch" value={d.branch} />}
        {d.duration && <WidgetField label="Duration" value={d.duration} />}
        {d.url && <WidgetField label="URL" value={d.url} />}
      </div>
    </WidgetBody>
    {d.url && (
      <WidgetActions>
        <WidgetButton variant="primary" onClick={() => window.open(d.url, "_blank", "noopener")}>Visit</WidgetButton>
      </WidgetActions>
    )}
  </GlassWidget>
);

const employeeCard: WidgetFn = (d, ctx) => (
  <GlassWidget className="max-w-[480px]">
    <WidgetHead
      mark={<WidgetMark src={d.avatar || d.logo} alt={d.name || "Employee"} />}
      title={d.name || "Employee"}
      subtitle={d.title}
      badge={d.status && <WidgetBadge tone="ok">{d.status}</WidgetBadge>}
    />
    <WidgetBody>
      <div className="rounded-[14px] border border-white/10 bg-white/[0.04] px-3 py-1.5">
        {d.department && <WidgetField label="Team" value={d.department} />}
        {d.manager && <WidgetField label="Manager" value={d.manager} />}
        {d.startDate && <WidgetField label="Started" value={d.startDate} />}
        {d.email && <WidgetField label="Email" value={d.email} />}
      </div>
    </WidgetBody>
    <WidgetActions>
      <WidgetButton variant="primary" onClick={() => ctx.onSend(`Show ${d.name}'s time off balance.`)}>Time off</WidgetButton>
    </WidgetActions>
  </GlassWidget>
);

const leaveCard: WidgetFn = (d, ctx) => (
  <GlassWidget className="max-w-[460px]">
    <WidgetHead mark={<WidgetMark src={d.logo} alt={d.service || "Leave"} />} title={d.title || "Time off request"} subtitle={d.person} badge={d.status && <WidgetBadge tone="warn">{d.status}</WidgetBadge>} />
    <WidgetBody>
      <div className="rounded-[14px] border border-white/10 bg-white/[0.04] px-3 py-1.5">
        {d.from && <WidgetField label="From" value={d.from} />}
        {d.to && <WidgetField label="To" value={d.to} />}
        {d.days != null && <WidgetField label="Days" value={String(d.days)} />}
        {d.balance != null && <WidgetField label="Balance" value={String(d.balance)} />}
      </div>
    </WidgetBody>
    <WidgetActions>
      <WidgetButton variant="primary" onClick={() => ctx.onSend(`Approve the time off request from ${d.person}.`)}>Approve</WidgetButton>
      <WidgetButton onClick={() => ctx.onSend(`Decline the time off request from ${d.person}.`)}>Decline</WidgetButton>
    </WidgetActions>
  </GlassWidget>
);

const contact: WidgetFn = (d, ctx) => (
  <GlassWidget className="max-w-[440px]">
    <WidgetHead mark={<WidgetMark src={d.avatar} alt={d.name || "Contact"} />} title={d.name || "Contact"} subtitle={d.title} />
    <WidgetBody>
      <div className="rounded-[14px] border border-white/10 bg-white/[0.04] px-3 py-1.5">
        {d.email && <WidgetField label="Email" value={d.email} />}
        {d.phone && <WidgetField label="Phone" value={d.phone} />}
        {d.company && <WidgetField label="Company" value={d.company} />}
      </div>
    </WidgetBody>
    <WidgetActions>
      <WidgetButton variant="primary" onClick={() => ctx.onSend(`Email ${d.name}.`)}>Email</WidgetButton>
      {d.phone && <WidgetButton onClick={() => ctx.onSend(`Call ${d.name}.`)}>Call</WidgetButton>}
    </WidgetActions>
  </GlassWidget>
);

export const WORK_WIDGETS = {
  email_draft: emailDraft,
  email_list: emailList,
  message_card: messageCard,
  channel_picker: channelPicker,
  task_card: taskCard,
  note_card: noteCard,
  sheet_row: sheetRow,
  crm_record: crmRecord,
  ticket_card: ticketCard,
  payment_link: paymentLink,
  invoice_card: invoiceCard,
  shipment,
  social_post: socialPost,
  campaign,
  repo_card: repoCard,
  issue_card: issueCard,
  deploy_status: deployStatus,
  employee_card: employeeCard,
  leave_card: leaveCard,
  contact,
};
