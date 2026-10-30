/** Thinking label with the wave-letter animation. Arabic is split by word so letters stay joined. */
export default function LoaderLetters({ text, className = "" }: { text: string; className?: string }) {
  const value = text.trim();
  if (value.length > 48) return <span className={`mtrace-label ${className}`}>{value}</span>;
  const arabic = /[\u0600-\u06FF]/.test(value);
  const parts = arabic ? value.split(/(\s+)/) : Array.from(value);
  let i = 0;
  return (
    <span className={`mtrace-label loader-letters ${className}`} aria-label={value} dir={arabic ? "rtl" : "auto"}>
      {parts.map((p, k) =>
        /^\s+$/.test(p) ? (
          <span key={k}>{"\u00a0"}</span>
        ) : (
          <span key={k} aria-hidden className="loader-letter" style={{ animationDelay: `${(i++ % 10) * 0.1}s` }}>
            {p}
          </span>
        ),
      )}
    </span>
  );
}
