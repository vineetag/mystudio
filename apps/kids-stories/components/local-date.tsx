"use client"

type LocalDateProps = {
  iso: string
  className?: string
  /** Omit year (e.g. recent-activity lists). */
  compact?: boolean
}

/** Formats an ISO timestamp in the visitor's local timezone (client-only). */
export function LocalDate({ iso, className, compact = false }: LocalDateProps) {
  const formatted = new Date(iso).toLocaleDateString(undefined, {
    ...(compact ? {} : { year: "numeric" }),
    month: "short",
    day: "numeric",
  })

  return <span className={className}>{formatted}</span>
}
