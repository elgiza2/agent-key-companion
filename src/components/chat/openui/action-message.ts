/** Keep form values readable and preserve their concrete values in chat replies. */
export function actionMessage(event: {
  humanFriendlyMessage: string;
  params: Record<string, unknown>;
  formState?: Record<string, unknown>;
}): string {
  const message =
    typeof event.params.message === "string" ? event.params.message : event.humanFriendlyMessage;
  const data =
    event.params.context ??
    event.params.form ??
    event.params.data ??
    event.params.values ??
    event.formState;
  if (!data || typeof data !== "object") return message;
  const lines = Object.entries(data).flatMap(([label, raw]) => {
    const value = raw && typeof raw === "object" && "value" in raw ? raw.value : raw;
    if (value === "" || value == null) return [];
    return [
      `- ${label}: ${Array.isArray(value) ? value.join(", ") : typeof value === "object" ? JSON.stringify(value) : value}`,
    ];
  });
  return [message, ...lines].join("\n");
}
