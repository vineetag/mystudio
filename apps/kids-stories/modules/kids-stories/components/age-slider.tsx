"use client"

import { cn } from "@studio/ui"

const RANGES: { label: string; sublabel: string; value: [number, number] }[] = [
  { label: "2–4",  sublabel: "YEARS", value: [2, 4]  },
  { label: "4–6",  sublabel: "YEARS", value: [4, 6]  },
  { label: "5–8",  sublabel: "YEARS", value: [5, 8]  },
  { label: "7–10", sublabel: "YEARS", value: [7, 10] },
]

const YEARS = [2, 3, 4, 5, 6, 7, 8, 9, 10]

export function AgeSlider({
  value,
  onChange,
}: {
  value: [number, number] | null
  onChange: (v: [number, number] | null) => void
}) {
  function isRangeActive(r: [number, number]) {
    return value !== null && value[0] === r[0] && value[1] === r[1]
  }

  function isYearActive(y: number) {
    return value !== null && value[0] === y && value[1] === y
  }

  function pickRange(r: [number, number]) {
    onChange(isRangeActive(r) ? null : r)
  }

  function pickYear(y: number) {
    onChange(isYearActive(y) ? null : [y, y])
  }

  const hasValue = value !== null
  const displayLabel = hasValue
    ? value[0] === value[1]
      ? `Age ${value[0]}`
      : `Ages ${value[0]}–${value[1]}`
    : null

  return (
    <div className="rounded-2xl bg-gradient-to-br from-violet-50 via-purple-50 to-fuchsia-50 border border-brand-purple/10 p-4 space-y-4">
      {/* Range pills */}
      <div className="space-y-2">
        <p className="text-[10px] font-bold uppercase tracking-widest text-brand-purple/50">
          Age range
        </p>
        <div className="grid grid-cols-4 gap-2">
          {RANGES.map((r) => {
            const active = isRangeActive(r.value)
            return (
              <button
                key={r.label}
                type="button"
                onClick={() => pickRange(r.value)}
                className={cn(
                  "flex flex-col items-center justify-center gap-0.5 py-3 rounded-xl",
                  "transition-all duration-200 cursor-pointer select-none",
                  active
                    ? "bg-brand-purple text-white shadow-[0_4px_14px_rgba(127,119,221,0.45)] scale-105"
                    : "bg-white/70 text-brand-purple/70 hover:bg-white hover:text-brand-purple hover:shadow-md active:scale-95",
                )}
              >
                <span className="text-sm font-extrabold leading-none tracking-tight">
                  {r.label}
                </span>
                <span className={cn(
                  "text-[8px] font-bold uppercase tracking-wider mt-0.5",
                  active ? "text-white/70" : "text-brand-purple/40",
                )}>
                  {r.sublabel}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Individual year circles */}
      <div className="space-y-2">
        <p className="text-[10px] font-bold uppercase tracking-widest text-brand-purple/50">
          Exact age
        </p>
        <div className="grid grid-cols-5 gap-2 sm:gap-2.5">
          {YEARS.map((y) => {
            const active = isYearActive(y)
            return (
              <button
                key={y}
                type="button"
                onClick={() => pickYear(y)}
                className={cn(
                  "flex flex-col items-center justify-center gap-0.5",
                  "aspect-square rounded-full",
                  "transition-all duration-200 cursor-pointer select-none",
                  active
                    ? "bg-brand-purple text-white shadow-[0_4px_14px_rgba(127,119,221,0.45)] scale-110"
                    : "bg-white/70 text-brand-purple/70 hover:bg-white hover:text-brand-purple hover:shadow-md active:scale-95",
                )}
              >
                <span className="text-base font-extrabold leading-none">{y}</span>
                <span className={cn(
                  "text-[7px] font-bold uppercase tracking-wider",
                  active ? "text-white/70" : "text-brand-purple/40",
                )}>
                  YRS
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Selected label + clear */}
      <div className="flex items-center justify-between min-h-[20px]">
        {displayLabel ? (
          <>
            <p className="text-xs font-semibold text-brand-purple">{displayLabel} selected</p>
            <button
              type="button"
              onClick={() => onChange(null)}
              className="text-xs font-medium text-brand-purple/60 hover:text-brand-purple hover:underline cursor-pointer"
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
