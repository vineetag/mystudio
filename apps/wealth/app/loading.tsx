// CSS-only skeleton shown while the dashboard fetches accounts and quotes.
export default function Loading() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 py-8" aria-busy>
      <div className="grid gap-4 sm:grid-cols-3">
        {[0, 1, 2].map((index) => (
          <div key={index} className="h-24 animate-pulse rounded-lg bg-neutral-100" />
        ))}
      </div>
      <div className="h-10 w-72 max-w-full animate-pulse rounded-md bg-neutral-100" />
      <div className="flex flex-col gap-2">
        {[0, 1, 2, 3, 4, 5].map((index) => (
          <div key={index} className="h-10 animate-pulse rounded bg-neutral-100" />
        ))}
      </div>
    </main>
  )
}
