/**
 * @doc One shared "answer in the user's language" directive for every model
 * prompt. Without it the fast model keeps replying in English to Arabic
 * requests, because the task text it receives is mostly machine-written.
 */
import { getUserLang } from "@/lib/authI18n";

const ARABIC = /[\u0600-\u06FF]/;

/** Language the answer must be written in: what the user typed wins, then the UI language. */
export function targetLanguageFor(sample?: string | null): "ar-eg" | "en" {
  if (sample && ARABIC.test(sample)) return "ar-eg";
  if (sample && sample.trim() && !ARABIC.test(sample)) {
    // Latin request: still respect an Arabic UI only when the text has no words.
    if (/[A-Za-z]{3}/.test(sample)) return "en";
  }
  try {
    return getUserLang() === "ar-eg" ? "ar-eg" : "en";
  } catch {
    return "en";
  }
}

/** Prompt line to append to any model call whose output the user reads. */
export function languageDirective(sample?: string | null): string {
  return targetLanguageFor(sample) === "ar-eg"
    ? "IMPORTANT: Write the whole answer in Egyptian colloquial Arabic (عامية مصرية). Translate every result, heading and bullet — do not leave English sentences or English fragments anywhere, except product names, URLs and code."
    : "IMPORTANT: Write the whole answer in English. Do not mix in other languages, except product names, URLs and code.";
}
