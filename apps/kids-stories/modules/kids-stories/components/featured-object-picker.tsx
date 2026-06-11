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

export function FeaturedObjectPicker({
  value,
  onChange,
}: {
  value: string
  onChange: (v: string) => void
}) {
  function toggle(key: string) {
    onChange(value === key ? "" : key)
  }

  return (
    <div className="grid grid-cols-3 gap-2 sm:gap-2.5">
      {OBJECTS.map((obj) => {
        const selected = value === obj.key
        return (
          <button
            key={obj.key}
            type="button"
            aria-pressed={selected}
            onClick={() => toggle(obj.key)}
            className={cn(
              "flex flex-col items-center justify-center gap-1",
              "rounded-card px-1.5 py-3 sm:py-4 text-center",
              "border-2 shadow-[2px_3px_0px_rgba(0,0,0,0.08)]",
              "transition-all duration-200",
              selected
                ? [
                    "bg-brand-purple border-brand-purple text-white",
                    "scale-105 shadow-[0_0_0_3px_rgba(127,119,221,0.20),2px_3px_0px_rgba(0,0,0,0.08)]",
                  ]
                : [
                    "bg-white border-ink/10 text-ink cursor-pointer",
                    "hover:border-brand-purple/40 hover:-translate-y-0.5",
                    "hover:shadow-[2px_4px_0px_rgba(0,0,0,0.12)]",
                    "active:scale-95 active:shadow-none",
                  ],
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
  )
}
