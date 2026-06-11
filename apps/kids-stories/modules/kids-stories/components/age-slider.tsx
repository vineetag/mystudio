"use client"

import * as Slider from "@radix-ui/react-slider"
import { cn } from "@studio/ui"

const AGE_MIN = 2
const AGE_MAX = 10
const AGE_SCALE = Array.from({ length: AGE_MAX - AGE_MIN + 1 }, (_, i) => i + AGE_MIN)

export function AgeSlider({
  value,
  onChange,
}: {
  value: [number, number] | null
  onChange: (v: [number, number] | null) => void
}) {
  const isSet = value !== null
  const [lo, hi] = value ?? [4, 7]

  return (
    <div className="space-y-3">
      <div className="flex h-10 items-center justify-between">
        {isSet ? (
          <span className="text-lg font-bold text-ink">
            Ages {lo} – {hi}
          </span>
        ) : (
          <span className="text-sm text-ink-muted">Drag to set age range</span>
        )}
        {isSet && (
          <button
            type="button"
            onClick={() => onChange(null)}
            className="text-xs font-medium text-brand-purple hover:underline cursor-pointer"
          >
            Clear
          </button>
        )}
      </div>

      <Slider.Root
        min={AGE_MIN}
        max={AGE_MAX}
        step={1}
        minStepsBetweenThumbs={2}
        value={[lo, hi]}
        onValueChange={(vals) => onChange([vals[0], vals[1]] as [number, number])}
        className="relative flex w-full touch-none select-none items-center py-1"
      >
        <Slider.Track className="relative h-2 w-full grow overflow-hidden rounded-full bg-ink/10">
          <Slider.Range className="absolute h-full bg-brand-purple" />
        </Slider.Track>
        <Slider.Thumb
          aria-label="Minimum age"
          className={cn(
            "block h-5 w-5 rounded-full border-2 border-white bg-brand-purple",
            "shadow-[0_1px_4px_rgba(127,119,221,0.5)]",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-purple/40",
            "transition-transform duration-100 active:scale-110 cursor-grab active:cursor-grabbing",
          )}
        />
        <Slider.Thumb
          aria-label="Maximum age"
          className={cn(
            "block h-5 w-5 rounded-full border-2 border-white bg-brand-purple",
            "shadow-[0_1px_4px_rgba(127,119,221,0.5)]",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-purple/40",
            "transition-transform duration-100 active:scale-110 cursor-grab active:cursor-grabbing",
          )}
        />
      </Slider.Root>

      <div className="flex justify-between px-0.5">
        {AGE_SCALE.map((age) => (
          <span
            key={age}
            className={cn(
              "text-[10px] font-medium transition-colors duration-150",
              isSet && age >= lo && age <= hi ? "text-brand-purple" : "text-ink-muted/50",
            )}
          >
            {age}
          </span>
        ))}
      </div>

      <p className="text-xs text-ink-muted">
        {isSet
          ? `Ages ${lo}–${hi} selected — drag handles to adjust`
          : "Any age — or drag to choose a range"}
      </p>
    </div>
  )
}
