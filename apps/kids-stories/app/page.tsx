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
          A personalized bedtime story in seconds — just add your little one&apos;s
          name and pick a theme.
        </p>
      </div>

      <div className="mt-8 flex w-full justify-center">
        <StoryGenerator />
      </div>

    </main>
  )
}
