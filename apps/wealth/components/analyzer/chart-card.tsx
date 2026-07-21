// Shared frame for every analyzer chart: title, one-line explanation of what
// the numbers mean, the chart itself, and a footnote listing anything the chart
// could not include (unpriced symbols, missing yield data). The footnote is the
// house rule made visible — excluded data is stated, never silently dropped.

import type { ReactNode } from "react"

export function ChartCard({
  title,
  subtitle,
  footnote,
  children,
}: {
  title: string
  subtitle: string
  footnote?: ReactNode
  children: ReactNode
}) {
  return (
    <section className="flex flex-col gap-4 rounded-lg border border-rule bg-white p-4 sm:p-5">
      <header className="flex flex-col gap-1">
        <h2 className="text-base font-semibold text-ink">{title}</h2>
        <p className="text-sm text-ink/60">{subtitle}</p>
      </header>
      {children}
      {footnote && <p className="text-xs text-ink/50">{footnote}</p>}
    </section>
  )
}

/** Shown in place of a chart when there is nothing to plot. Never a blank box. */
export function ChartEmpty({ message }: { message: string }) {
  return (
    <div className="flex min-h-40 items-center justify-center rounded-md border border-dashed border-rule px-4 py-8 text-center text-sm text-ink/50">
      {message}
    </div>
  )
}

/** Comma-joined symbol list for a footnote, truncated past `max`. */
export function symbolList(symbols: string[], max = 8): string {
  if (symbols.length <= max) return symbols.join(", ")
  return `${symbols.slice(0, max).join(", ")} +${symbols.length - max} more`
}
