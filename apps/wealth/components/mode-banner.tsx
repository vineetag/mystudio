import Link from "next/link"
import { getViewer } from "@/modules/auth"

/**
 * Persistent mode indicator — the two states must be impossible to confuse:
 * DEMO is a striped amber caution band; LIVE is a solid ink band with a
 * breathing emerald dot. Different color, texture, and copy.
 */
export async function ModeBanner() {
  const viewer = await getViewer()

  if (viewer.mode === "demo") {
    return (
      <div className="demo-stripes sticky top-0 z-50 px-4 py-2 text-center text-sm font-semibold text-amber-950">
        <span className="rounded-sm bg-amber-950 px-1.5 py-0.5 text-xs font-bold tracking-widest text-amber-300">
          DEMO
        </span>{" "}
        Sample portfolio — nothing here is real.{" "}
        <Link href="/login" className="underline underline-offset-2 hover:no-underline">
          Owner sign-in
        </Link>
      </div>
    )
  }

  return (
    <div className="sticky top-0 z-50 flex items-center justify-center gap-2.5 bg-ink px-4 py-2 text-center text-sm font-semibold text-paper">
      <span className="relative flex h-2.5 w-2.5" aria-hidden>
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60 motion-reduce:hidden" />
        <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400" />
      </span>
      <span className="text-xs font-bold tracking-widest text-emerald-300">LIVE</span>
      Real portfolio · {viewer.user?.email}
    </div>
  )
}
