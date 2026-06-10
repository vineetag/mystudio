import type { Metadata } from "next"

export const metadata: Metadata = { title: "Privacy · ZippyTales" }

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="text-3xl font-extrabold text-ink">Privacy Policy</h1>
      <p className="mt-2 text-sm text-ink-muted">Last updated: June 2026</p>
      <div className="mt-8 space-y-6 text-ink-muted">
        <p>
          ZippyTales uses your email address only to authenticate your account.
          We do not store, log, or share your email address — it is never
          retained beyond what is required to manage your login session.
          The only other data we collect is what you enter to personalize a
          story: a child&apos;s first name, a theme, and an optional age range.
        </p>
        <p>
          Story details are sent to our AI provider (Anthropic) solely to
          generate the story text. We do not sell your personal data.
        </p>
        <p>
          Accounts are intended for adults. We ask that you use only a
          child&apos;s first name, and never share sensitive personal
          information in story details.
        </p>
        <p>
          For questions or to request deletion of your data, contact us at
          privacy@zippytales.app.
        </p>
      </div>
    </main>
  )
}
