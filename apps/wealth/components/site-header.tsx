import Link from "next/link"
import { getViewer } from "@/modules/auth"
import { OneFolioLogo } from "@/components/onefolio-logo"

export async function SiteHeader() {
  const viewer = await getViewer()

  return (
    <header className="border-b border-rule">
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-3">
        <Link href="/" aria-label="OneFolio home" className="group inline-flex">
          <OneFolioLogo />
        </Link>
        <nav className="flex items-center gap-4 text-sm">
          <Link href="/" className="flex min-h-12 items-center text-ink/70 hover:text-ink">
            Dashboard
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
