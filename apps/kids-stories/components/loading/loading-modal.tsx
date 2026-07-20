"use client"

import { useEffect, useRef } from "react"
import LoadingScreen from "@/components/loading/LoadingScreens"

/**
 * Modal shown while a story is generating.
 *
 * Deliberately non-dismissable — there is no close button and Escape does
 * nothing, because generation is already in flight and cancelling it is not
 * supported. It is hand-rolled rather than built on Radix Dialog: the content
 * is purely decorative, so there is nothing to focus-trap, and this avoids
 * pulling in a dialog dependency the app does not otherwise use.
 */
export function LoadingModal() {
  const dialogRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Lock background scroll so the dimmed page behind cannot be moved.
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"

    // Move focus into the dialog so screen readers announce it and keyboard
    // focus is not left on the now-hidden submit button.
    dialogRef.current?.focus()

    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [])

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-label="Creating your story"
      tabIndex={-1}
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-ink/60 px-4 py-10 outline-none backdrop-blur-sm"
    >
      <div className="w-full max-w-xl overflow-hidden rounded-card shadow-[0_12px_40px_rgba(0,0,0,0.25)]">
        <LoadingScreen />
      </div>
    </div>
  )
}
