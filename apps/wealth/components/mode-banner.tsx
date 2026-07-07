import Link from "next/link"
import { getViewer } from "@/modules/auth"

/**
 * Persistent mode indicator: DEMO for anonymous/non-owner viewers, LIVE for
 * the owner. The two must be impossible to confuse — different colors,
 * different copy, always visible. Full visual treatment lands in M5.
 */
export async function ModeBanner() {
  const viewer = await getViewer()

  if (viewer.mode === "demo") {
    return (
      <div className="sticky top-0 z-50 bg-amber-400 px-4 py-2 text-center text-sm font-semibold text-amber-950">
        DEMO — sample portfolio, nothing here is real.{" "}
        <Link href="/login" className="underline">
          Owner sign-in
        </Link>
      </div>
    )
  }

  return (
    <div className="sticky top-0 z-50 flex items-center justify-center gap-2 bg-neutral-900 px-4 py-2 text-center text-sm font-semibold text-white">
      <span className="h-2 w-2 rounded-full bg-emerald-400" aria-hidden />
      LIVE — real portfolio · {viewer.user?.email}
    </div>
  )
}
