"use client"

import { useState } from "react"
import { Check } from "lucide-react"
import { cn } from "@studio/ui"
import { THEME_OPTIONS, type ThemeKey } from "../themes"

export function ThemePicker({
  value,
  onChange,
}: {
  value: ThemeKey[]
  onChange: (themes: ThemeKey[]) => void
}) {
  // Track which key was just selected to trigger pop animation once.
  const [justSelected, setJustSelected] = useState<ThemeKey | null>(null)

  function toggle(key: ThemeKey) {
    if (value.includes(key)) {
      onChange(value.filter((k) => k !== key))
      setJustSelected(null)
    } else if (value.length < 2) {
      onChange([...value, key])
      setJustSelected(key)
      // Clear after animation completes so re-selecting replays it.
      setTimeout(() => setJustSelected(null), 300)
    }
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2 sm:gap-2.5">
        {THEME_OPTIONS.map((t) => {
          const selected = value.includes(t.key)
          const maxed = !selected && value.length >= 2
          const popping = justSelected === t.key

          return (
            <button
              key={t.key}
              type="button"
              aria-pressed={selected}
              disabled={maxed}
              onClick={() => toggle(t.key)}
              className={cn(
                // Base layout
                "relative flex flex-col items-center justify-center gap-1.5",
                "rounded-card px-1.5 py-3 sm:py-4 text-center",
                // Depth + border
                "border-2 shadow-[2px_3px_0px_rgba(0,0,0,0.08)]",
                // Transition (only when not popping — pop animation owns transform)
                !popping && "transition-all duration-200",
                // Theme colors
                `bg-theme-${t.key}-bg text-theme-${t.key}-text`,
                // Selected state
                selected
                  ? [
                      "border-brand-purple",
                      "shadow-[0_0_0_3px_rgba(127,119,221,0.20),2px_3px_0px_rgba(0,0,0,0.08)]",
                      popping ? "animate-card-pop" : "scale-105",
                    ]
                  : `border-theme-${t.key}-text/20`,
                // Hover / active (unselected, enabled)
                !selected && !maxed && [
                  "cursor-pointer",
                  "hover:border-brand-purple/40 hover:-translate-y-0.5",
                  "hover:shadow-[2px_4px_0px_rgba(0,0,0,0.12)]",
                  "active:scale-95 active:shadow-none",
                ],
                // Disabled (maxed)
                maxed && "cursor-not-allowed opacity-30",
              )}
            >
              {selected && (
                <span
                  className="absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-brand-purple text-white"
                  aria-hidden="true"
                >
                  <Check className="h-3 w-3" strokeWidth={3} />
                </span>
              )}
              <span className="text-2xl sm:text-3xl leading-none" aria-hidden="true">
                {t.emoji}
              </span>
              <span className="text-[10px] sm:text-xs font-bold leading-tight">
                {t.label}
              </span>
            </button>
          )
        })}
      </div>

      {value.length > 0 && (
        <p className="text-xs text-ink-muted transition-all duration-200 animate-in fade-in slide-in-from-bottom-1">
          {value.length === 1 && "Great pick! You can mix in one more 🎨"}
          {value.length === 2 && "Perfect mix — ready to create! 🚀"}
        </p>
      )}
    </div>
  )
}
