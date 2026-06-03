"use client"

import { cn } from "@studio/ui"
import { THEME_OPTIONS, type ThemeKey } from "../themes"

// The `bg-theme-*` / `text-theme-*` classes are composed dynamically from the
// theme key, so they're kept alive by the safelist in tailwind.config.ts.
export function ThemePicker({
  value,
  onChange,
}: {
  value: ThemeKey
  onChange: (theme: ThemeKey) => void
}) {
  return (
    <div
      role="radiogroup"
      aria-label="Story theme"
      className="grid grid-cols-2 gap-3 sm:grid-cols-4"
    >
      {THEME_OPTIONS.map((t) => {
        const selected = t.key === value
        return (
          <button
            key={t.key}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(t.key)}
            className={cn(
              "flex min-h-[88px] flex-col items-center justify-center gap-1.5 rounded-card p-3 text-sm font-semibold transition",
              `bg-theme-${t.key}-bg text-theme-${t.key}-text`,
              selected
                ? "ring-2 ring-brand-purple ring-offset-2 ring-offset-parchment"
                : "opacity-90 hover:opacity-100",
            )}
          >
            <span className="text-3xl" aria-hidden="true">
              {t.emoji}
            </span>
            {t.label}
          </button>
        )
      })}
    </div>
  )
}
