import Link from "next/link"

const apps = [
  { name: "Tiny Tales", href: "#", description: "AI-powered stories for little readers" },
  { name: "Math Workbook", href: "#", description: "Personalized math practice" },
  { name: "Wealth Tracker", href: "#", description: "Track your financial journey" },
]

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <div className="max-w-3xl w-full text-center">
        <h1 className="text-5xl font-bold tracking-tight">Slate Studio</h1>
        <p className="mt-4 text-xl text-muted-foreground">
          A portfolio of tools built for real problems.
        </p>
        <div className="mt-12 grid gap-6 sm:grid-cols-3">
          {apps.map((app) => (
            <Link
              key={app.name}
              href={app.href}
              className="rounded-xl border bg-card p-6 text-left hover:shadow-md transition-shadow"
            >
              <h2 className="font-semibold">{app.name}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{app.description}</p>
            </Link>
          ))}
        </div>
        <nav className="mt-12 flex justify-center gap-6 text-sm text-muted-foreground">
          <Link href="/privacy" className="hover:text-foreground">Privacy</Link>
          <Link href="/disclaimer" className="hover:text-foreground">Disclaimer</Link>
          <Link href="/release-notes" className="hover:text-foreground">Release Notes</Link>
        </nav>
      </div>
    </main>
  )
}
