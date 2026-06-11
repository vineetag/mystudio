import Link from "next/link"

const links = [
  { label: "My Library", href: "/library" },
  { label: "Privacy", href: "/privacy" },
  { label: "Disclaimer", href: "/disclaimer" },
  { label: "Release Notes", href: "/release-notes" },
]

export function Footer() {
  return (
    <footer className="mt-auto border-t border-ink/10 bg-parchment/60 py-6 print:hidden">
      <nav className="mx-auto flex max-w-5xl flex-wrap items-center justify-center gap-x-6 gap-y-2 px-6">
        {links.map(({ label, href }) => (
          <Link
            key={href}
            href={href}
            className="text-sm text-ink-muted hover:text-brand-purple"
          >
            {label}
          </Link>
        ))}
      </nav>
    </footer>
  )
}
