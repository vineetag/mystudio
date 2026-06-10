"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@studio/ui"
import { createClient } from "@/lib/supabase-browser"

const inputClass =
  "h-11 w-full rounded-input border border-ink/15 bg-white px-4 text-base text-ink " +
  "placeholder:text-ink-muted focus:border-brand-purple focus:outline-none " +
  "focus:ring-2 focus:ring-brand-purple/30"

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const supabase = createClient()
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? window.location.origin
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${siteUrl}/auth/callback?next=/auth/reset-password`,
    })

    if (error) {
      setError(error.message)
    } else {
      setDone(true)
    }
    setLoading(false)
  }

  if (done) {
    return (
      <div className="w-full max-w-md rounded-card bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-bold text-ink">Check your inbox</h1>
        <p className="mt-2 text-sm text-ink-muted">
          If <span className="font-medium text-ink">{email}</span> is registered,
          you'll receive a password reset link shortly.
        </p>
        <p className="mt-6 text-center text-sm text-ink-muted">
          <Link href="/auth/login" className="font-semibold text-brand-purple hover:underline">
            Back to log in
          </Link>
        </p>
      </div>
    )
  }

  return (
    <div className="w-full max-w-md rounded-card bg-white p-8 shadow-sm">
      <h1 className="text-2xl font-bold text-ink">Reset your password</h1>
      <p className="mt-1 text-sm text-ink-muted">
        Enter your email and we'll send you a reset link.
      </p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <div className="space-y-1.5">
          <label htmlFor="email" className="text-sm font-medium text-ink">
            Email
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className={inputClass}
          />
        </div>

        {error && (
          <p role="alert" className="text-sm text-red-600">
            {error}
          </p>
        )}

        <Button
          type="submit"
          disabled={loading}
          className="h-12 w-full rounded-pill bg-brand-purple text-base text-white hover:bg-brand-purple/90"
        >
          {loading ? "Sending…" : "Send reset link"}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-ink-muted">
        <Link href="/auth/login" className="font-semibold text-brand-purple hover:underline">
          Back to log in
        </Link>
      </p>
    </div>
  )
}
