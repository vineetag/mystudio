"use client"

import { cn } from "@studio/ui"

const RANGES = [
  { label: "2–4",  years: "YEARS", emoji: "🧸", name: "Little Ones",  value: [2, 4]  as [number, number] },
  { label: "4–6",  years: "YEARS", emoji: "🎨", name: "Preschool",    value: [4, 6]  as [number, number] },
  { label: "5–8",  years: "YEARS", emoji: "🚀", name: "Growing Up",   value: [5, 8]  as [number, number] },
  { label: "7–10", years: "YEARS", emoji: "⭐", name: "Big Kids",     value: [7, 10] as [number, number] },
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
    <div className="rounded-xl bg-gradient-to-br from-violet-50 via-purple-50 to-fuchsia-50 border border-brand-purple/10 p-3 space-y-3">
      <div className="grid grid-cols-2 gap-2">
        {RANGES.map((r) => {
          const active = isActive(r.value)
          return (
            <button
              key={r.label}
              type="button"
              onClick={() => pick(r.value)}
              className={cn(
                "group relative flex flex-col items-center justify-center gap-1 py-3 px-2 rounded-xl",
                "transition-all duration-200 cursor-pointer select-none",
                "active:scale-95",
                active
                  ? "bg-brand-purple text-white shadow-[0_4px_14px_rgba(127,119,221,0.45)] scale-[1.03] ring-2 ring-brand-purple/30 ring-offset-1 ring-offset-transparent"
                  : "bg-white/80 text-brand-purple hover:bg-white hover:-translate-y-0.5 hover:shadow-[0_4px_12px_rgba(127,119,221,0.18)]",
              )}
            >
              {active && (
                <span className="absolute top-1.5 right-1.5 text-[9px] font-bold text-white/80">✓</span>
              )}
              <span
                className={cn(
                  "text-2xl leading-none transition-transform duration-200",
                  "group-hover:scale-110 group-hover:-rotate-6",
                  active && "scale-105",
                )}
                aria-hidden="true"
              >
                {r.emoji}
              </span>
              <span className="text-base font-extrabold leading-none tracking-tight">
                {r.label}
              </span>
              <span className={cn(
                "text-[8px] font-bold uppercase tracking-widest",
                active ? "text-white/60" : "text-brand-purple/40",
              )}>
                {r.years}
              </span>
              <span className={cn(
                "text-[10px] font-semibold leading-tight",
                active ? "text-white/90" : "text-brand-purple/70",
              )}>
                {r.name}
              </span>
            </button>
          )
        })}
      </div>

      <div className="flex items-center justify-between min-h-[18px]">
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
          <p className="text-xs text-brand-purple/40">Any age — or tap to choose</p>
        )}
      </div>
    </div>
  )
}
