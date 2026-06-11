"use client"

export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => setTimeout(() => window.print(), 500)}
      className="inline-flex h-11 items-center justify-center rounded-pill border border-ink/15 px-6 text-base font-semibold text-ink hover:bg-white transition-all duration-150 cursor-pointer print:hidden"
    >
      Print story
    </button>
  )
}
