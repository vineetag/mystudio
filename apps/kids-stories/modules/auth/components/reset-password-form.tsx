"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@studio/ui"
import { createClient } from "@/lib/supabase-browser"

const inputClass =
  "h-11 w-full rounded-input border border-ink/15 bg-white px-4 text-base text-ink " +
  "placeholder:text-ink-muted focus:border-brand-purple focus:outline-none " +
  "focus:ring-2 focus:ring-brand-purple/30"

export function ResetPasswordForm() {
  const router = useRouter()
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password !== confirm) {
      setError("Passwords don't match.")
      return
    }
    setLoading(true)
    setError(null)

    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password })

    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      router.push("/library")
      router.refresh()
    }
  }

  return (
    <div className="w-full max-w-md rounded-card bg-white p-8 shadow-sm">
      <h1 className="text-2xl font-bold text-ink">Set new password</h1>
      <p className="mt-1 text-sm text-ink-muted">Choose a new password for your account.</p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <div className="space-y-1.5">
          <label htmlFor="password" className="text-sm font-medium text-ink">
            New password
          </label>
          <input
            id="password"
            type="password"
            autoComplete="new-password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 6 characters"
            className={inputClass}
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="confirm" className="text-sm font-medium text-ink">
            Confirm password
          </label>
          <input
            id="confirm"
            type="password"
            autoComplete="new-password"
            required
            minLength={6}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="Same password again"
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
          {loading ? "Saving…" : "Set new password"}
        </Button>
      </form>
    </div>
  )
}
