"use client"

import { useState } from "react"
import { ChevronDown } from "lucide-react"
import { cn } from "@studio/ui"

const OBJECTS = [
  { key: "Firetruck",   emoji: "🚒" },
  { key: "Rocket",      emoji: "🚀" },
  { key: "Dinosaur",    emoji: "🦕" },
  { key: "Robot",       emoji: "🤖" },
  { key: "Dragon",      emoji: "🐉" },
  { key: "Superhero",   emoji: "🦸" },
  { key: "Unicorn",     emoji: "🦄" },
  { key: "Mermaid",     emoji: "🧜" },
  { key: "Fairy",       emoji: "🧚" },
  { key: "Princess",    emoji: "👸" },
  { key: "Puppy",       emoji: "🐶" },
  { key: "Kitten",      emoji: "🐱" },
  { key: "Butterfly",   emoji: "🦋" },
  { key: "Flower",      emoji: "🌸" },
  { key: "Ocean",       emoji: "🌊" },
  { key: "Space",       emoji: "🌌" },
  { key: "Treasure",    emoji: "💎" },
  { key: "Magic Wand",  emoji: "🪄" },
]

const MAX_PICKS = 3

export function FeaturedObjectPicker({
  value,
  onChange,
}: {
  value: string[]
  onChange: (v: string[]) => void
}) {
  const [open, setOpen] = useState(false)

  function toggle(key: string) {
    if (value.includes(key)) {
      onChange(value.filter((k) => k !== key))
    } else if (value.length < MAX_PICKS) {
      onChange([...value, key])
    }
  }

  const selectedObjects = value
    .map((k) => OBJECTS.find((o) => o.key === k))
    .filter(Boolean) as typeof OBJECTS

  const atMax = value.length >= MAX_PICKS

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "flex w-full items-center justify-between gap-2",
          "h-11 rounded-input border px-4 text-base transition-all duration-200",
          "cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand-purple/30",
          open
            ? "border-brand-purple bg-white shadow-[0_0_0_3px_rgba(127,119,221,0.15)]"
            : "border-ink/15 bg-white hover:border-brand-purple/40",
        )}
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <span className="flex items-center gap-1.5 min-w-0">
          {selectedObjects.length > 0 ? (
            <>
              <span className="flex items-center gap-0.5">
                {selectedObjects.map((o) => (
                  <span key={o.key} className="text-xl leading-none" aria-hidden="true">{o.emoji}</span>
                ))}
              </span>
              <span className="font-medium text-ink truncate">
                {selectedObjects.length === 1
                  ? selectedObjects[0].key
                  : `${selectedObjects[0].key} +${selectedObjects.length - 1} more`}
              </span>
            </>
          ) : (
            <span className="text-ink-muted">Choose up to 3 characters or objects</span>
          )}
        </span>
        <span className="flex items-center gap-2 shrink-0">
          {value.length > 0 && (
            <span className={cn(
              "text-[10px] font-bold px-1.5 py-0.5 rounded-full",
              atMax
                ? "bg-brand-purple text-white"
                : "bg-brand-purple/15 text-brand-purple",
            )}>
              {value.length}/{MAX_PICKS}
            </span>
          )}
          <ChevronDown
            className={cn(
              "h-4 w-4 text-ink-muted transition-transform duration-200",
              open && "rotate-180",
            )}
          />
        </span>
      </button>

      <div
        className={cn(
          "overflow-hidden transition-all duration-300 ease-in-out",
          open ? "max-h-[440px] opacity-100 mt-2" : "max-h-0 opacity-0 pointer-events-none",
        )}
      >
        <div className="rounded-card border border-ink/10 bg-white p-3 shadow-[0_4px_16px_rgba(0,0,0,0.08)]">
          {atMax && (
            <p className="mb-2 text-center text-[11px] font-semibold text-brand-purple/70">
              3 selected — tap one to deselect
            </p>
          )}
          <div
            role="listbox"
            aria-label="Character or object"
            aria-multiselectable="true"
            className="grid grid-cols-3 gap-2 sm:gap-2.5"
          >
            {OBJECTS.map((obj) => {
              const sel = value.includes(obj.key)
              const disabled = atMax && !sel
              return (
                <button
                  key={obj.key}
                  type="button"
                  role="option"
                  aria-selected={sel}
                  disabled={disabled}
                  onClick={() => toggle(obj.key)}
                  className={cn(
                    "flex flex-col items-center justify-center gap-1",
                    "rounded-card px-1.5 py-3 sm:py-4 text-center",
                    "border-2 shadow-[2px_3px_0px_rgba(0,0,0,0.08)]",
                    "transition-all duration-200",
                    sel && [
                      "bg-brand-purple border-brand-purple text-white",
                      "scale-105 shadow-[0_0_0_3px_rgba(127,119,221,0.20),2px_3px_0px_rgba(0,0,0,0.08)]",
                    ],
                    !sel && !disabled && [
                      "bg-white border-ink/10 text-ink cursor-pointer",
                      "hover:border-brand-purple/40 hover:-translate-y-0.5",
                      "hover:shadow-[2px_4px_0px_rgba(0,0,0,0.12)]",
                      "active:scale-95 active:shadow-none",
                    ],
                    disabled && "bg-white/50 border-ink/5 text-ink/30 cursor-not-allowed opacity-50",
                  )}
                >
                  <span className="text-2xl sm:text-3xl leading-none" aria-hidden="true">
                    {obj.emoji}
                  </span>
                  <span className="text-[10px] sm:text-xs font-bold leading-tight">
                    {obj.key}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
