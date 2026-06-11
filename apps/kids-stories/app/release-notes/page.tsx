import type { Metadata } from "next"

export const metadata: Metadata = { title: "Release notes · ZippyTales" }

export default function ReleaseNotesPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="text-3xl font-extrabold text-ink">Release notes</h1>
      <div className="mt-8 space-y-8">
        <section>
          <h2 className="text-lg font-semibold text-ink">v0.1.0 — June 2026</h2>
          <p className="mt-2 text-ink-muted">Initial launch of ZippyTales.</p>
          <ul className="mt-3 list-disc space-y-1 pl-5 text-ink-muted">
            <li>
              Personalized stories from a child&apos;s name and up to two themes
              — choose from Kindness, Honesty, Courage, Family, Friendship,
              Overcoming Challenges, Wonder, Nature, and Growth.
            </li>
            <li>Child&apos;s name is optional — the story invents one if not provided.</li>
            <li>
              Email sign-up and a personal library to revisit saved stories.
            </li>
            <li>Shareable story pages.</li>
            <li>5 stories per account per day.</li>
          </ul>
        </section>
      </div>
    </main>
  )
}
