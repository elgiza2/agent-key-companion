type TurnMessage = { role: string; content: unknown };

const GREETING =
  /^(?:hi|hey|hello|yo|sup|thanks|thank you|ok|okay|good (?:morning|evening|night)|اهلا|أهلا|هاي|مرحبا|السلام عليكم|صباح الخير|مساء الخير|شكرا|شكرًا|تمام|ازيك|إزيك|كيف الحال|عامل ايه)[\s!.،؟?]*$/iu;
const NUMBER = "[0-9٠-٩]+(?:[.,٫][0-9٠-٩]+)?";
const SIMPLE_ARITHMETIC = new RegExp(
  `^(?:(?:what\\s+is|calculate)\\s+|(?:كم(?:\\s+يساوي)?|ما\\s+ناتج)\\s*)?${NUMBER}\\s*[+\\-−*×÷/]\\s*${NUMBER}(?:\\s*[?؟.!،])?(?:\\s*(?:أجب|اكتب|answer|reply)[^\\n]{0,28})?$`,
  "iu",
);

/** High-confidence, short turns that need neither reasoning nor external tools. */
export function isTrivialTurn(messages: TurnMessage[]): boolean {
  const last = messages[messages.length - 1];
  if (!last || last.role !== "user" || typeof last.content !== "string") return false;
  const text = last.content.trim();
  if (!text || text.length > 80 || /\n/.test(text)) return false;
  return GREETING.test(text) || SIMPLE_ARITHMETIC.test(text);
}

/**
 * Bypass the server's broad intent preflight only for a first-turn greeting or
 * arithmetic question. Never force a follow-up turn with conversation context.
 */
export function shouldForceFastTurn(messages: TurnMessage[]): boolean {
  return messages.length === 1 && isTrivialTurn(messages);
}
