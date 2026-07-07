import Link from "next/link"
import { getViewer } from "@/modules/auth"

export async function SiteHeader() {
  const viewer = await getViewer()

  return (
    <header className="border-b border-rule">
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-3">
        <Link href="/" className="group inline-flex flex-col">
          <span className="font-display text-xl font-semibold tracking-tight text-ink">
            OneFolio
          </span>
          <span className="ledger-sum -mt-0.5 w-full opacity-70 transition-opacity group-hover:opacity-100" aria-hidden />
        </Link>
        <nav className="flex items-center gap-4 text-sm">
          <Link href="/" className="flex min-h-12 items-center text-ink/70 hover:text-ink">
            Dashboard
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
