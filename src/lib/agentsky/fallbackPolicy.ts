export type AgentFallbackContext = {
  isMedia: boolean;
  hasVisibleOutput: boolean;
  hasPerformedAction: boolean;
};

/**
 * AgentSky can fall back to the app's Browser Use Cloud agent only when retrying
 * is both useful and reasonably safe. Never route media around its policy or
 * repeat a task after the first agent has produced output / performed a tool.
 */
export function shouldFallbackToBrowserUse(error: unknown, context: AgentFallbackContext): boolean {
  if (context.isMedia || context.hasVisibleOutput || context.hasPerformedAction) return false;

  // A missing AgentSky server key is not a permission decision: Browser Use can
  // still answer the same user request through its own configured capacity.
  const message = error instanceof Error ? error.message : String(error || "");
  if (/not_configured|AgentSky is not configured/i.test(message)) return true;

  const status = Number((error as { status?: unknown } | null)?.status);
  if (Number.isFinite(status) && status > 0) {
    return status === 408 || status === 425 || status === 429 || status >= 500;
  }

  if (error instanceof TypeError) return true;
  return /network|fetch|connection|stream|timeout|timed out|unavailable|agent.*failed|session\.error|extended reconnect/i.test(
    message,
  );
}
