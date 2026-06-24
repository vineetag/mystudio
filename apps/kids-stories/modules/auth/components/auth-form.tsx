"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { ShieldCheck } from "lucide-react"
import { Button } from "@studio/ui"
import { createClient } from "@/lib/supabase-browser"
import { ANON_CLAIM_KEY } from "@/lib/anon-claim"
import { Events, useAnalytics } from "@/lib/analytics"

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

const oauthBtnBase =
  "flex h-11 w-full cursor-pointer items-center justify-center gap-3 rounded-input " +
  "border text-sm font-medium transition-colors duration-200 focus:outline-none " +
  "focus:ring-2 focus:ring-brand-purple/30"

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"
      />
      <path
        fill="#FBBC05"
        d="M3.964 10.707A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.707V4.961H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.039l3.007-2.332z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.961L3.964 7.293C4.672 5.163 6.656 3.58 9 3.58z"
      />
    </svg>
  )
}

export function AuthForm({ mode }: { mode: Mode }) {
  const searchParams = useSearchParams()
  const { track } = useAnalytics()

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [oauthLoading, setOauthLoading] = useState<"google" | null>(null)
  const [resendLoading, setResendLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [confirmed, setConfirmed] = useState(false)
  // Whether the current visitor has an anonymous (not yet permanent) session.
  // In email signup this upgrades the anon user via updateUser (preserving the
  // UUID); for Google we signInWithOAuth and let StoryClaimer move the stories.
  const [isAnonymous, setIsAnonymous] = useState(false)

  const redirectTo = searchParams.get("redirectTo") ?? "/library"

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => {
      const isAnon = data.user?.is_anonymous ?? false
      setIsAnonymous(isAnon)
      // Stash the anon id so StoryClaimer can transfer stories after auth, no
      // matter which page the OAuth flow lands on. See components/story-claimer.
      if (isAnon && data.user) {
        try {
          localStorage.setItem(ANON_CLAIM_KEY, data.user.id)
        } catch {}
      }
    })
  }, [])

  async function handleOAuth(provider: "google") {
    setOauthLoading(provider)
    setError(null)
    const supabase = createClient()

    // Fetch the current user now — don't rely on state from useEffect, which
    // may not have resolved if the button is clicked immediately after mount.
    const { data: { user: currentUser } } = await supabase.auth.getUser()
    const currentIsAnonymous = currentUser?.is_anonymous ?? false

    // In production, pin the callback to the canonical domain so OAuth always
    // returns to zippytales.app — even if the user opened a raw *.vercel.app
    // deployment URL. In preview/dev, use the live origin so OAuth returns to
    // the same deployment being tested.
    const baseUrl =
      process.env.NEXT_PUBLIC_VERCEL_ENV === "production"
        ? (process.env.NEXT_PUBLIC_SITE_URL ?? window.location.origin)
        : window.location.origin
    const callbackUrl = `${baseUrl}/auth/callback?next=${encodeURIComponent(redirectTo)}`

    // Stash the anon id so StoryClaimer transfers stories once the permanent
    // session exists — works regardless of where OAuth redirects back to.
    if (currentIsAnonymous && currentUser) {
      try {
        localStorage.setItem(ANON_CLAIM_KEY, currentUser.id)
      } catch {}
    }

    // Always signInWithOAuth — never linkIdentity. Linking an anonymous user to
    // a Google account that already belongs to someone throws
    // identity_already_exists, whose error lands in the URL hash and is awkward
    // to recover from. signInWithOAuth instead signs into whichever account the
    // Google login resolves to (new or existing); StoryClaimer then moves the
    // anonymous stories onto it. One path, no linking conflicts.
    const { error: authError } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: callbackUrl },
    })

    if (authError) {
      setError(authError.message)
      setOauthLoading(null)
    }
    // On success the browser follows the OAuth redirect — no further action needed
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setNotice(null)

    const supabase = createClient()

    try {
      if (mode === "signup") {
        if (isAnonymous) {
          // Upgrade anonymous user to a permanent email/password account.
          // UUID is preserved — stories already generated stay in their library.
          const { error } = await supabase.auth.updateUser(
            {
              email,
              password,
            },
            {
              emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(redirectTo)}`,
            },
          )
          if (error) throw error
          track(Events.AUTH_SIGN_UP, { method: "email_upgrade" })
          setConfirmed(true)
          setNotice(
            "Check your inbox to confirm your email. Your stories will be waiting in your library.",
          )
        } else {
          // New visitor with no prior session — standard signup.
          const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
              emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? window.location.origin}/auth/callback`,
            },
          })
          if (error) throw error
          track(Events.AUTH_SIGN_UP, { method: "email" })

          if (data.session) {
            window.location.href = redirectTo
          } else {
            setConfirmed(true)
            setNotice(
              "Check your inbox to confirm your email, then come back and log in.",
            )
          }
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })
        if (error) throw error

        // Story transfer is handled by StoryClaimer once /library loads.
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

  const anyLoading = loading || oauthLoading !== null

  // Tailor signup copy when the visitor has stories they want to save
  const savingStories = mode === "signup" && isAnonymous && redirectTo === "/library"
  const copy = {
    ...COPY[mode],
    ...(savingStories
      ? {
          heading: "Save your story",
          subheading: "Create a free account — your story will be waiting in your library.",
        }
      : {}),
  }

  return (
    <div className="w-full max-w-md rounded-card bg-white p-8 shadow-sm">
      <h1 className="text-2xl font-bold text-ink">{copy.heading}</h1>
      <p className="mt-1 text-sm text-ink-muted">{copy.subheading}</p>

      {/* Social sign-in */}
      <div className="mt-6 space-y-3">
        <button
          type="button"
          onClick={() => handleOAuth("google")}
          disabled={anyLoading}
          aria-label="Continue with Google"
          className={`${oauthBtnBase} border-ink/15 bg-white text-ink hover:bg-gray-50 disabled:opacity-60`}
        >
          <GoogleIcon />
          {oauthLoading === "google" ? "Redirecting…" : "Continue with Google"}
        </button>
      </div>

      {/* Divider */}
      <div className="my-6 flex items-center gap-3">
        <div className="h-px flex-1 bg-ink/10" />
        <span className="text-xs text-ink-muted">or</span>
        <div className="h-px flex-1 bg-ink/10" />
      </div>

      {/* Email / password form */}
      <form onSubmit={handleSubmit} className="space-y-4">
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
              Used to sign you in only — we never sell or share it.
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
            {/* Resend only for standard signups — anon upgrades use updateUser which has its own resend flow */}
            {confirmed && !isAnonymous && (
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
          disabled={anyLoading}
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
