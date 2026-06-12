"use client"

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
  const atMax = value.length >= MAX_PICKS

  function toggle(key: string) {
    if (value.includes(key)) {
      onChange(value.filter((k) => k !== key))
    } else if (!atMax) {
      onChange([...value, key])
    }
  }

  return (
    <div
      role="listbox"
      aria-multiselectable="true"
      aria-label="Character or object"
      className="flex flex-wrap gap-2"
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
              "inline-flex items-center gap-1.5 rounded-full border-2 px-3 py-1.5",
              "text-sm font-semibold transition-all duration-150",
              sel
                ? "border-brand-purple bg-brand-purple text-white shadow-[0_0_0_3px_rgba(127,119,221,0.20)]"
                : !disabled
                  ? "cursor-pointer border-ink/15 bg-white text-ink hover:border-brand-purple/50 hover:bg-brand-purple/5 active:scale-95"
                  : "cursor-not-allowed border-ink/5 bg-white/50 text-ink/30 opacity-40",
            )}
          >
            <span aria-hidden="true" className="text-base leading-none">{obj.emoji}</span>
            {obj.key}
          </button>
        )
      })}
      {atMax && (
        <p className="w-full text-[11px] font-semibold text-brand-purple/70 mt-0.5">
          3 selected — tap one to deselect
        </p>
      )}
    </div>
  )
}
