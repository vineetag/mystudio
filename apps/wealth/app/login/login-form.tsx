"use client"

import { useState, useTransition } from "react"
// Direct actions import (not the module index): the index re-exports
// server-only session helpers, which a client component must not pull in.
import { requestMagicLink } from "@/modules/auth/actions"

export function LoginForm({ initialError }: { initialError?: string }) {
  const [email, setEmail] = useState("")
  const [error, setError] = useState(initialError ?? "")
  const [sentMessage, setSentMessage] = useState("")
  const [isPending, startTransition] = useTransition()

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError("")
    setSentMessage("")
    startTransition(async () => {
      const result = await requestMagicLink(email)
      if (result.ok) {
        setSentMessage(result.message)
      } else {
        setError(result.error)
      }
    })
  }

  if (sentMessage) {
    return (
      <p role="status" className="rounded-md border border-rule bg-ink/[0.04] p-4 text-sm text-ink/80">
        {sentMessage}
      </p>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <label htmlFor="email" className="text-sm font-medium text-ink/80">
        Owner email
      </label>
      <input
        id="email"
        type="email"
        required
        autoComplete="email"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        placeholder="you@example.com"
        className="min-h-12 rounded-md border border-rule px-4 text-base outline-none focus:border-moss"
      />
      <button
        type="submit"
        disabled={isPending}
        className="min-h-12 rounded-md bg-ink px-4 text-base font-medium text-white disabled:opacity-60"
      >
        {isPending ? "Sending link…" : "Email me a sign-in link"}
      </button>
      {error && (
        <p role="alert" className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          {error}
        </p>
      )}
    </form>
  )
}
