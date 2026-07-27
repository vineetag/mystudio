import type { ReactNode } from "react"

/**
 * Shared stat-tile primitives so every tab's widget row reads as one system.
 * Markup matches the original Overview change cards exactly.
 */
export function StatGrid({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{children}</div>
}

export function StatCard({
  label,
  value,
  valueClassName = "text-ink",
  sub,
  subClassName = "text-ink/60",
}: {
  label: string
  value: ReactNode
  valueClassName?: string
  sub?: ReactNode
  subClassName?: string
}) {
  return (
    <div className="rounded-lg border border-rule bg-white/70 px-4 py-3">
      <p className="text-xs font-medium uppercase tracking-wide text-ink/50">{label}</p>
      <p
        className={`mt-1 inline-flex items-center gap-1 font-medium tabular-nums ${valueClassName}`}
      >
        {value}
      </p>
      {sub !== undefined && (
        <p className={`text-sm tabular-nums ${subClassName}`}>{sub}</p>
      )}
    </div>
  )
}
