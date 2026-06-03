import { Loader2 } from "lucide-react"

export default function LibraryLoading() {
  return (
    <main className="flex min-h-[calc(100dvh-4rem)] flex-col items-center justify-center gap-3 px-6 text-ink-muted">
      <Loader2 className="animate-spin" size={32} aria-hidden="true" />
      <p className="text-sm">Loading your library…</p>
    </main>
  )
}
