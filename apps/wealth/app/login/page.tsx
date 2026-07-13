import Link from "next/link"
import { getViewer, signOut } from "@/modules/auth"
import { LoginForm } from "./login-form"

// Minimal M1 page — visual design lands in the M5 pass.
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const [{ error }, viewer] = await Promise.all([searchParams, getViewer()])

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center gap-6 px-4 py-12">
      <div>
        <h1 className="font-display text-3xl font-medium text-ink">Sign in to OneFolio</h1>
        <p className="mt-2 text-sm text-ink/70">
          Single-owner app. Only the allowlisted email can sign in — everyone
          else can{" "}
          <Link href="/" className="underline">
            explore demo mode
          </Link>
          .
        </p>
      </div>

      {viewer.isOwner ? (
        <div className="flex flex-col gap-3">
          <p className="rounded-md border border-rule bg-ink/[0.04] p-4 text-sm text-ink/80">
            Signed in as {viewer.user?.email} (
            {viewer.mode === "live" ? "LIVE mode" : "previewing DEMO mode"}).
          </p>
          <form action={signOut}>
            <button
              type="submit"
              className="min-h-12 w-full rounded-md border border-rule px-4 text-base font-medium text-ink"
            >
              Sign out
            </button>
          </form>
        </div>
      ) : (
        <LoginForm initialError={error} />
      )}
    </main>
  )
}
