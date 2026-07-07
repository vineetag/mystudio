import type { ReactNode } from "react"

export function StatCard({
  label,
  primary,
  secondary,
}: {
  label: string
  primary: ReactNode
  secondary?: ReactNode
}) {
  return (
    <div className="rounded-lg border border-neutral-200 p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums text-neutral-900">{primary}</p>
      {secondary && <p className="mt-1 text-sm tabular-nums">{secondary}</p>}
    </div>
  )
}
