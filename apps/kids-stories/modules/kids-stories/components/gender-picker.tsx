"use client"

import { cn } from "@studio/ui"

const OPTIONS = [
  { value: "boy",  emoji: "👦", label: "Boy" },
  { value: "girl", emoji: "👧", label: "Girl" },
] as const

type Gender = "boy" | "girl" | ""

export function GenderPicker({
  value,
  onChange,
}: {
  value: Gender
  onChange: (v: Gender) => void
}) {
  function toggle(v: "boy" | "girl") {
    onChange(value === v ? "" : v)
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-3">
        {OPTIONS.map((opt) => {
          const selected = value === opt.value
          return (
            <button
              key={opt.value}
              type="button"
              aria-pressed={selected}
              onClick={() => toggle(opt.value)}
              className={cn(
                "flex flex-1 items-center justify-center gap-2",
                "rounded-pill px-4 py-3",
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
              <span className="text-2xl leading-none" aria-hidden="true">
                {opt.emoji}
              </span>
              <span className="text-sm font-bold">{opt.label}</span>
            </button>
          )
        })}
      </div>
      <p className="text-xs text-ink-muted">
        {value
          ? `${value === "boy" ? "Boy" : "Girl"} selected — tap again to clear`
          : "Selecting a gender helps the story use the right pronouns and make your child feel like the star!"}
      </p>
    </div>
  )
}
