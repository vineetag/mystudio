import Link from "next/link"
import { StoryGenerator } from "@/modules/kids-stories"

export default function HomePage() {
  return (
    <main className="flex min-h-[calc(100dvh-4rem)] flex-col items-center px-6 py-12">
      <div className="w-full max-w-xl text-center">
        <h1 className="text-4xl font-extrabold tracking-tight text-ink sm:text-5xl">
          ZippyTales
        </h1>
        <p className="mt-3 text-lg text-ink-muted">
          A personalized bedtime story in seconds — just add your little one&apos;s
          name and pick a theme.
        </p>
      </div>

      <div className="mt-8 flex w-full justify-center">
        <StoryGenerator />
      </div>

      <nav className="mt-12 flex flex-wrap justify-center gap-6 text-sm text-ink-muted">
        <Link href="/library" className="hover:text-ink">
          My library
        </Link>
        <Link href="/privacy" className="hover:text-ink">
          Privacy
        </Link>
        <Link href="/disclaimer" className="hover:text-ink">
          Disclaimer
        </Link>
        <Link href="/release-notes" className="hover:text-ink">
          Release notes
        </Link>
      </nav>
    </main>
  )
}
