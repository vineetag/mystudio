/**
 * OneFolio "ledger-rule" mark: a ring ("O", many accounts → one) resting on the
 * signature double accountant rule. Uses currentColor so callers set the tone
 * (moss in the header). Pair with the Newsreader wordmark for the full lockup.
 */
export function OneFolioMark({
  size = 28,
  className,
}: {
  size?: number
  className?: string
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      {/* The "O" — a single clean ring for legibility down to favicon sizes. */}
      <circle cx="16" cy="12.5" r="8.25" stroke="currentColor" strokeWidth="3" />
      {/* The double rule — a ledger sum drawn under the mark. */}
      <line x1="4" y1="26" x2="28" y2="26" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <line x1="4" y1="29.5" x2="28" y2="29.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

/** Full lockup: mark + Newsreader wordmark, as used in the site header. */
export function OneFolioLogo({ className }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className ?? ""}`}>
      <OneFolioMark size={28} className="text-moss" />
      <span className="flex flex-col leading-none">
        <span className="font-display text-xl font-semibold tracking-tight text-ink">
          OneFolio
        </span>
        <span
          className="ledger-sum -mt-0.5 w-full opacity-70 transition-opacity group-hover:opacity-100"
          aria-hidden
        />
      </span>
    </span>
  )
}
