"use client"

import { cn } from "@studio/ui"

const RANGES = [
  { label: "2–4",  emoji: "🧸", name: "Little Ones",  value: [2, 4]  as [number, number] },
  { label: "4–6",  emoji: "🎨", name: "Preschool",    value: [4, 6]  as [number, number] },
  { label: "5–8",  emoji: "🚀", name: "Growing Up",   value: [5, 8]  as [number, number] },
  { label: "7–10", emoji: "⭐", name: "Big Kids",     value: [7, 10] as [number, number] },
]

export function AgeSlider({
  value,
  onChange,
}: {
  value: [number, number] | null
  onChange: (v: [number, number] | null) => void
}) {
  function isActive(r: [number, number]) {
    return value !== null && value[0] === r[0] && value[1] === r[1]
  }

  function pick(r: [number, number]) {
    onChange(isActive(r) ? null : r)
  }

  const selected = RANGES.find((r) => isActive(r.value))

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        {RANGES.map((r) => {
          const active = isActive(r.value)
          return (
            <button
              key={r.label}
              type="button"
              onClick={() => pick(r.value)}
              className={cn(
                "flex-1 flex flex-col items-center justify-center gap-0.5",
                "py-2.5 rounded-xl border-2 transition-all duration-200 cursor-pointer select-none",
                "active:scale-95",
                active
                  ? "bg-brand-purple border-brand-purple text-white shadow-[0_4px_12px_rgba(127,119,221,0.40)] scale-[1.03]"
                  : "bg-white border-ink/10 text-ink hover:border-brand-purple/40 hover:bg-brand-purple/5 hover:-translate-y-0.5 hover:shadow-[0_4px_10px_rgba(127,119,221,0.12)]",
              )}
            >
              <span className="text-xl leading-none" aria-hidden="true">{r.emoji}</span>
              <span className="text-xs font-extrabold leading-tight">{r.label}</span>
              <span className={cn(
                "text-[9px] font-semibold leading-tight",
                active ? "text-white/70" : "text-ink-muted",
              )}>
                {r.name}
              </span>
            </button>
          )
        })}
      </div>

      <div className="flex items-center justify-between min-h-[16px]">
        {selected ? (
          <>
            <p className="text-xs font-semibold text-brand-purple animate-in fade-in slide-in-from-left-1 duration-200">
              {selected.emoji} Ages {selected.label} — {selected.name}
            </p>
            <button
              type="button"
              onClick={() => onChange(null)}
              className="text-xs font-medium text-brand-purple/50 hover:text-brand-purple hover:underline cursor-pointer transition-colors duration-150"
            >
              Clear
            </button>
          </>
        ) : (
          <p className="text-xs text-ink-muted">Any age — or tap to choose</p>
        )}
      </div>
    </div>
  )
}
