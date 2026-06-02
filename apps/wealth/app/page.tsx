import Link from "next/link"

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <div className="max-w-2xl w-full text-center">
        <h1 className="text-5xl font-bold tracking-tight">Wealth Tracker</h1>
        <p className="mt-4 text-xl text-muted-foreground">
          Track your financial journey, simply.
        </p>
        <p className="mt-8 text-muted-foreground">Coming soon.</p>
        <nav className="mt-12 flex justify-center gap-6 text-sm text-muted-foreground">
          <Link href="/privacy" className="hover:text-foreground">Privacy</Link>
          <Link href="/disclaimer" className="hover:text-foreground">Disclaimer</Link>
          <Link href="/release-notes" className="hover:text-foreground">Release Notes</Link>
        </nav>
      </div>
    </main>
  )
}
