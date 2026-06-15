"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { ShieldCheck } from "lucide-react"
import { Button } from "@studio/ui"
import { createClient } from "@/lib/supabase-browser"

type Mode = "login" | "signup"

const COPY = {
  login: {
    heading: "Welcome back",
    subheading: "Sign in to read and save your stories.",
    submit: "Log in",
    switchPrompt: "New here?",
    switchHref: "/auth/signup",
    switchCta: "Create an account",
  },
  signup: {
    heading: "Create your account",
    subheading: "Start crafting personalized stories in seconds.",
    submit: "Sign up",
    switchPrompt: "Already have an account?",
    switchHref: "/auth/login",
    switchCta: "Log in",
  },
} as const

const inputClass =
  "h-11 w-full rounded-input border border-ink/15 bg-white px-4 text-base text-ink " +
  "placeholder:text-ink-muted focus:border-brand-purple focus:outline-none " +
  "focus:ring-2 focus:ring-brand-purple/30"

export function AuthForm({ mode }: { mode: Mode }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const copy = COPY[mode]

  const [displayName, setDisplayName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [resendLoading, setResendLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [confirmed, setConfirmed] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setNotice(null)

    const supabase = createClient()

    try {
      // Hard navigation (not router.push) so browser commits the session
      // cookie before the next request fires. router.push fires the SPA
      // navigation before @supabase/ssr's onAuthStateChange sets the cookie,
      // causing middleware to see no session and redirect back to login.
      const redirectTo = searchParams.get("redirectTo") ?? "/library"

      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { display_name: displayName.trim() || null },
            // Confirmation email links back here; the route exchanges the code.
            emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? window.location.origin}/auth/callback`,
          },
        })
        if (error) throw error

        // With email confirmation ON, no session is returned until the user
        // confirms via email. With it OFF, we get a session immediately.
        if (data.session) {
          window.location.href = redirectTo
        } else {
          setConfirmed(true)
          setNotice(
            "Check your inbox to confirm your email, then come back and log in.",
          )
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })
        if (error) throw error

        window.location.href = redirectTo
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Something went wrong."
      if (msg.toLowerCase().includes("rate limit")) {
        setError("Too many sign-up attempts. Please wait a few minutes and try again.")
      } else {
        setError(msg)
      }
    } finally {
      setLoading(false)
    }
  }

  async function handleResend() {
    setResendLoading(true)
    const supabase = createClient()
    await supabase.auth.resend({ type: "signup", email })
    setNotice("Confirmation email resent — check your inbox.")
    setResendLoading(false)
  }

  return (
    <div className="w-full max-w-md rounded-card bg-white p-8 shadow-sm">
      <h1 className="text-2xl font-bold text-ink">{copy.heading}</h1>
      <p className="mt-1 text-sm text-ink-muted">{copy.subheading}</p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        {mode === "signup" && (
          <div className="space-y-1.5">
            <label htmlFor="displayName" className="text-sm font-medium text-ink">
              Your name
            </label>
            <input
              id="displayName"
              type="text"
              autoComplete="name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Optional"
              className={inputClass}
            />
          </div>
        )}

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
          {mode === "signup" && (
            <p className="flex items-center gap-1 text-xs text-ink-muted">
              <ShieldCheck className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              Used for sign-in only — we never store or share your email.
            </p>
          )}
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label htmlFor="password" className="text-sm font-medium text-ink">
              Password
            </label>
            {mode === "login" && (
              <Link
                href="/auth/forgot-password"
                className="text-sm text-brand-purple hover:underline"
              >
                Forgot password?
              </Link>
            )}
          </div>
          <input
            id="password"
            type="password"
            autoComplete={mode === "signup" ? "new-password" : "current-password"}
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 8 characters"
            className={inputClass}
          />
        </div>

        {error && (
          <p role="alert" className="text-sm text-red-600">
            {error}
          </p>
        )}
        {notice && (
          <div className="space-y-2">
            <p role="status" className="text-sm text-green-700">
              {notice}
            </p>
            {confirmed && (
              <button
                type="button"
                onClick={handleResend}
                disabled={resendLoading}
                className="text-sm text-brand-purple hover:underline disabled:opacity-50"
              >
                {resendLoading ? "Resending…" : "Didn't get it? Resend confirmation email"}
              </button>
            )}
          </div>
        )}

        <Button
          type="submit"
          disabled={loading}
          className="h-12 w-full rounded-pill bg-brand-purple text-base text-white hover:bg-brand-purple/90"
        >
          {loading ? "Please wait…" : copy.submit}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-ink-muted">
        {copy.switchPrompt}{" "}
        <Link
          href={copy.switchHref}
          className="font-semibold text-brand-purple hover:underline"
        >
          {copy.switchCta}
        </Link>
      </p>
    </div>
  )
}
