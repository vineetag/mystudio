"use client"

import { cn } from "@studio/ui"

type StoryLength = "short" | "medium" | "long"

const OPTIONS = [
  { value: "short",  emoji: "📖", label: "Quick",     badge: "~2 min" },
  { value: "medium", emoji: "🌙", label: "Bedtime",   badge: "~5 min" },
  { value: "long",   emoji: "📚", label: "Adventure", badge: "~8 min" },
] as const

export function StoryLengthPicker({
  value,
  onChange,
}: {
  value: StoryLength
  onChange: (v: StoryLength) => void
}) {
  return (
    <div className="grid grid-cols-3 gap-2 sm:gap-2.5">
      {OPTIONS.map((opt) => {
        const selected = value === opt.value
        return (
          <button
            key={opt.value}
            type="button"
            aria-pressed={selected}
            onClick={() => onChange(opt.value)}
            className={cn(
              "flex flex-col items-center justify-center gap-1",
              "rounded-card px-2 py-3 sm:py-4",
              "border-2 transition-all duration-200 cursor-pointer",
              "shadow-[2px_3px_0px_rgba(0,0,0,0.08)]",
              selected
                ? [
                    "bg-brand-purple border-brand-purple text-white",
                    "scale-105 shadow-[0_0_0_3px_rgba(127,119,221,0.20),2px_3px_0px_rgba(0,0,0,0.06)]",
                  ]
                : [
                    "bg-white border-ink/10 text-ink",
                    "hover:border-brand-purple/40 hover:-translate-y-0.5",
                    "hover:shadow-[2px_4px_0px_rgba(0,0,0,0.1)]",
                    "active:scale-95 active:shadow-none",
                  ],
            )}
          >
            <span className="text-2xl sm:text-3xl leading-none" aria-hidden="true">
              {opt.emoji}
            </span>
            <span className="text-sm font-bold leading-none">{opt.label}</span>
            <span
              className={cn(
                "text-[10px] sm:text-xs leading-tight",
                selected ? "text-white/80" : "text-ink-muted",
              )}
            >
              {opt.badge}
            </span>
          </button>
        )
      })}
    </div>
  )
}
