// CSS-only skeleton shown while the dashboard fetches accounts and quotes.
// Mirrors the tabbed layout: hero number, breakdown line, tab bar, panel.
export default function Loading() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8" aria-busy>
      <div className="flex flex-col gap-3">
        <div className="h-4 w-64 max-w-full animate-pulse rounded bg-ink/5" />
        <div className="h-12 w-72 max-w-full animate-pulse rounded-md bg-ink/5" />
        <div className="h-4 w-96 max-w-full animate-pulse rounded bg-ink/5" />
      </div>
      <div className="flex gap-6 border-b border-rule pb-3">
        {[0, 1, 2, 3].map((index) => (
          <div key={index} className="h-6 w-20 animate-pulse rounded bg-ink/5" />
        ))}
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        {[0, 1, 2].map((index) => (
          <div key={index} className="h-24 animate-pulse rounded-lg bg-ink/5" />
        ))}
      </div>
      <div className="flex flex-col gap-2">
        {[0, 1, 2, 3, 4, 5].map((index) => (
          <div key={index} className="h-10 animate-pulse rounded bg-ink/5" />
        ))}
      </div>
    </main>
  )
}
