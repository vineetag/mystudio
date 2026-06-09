"use client"

import { cn } from "@studio/ui"
import { THEME_CATEGORIES, type ThemeKey } from "../themes"

export function ThemePicker({
  value,
  onChange,
}: {
  value: ThemeKey[]
  onChange: (themes: ThemeKey[]) => void
}) {
  function toggle(key: ThemeKey) {
    if (value.includes(key)) {
      onChange(value.filter((k) => k !== key))
    } else if (value.length < 2) {
      onChange([...value, key])
    }
  }

  return (
    <div className="space-y-4">
      {THEME_CATEGORIES.map((category) => (
        <div key={category.label}>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-ink-muted">
            {category.label}
          </p>
          <div className="flex flex-wrap gap-2">
            {category.themes.map((t) => {
              const selected = value.includes(t.key)
              const maxed = !selected && value.length >= 2
              return (
                <button
                  key={t.key}
                  type="button"
                  aria-pressed={selected}
                  disabled={maxed}
                  onClick={() => toggle(t.key)}
                  className={cn(
                    "flex items-center gap-1.5 rounded-pill px-3 py-2 text-sm font-semibold transition",
                    `bg-theme-${t.key}-bg text-theme-${t.key}-text`,
                    selected && "ring-2 ring-brand-purple ring-offset-2 ring-offset-parchment",
                    maxed && "cursor-not-allowed opacity-40",
                    !selected && !maxed && "hover:ring-1 hover:ring-brand-purple/50",
                  )}
                >
                  <span aria-hidden="true">{t.emoji}</span>
                  {t.label}
                </button>
              )
            })}
          </div>
        </div>
      ))}
      <p className="text-xs text-ink-muted">
        {value.length === 0 && "Select up to 2 themes"}
        {value.length === 1 && "1 theme selected — you can add one more"}
        {value.length === 2 && "2 themes selected (max)"}
      </p>
    </div>
  )
}
