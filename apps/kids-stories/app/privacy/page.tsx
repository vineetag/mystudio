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
          We store your email address as part of your account record so we can
          sign you in and link your saved stories to you. We never sell or share
          it, and you can request its deletion at any time (see below).
          The only other data we collect is what you optionally enter to
          personalize a story: a theme, an optional age range, and an optional
          child&apos;s first name. The name is never required — if you leave it
          blank, the AI will choose a name for the character.
        </p>
        <p>
          Story details are sent to our AI provider (Anthropic) solely to
          generate the story text. We do not sell your personal data.
        </p>
        <p>
          Accounts are intended for adults. The child&apos;s name is optional,
          but if you choose to provide one we ask that you use only a first
          name, and never share sensitive personal information in story details.
        </p>
        <p>
          For questions or to request deletion of your data, contact us at
          hello@appcrafter.studio.
        </p>
      </div>
    </main>
  )
}
