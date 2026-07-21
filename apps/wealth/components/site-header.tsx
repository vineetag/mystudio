import Link from "next/link"
import { getViewer } from "@/modules/auth"
import { OneFolioLogo } from "@/components/onefolio-logo"

export async function SiteHeader() {
  const viewer = await getViewer()

  return (
    <header className="border-b border-rule">
      {/* Stacked on mobile, one row from sm up. The owner's nav is six items —
          on a 390px screen they cannot share a row with the logo, and forcing
          them to pushed the whole page wider than the viewport. */}
      <div className="mx-auto flex w-full max-w-5xl flex-col items-center gap-1 px-4 py-3 sm:flex-row sm:justify-between sm:gap-4">
        <Link href="/" aria-label="OneFolio home" className="group inline-flex">
          <OneFolioLogo />
        </Link>
        {/* flex-wrap, not overflow scroll: a nav item the owner has to swipe to
            reach is one they won't find. */}
        <nav className="flex flex-wrap items-center justify-center gap-x-3 text-sm sm:gap-x-4">
          <Link href="/" className="flex min-h-12 items-center text-ink/70 hover:text-ink">
            Dashboard
          </Link>
          <Link
            href="/analyzer"
            className="flex min-h-12 items-center text-ink/70 hover:text-ink"
          >
            Charts
          </Link>
          <Link
            href="/analysis"
            className="flex min-h-12 items-center text-ink/70 hover:text-ink"
          >
            Analysis
          </Link>
          {viewer.isOwner ? (
            <>
              <Link
                href="/accounts"
                className="flex min-h-12 items-center text-ink/70 hover:text-ink"
              >
                Accounts
              </Link>
              <Link
                href="/admin"
                className="flex min-h-12 items-center text-ink/70 hover:text-ink"
              >
                Admin
              </Link>
              <Link
                href="/login"
                className="flex min-h-12 items-center text-ink/70 hover:text-ink"
              >
                Session
              </Link>
            </>
          ) : (
            <Link
              href="/login"
              className="flex min-h-12 items-center text-ink/70 hover:text-ink"
            >
              Owner sign-in
            </Link>
          )}
        </nav>
      </div>
    </header>
  )
}
