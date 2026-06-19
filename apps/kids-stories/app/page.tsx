import { StoryGenerator } from "@/modules/kids-stories"

export default function HomePage() {
  return (
    <main className="flex min-h-[calc(100dvh-4rem)] flex-col items-center px-6 py-10 animate-fade-in">
      {/* Floating night-scene hero */}
      <div className="mb-2 flex items-end justify-center gap-4 select-none" aria-hidden="true">
        <span className="text-5xl animate-float-slow" style={{ animationDelay: "0s" }}>🌙</span>
        <span className="text-3xl animate-float" style={{ animationDelay: "0.6s" }}>⭐</span>
        <span className="text-6xl animate-float-slow" style={{ animationDelay: "0.3s" }}>🦉</span>
        <span className="text-3xl animate-float" style={{ animationDelay: "0.9s" }}>✨</span>
        <span className="text-4xl animate-float-fast" style={{ animationDelay: "0.15s" }}>⭐</span>
      </div>

      <div className="w-full max-w-xl text-center">
        <h1 className="text-4xl font-extrabold tracking-tight text-ink sm:text-5xl">
          ZippyTales
        </h1>
        <p className="mt-3 text-lg text-ink-muted">
          ZippyTales is a free web app that creates personalized, age-appropriate
          bedtime stories for children. Add your child&apos;s name, pick a theme, and
          get an original illustrated story in seconds — no account required to start.
        </p>
      </div>

      <div className="mt-8 flex w-full justify-center">
        <StoryGenerator />
      </div>

      {/* ── HOW IT WORKS ── server-rendered so it is visible to crawlers and
          to anyone evaluating the app without running JavaScript or signing in. */}
      <section className="mt-16 w-full max-w-2xl">
        <h2 className="text-center text-2xl font-bold tracking-tight text-ink">
          How ZippyTales works
        </h2>
        <ol className="mt-6 grid gap-4 sm:grid-cols-3">
          <li className="rounded-xl border border-ink/10 p-5 text-center">
            <div className="text-2xl" aria-hidden="true">✏️</div>
            <h3 className="mt-2 font-semibold text-ink">1. Add a name &amp; theme</h3>
            <p className="mt-1 text-sm text-ink-muted">
              Enter your child&apos;s name and choose the themes and characters they love.
            </p>
          </li>
          <li className="rounded-xl border border-ink/10 p-5 text-center">
            <div className="text-2xl" aria-hidden="true">✨</div>
            <h3 className="mt-2 font-semibold text-ink">2. Generate instantly</h3>
            <p className="mt-1 text-sm text-ink-muted">
              ZippyTales writes an original, age-appropriate story in seconds.
            </p>
          </li>
          <li className="rounded-xl border border-ink/10 p-5 text-center">
            <div className="text-2xl" aria-hidden="true">📚</div>
            <h3 className="mt-2 font-semibold text-ink">3. Read &amp; save</h3>
            <p className="mt-1 text-sm text-ink-muted">
              Read it together right away, or sign in to save it to your library.
            </p>
          </li>
        </ol>
      </section>

      {/* ── ACCOUNT & SIGN-IN ── explicitly states the app is usable without an
          account and what the Google sign-in scopes are used for. This directly
          answers the OAuth verification reviewer. */}
      <section className="mt-12 w-full max-w-2xl rounded-2xl border border-ink/10 p-6">
        <h2 className="text-center text-2xl font-bold tracking-tight text-ink">
          Do I need an account?
        </h2>
        <p className="mt-4 text-center text-ink-muted">
          No. ZippyTales is free and works without an account — anyone can create
          and read a story right away. Signing in with Google is optional, and only
          needed if you want to save stories to a personal library and access them
          across your devices.
        </p>
        <p className="mt-4 text-center text-sm text-ink-muted">
          When you choose to sign in, ZippyTales accesses only your name and email
          address to create your account. We never access your contacts, files, or
          any other Google data. See our{" "}
          <a href="/privacy" className="font-medium text-ink underline">
            Privacy Policy
          </a>{" "}
          for details.
        </p>
      </section>

    </main>
  )
}
