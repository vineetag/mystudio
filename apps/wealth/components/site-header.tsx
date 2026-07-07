import Link from "next/link"
import { getViewer } from "@/modules/auth"

export async function SiteHeader() {
  const viewer = await getViewer()

  return (
    <header className="border-b border-neutral-200">
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-3">
        <Link href="/" className="text-lg font-semibold tracking-tight text-neutral-900">
          OneFolio
        </Link>
        <nav className="flex items-center gap-4 text-sm">
          <Link href="/" className="flex min-h-12 items-center text-neutral-600 hover:text-neutral-900">
            Dashboard
          </Link>
          {viewer.isOwner ? (
            <>
              <Link
                href="/accounts"
                className="flex min-h-12 items-center text-neutral-600 hover:text-neutral-900"
              >
                Accounts
              </Link>
              <Link
                href="/login"
                className="flex min-h-12 items-center text-neutral-600 hover:text-neutral-900"
              >
                Session
              </Link>
            </>
          ) : (
            <Link
              href="/login"
              className="flex min-h-12 items-center text-neutral-600 hover:text-neutral-900"
            >
              Owner sign-in
            </Link>
          )}
        </nav>
      </div>
    </header>
  )
}
