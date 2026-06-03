"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
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
  const copy = COPY[mode]

  const [displayName, setDisplayName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setNotice(null)

    const supabase = createClient()

    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { display_name: displayName.trim() || null },
            // Confirmation email links back here; the route exchanges the code.
            emailRedirectTo: `${window.location.origin}/auth/callback`,
          },
        })
        if (error) throw error

        // With email confirmation ON, no session is returned until the user
        // confirms via email. With it OFF, we get a session immediately.
        if (data.session) {
          router.push("/library")
          router.refresh()
        } else {
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

        router.push("/library")
        router.refresh()
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.")
    } finally {
      setLoading(false)
    }
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
        </div>

        <div className="space-y-1.5">
          <label htmlFor="password" className="text-sm font-medium text-ink">
            Password
          </label>
          <input
            id="password"
            type="password"
            autoComplete={mode === "signup" ? "new-password" : "current-password"}
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 6 characters"
            className={inputClass}
          />
        </div>

        {error && (
          <p role="alert" className="text-sm text-theme-fantasy-text">
            {error}
          </p>
        )}
        {notice && (
          <p role="status" className="text-sm text-theme-animals-text">
            {notice}
          </p>
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
