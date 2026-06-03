import Link from "next/link"

export default function NotFound() {
  return (
    <main className="flex min-h-[calc(100dvh-4rem)] flex-col items-center justify-center px-6 text-center">
      <p className="text-6xl" aria-hidden="true">
        🧭
      </p>
      <h1 className="mt-4 text-3xl font-extrabold text-ink">
        This page wandered off
      </h1>
      <p className="mt-2 text-ink-muted">
        We couldn&apos;t find what you were looking for.
      </p>
      <Link
        href="/"
        className="mt-6 inline-flex h-11 items-center justify-center rounded-pill bg-brand-purple px-6 text-base font-semibold text-white hover:bg-brand-purple/90"
      >
        Back to home
      </Link>
    </main>
  )
}
