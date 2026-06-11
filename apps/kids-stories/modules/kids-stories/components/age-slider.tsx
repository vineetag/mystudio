"use client"

import { cn } from "@studio/ui"

const STEPS = [
  { value: "Baby",    emoji: "👶" },
  { value: "Toddler", emoji: "🧸" },
  { value: "2",       emoji: "🐣" },
  { value: "3",       emoji: "🌱" },
  { value: "4",       emoji: "🌟" },
  { value: "5",       emoji: "🎒" },
  { value: "6",       emoji: "📚" },
  { value: "7",       emoji: "🌈" },
  { value: "8",       emoji: "🚀" },
  { value: "9",       emoji: "🔭" },
  { value: "10+",     emoji: "⭐" },
]

const MAX_IDX = STEPS.length - 1

function stepLabel(s: (typeof STEPS)[number]) {
  return s.value === "Baby" || s.value === "Toddler" ? s.value : `Age ${s.value}`
}

export function AgeSlider({
  value,
  onChange,
}: {
  value: string
  onChange: (v: string) => void
}) {
  const foundIdx = value ? STEPS.findIndex((s) => s.value === value) : -1
  const isSet = foundIdx >= 0
  // When unset, park the thumb mid-range so the first drag goes somewhere sensible.
  const displayIdx = isSet ? foundIdx : 5
  const pct = (displayIdx / MAX_IDX) * 100
  const step = STEPS[displayIdx]

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    onChange(STEPS[Number(e.target.value)].value)
  }

  return (
    <div className="space-y-3">
      <div className="flex h-14 items-center justify-center gap-2">
        {isSet ? (
          <>
            <span className="text-4xl leading-none" aria-hidden="true">
              {step.emoji}
            </span>
            <span className="text-xl font-bold text-ink">{stepLabel(step)}</span>
          </>
        ) : (
          <span className="text-sm text-ink-muted">Drag to set age</span>
        )}
      </div>

      <input
        type="range"
        min={0}
        max={MAX_IDX}
        step={1}
        value={displayIdx}
        onChange={handleChange}
        className={cn(
          "w-full h-2 rounded-full cursor-pointer appearance-none",
          // Webkit thumb
          "[&::-webkit-slider-thumb]:appearance-none",
          "[&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:-mt-1.5",
          "[&::-webkit-slider-thumb]:rounded-full",
          "[&::-webkit-slider-thumb]:bg-brand-purple",
          "[&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white",
          "[&::-webkit-slider-thumb]:shadow-[0_1px_4px_rgba(127,119,221,0.5)]",
          "[&::-webkit-slider-thumb]:transition-transform [&::-webkit-slider-thumb]:duration-100",
          "[&::-webkit-slider-thumb:active]:scale-110",
          // Webkit track
          "[&::-webkit-slider-runnable-track]:rounded-full [&::-webkit-slider-runnable-track]:h-2",
          // Moz thumb
          "[&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:h-5",
          "[&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-white",
          "[&::-moz-range-thumb]:bg-brand-purple",
        )}
        style={{
          background: `linear-gradient(to right, #7F77DD ${pct}%, rgba(44,44,42,0.1) ${pct}%)`,
        }}
        aria-label="Age"
        aria-valuetext={isSet ? stepLabel(step) : "not set"}
      />

      <div className="flex items-center justify-between">
        <p className="text-xs text-ink-muted">
          {isSet
            ? `${stepLabel(step)} selected — drag to change`
            : "Any age — or drag to choose"}
        </p>
        {isSet && (
          <button
            type="button"
            onClick={() => onChange("")}
            className="text-xs font-medium text-brand-purple hover:underline"
          >
            Clear
          </button>
        )}
      </div>
    </div>
  )
}
