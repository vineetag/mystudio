"use client"

import { useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import LoadingScreen from "@/components/loading/LoadingScreens"

/**
 * Modal shown while a story is generating.
 *
 * Deliberately non-dismissable — there is no close button and Escape does
 * nothing, because generation is already in flight and cancelling it is not
 * supported. It is hand-rolled rather than built on Radix Dialog: the content
 * is purely decorative, so there is nothing to focus-trap, and this avoids
 * pulling in a dialog dependency the app does not otherwise use.
 *
 * Rendered in a portal on document.body so it escapes the page's stacking
 * context — otherwise the sticky navbar (z-40) can paint over its top edge.
 */
export function LoadingModal() {
  const dialogRef = useRef<HTMLDivElement>(null)
  const [mounted, setMounted] = useState(false)

  // Portals need a DOM node, which does not exist during SSR.
  useEffect(() => setMounted(true), [])

  useEffect(() => {
    // Lock background scroll so the dimmed page behind cannot be moved.
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"

    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [])

  useEffect(() => {
    // Move focus into the dialog so screen readers announce it and keyboard
    // focus is not left on the now-inert submit button. Runs after the portal
    // mounts, since the ref is null on the first render.
    if (mounted) dialogRef.current?.focus()
  }, [mounted])

  if (!mounted) return null

  return createPortal(
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-label="Creating your story"
      tabIndex={-1}
      // `items-center` would clip the top of the card once it is taller than
      // the viewport — the overflow above the centre line is unreachable by
      // scrolling. `m-auto` on the child centres it while keeping it scrollable.
      className="fixed inset-0 z-[60] flex justify-center overflow-y-auto overscroll-contain bg-ink/60 p-4 outline-none backdrop-blur-sm"
    >
      <div className="m-auto w-full max-w-xl overflow-hidden rounded-card shadow-[0_12px_40px_rgba(0,0,0,0.25)]">
        <LoadingScreen />
      </div>
    </div>,
    document.body
  )
}
