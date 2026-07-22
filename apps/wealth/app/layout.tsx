import type { Metadata } from "next"
import Link from "next/link"
import { IBM_Plex_Sans, Newsreader } from "next/font/google"
import { ModeBanner } from "@/components/mode-banner"
import { SiteHeader } from "@/components/site-header"
import "./globals.css"

// Ledger pairing: Newsreader for the wordmark, sums, and section heads;
// IBM Plex Sans (tabular figures) for body and every number.
const plex = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-plex",
})

const newsreader = Newsreader({
  subsets: ["latin"],
  style: ["normal", "italic"],
  variable: "--font-newsreader",
})

// Served on more than one host (getonefolio.app and the
// onefolio.appcrafter.studio fallback), so canonical URLs are pinned to
// NEXT_PUBLIC_SITE_URL rather than the request host.
export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3003",
  ),
  alternates: { canonical: "/" },
  title: "OneFolio",
  description: "Many accounts, one view — a personal stock portfolio ledger.",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body
        className={`${plex.variable} ${newsreader.variable} flex min-h-dvh flex-col font-sans`}
      >
        <ModeBanner />
        <SiteHeader />
        <div className="flex-1">{children}</div>
        <footer className="border-t border-rule">
          <nav className="mx-auto flex w-full max-w-5xl flex-wrap gap-x-6 gap-y-2 px-4 py-6 text-sm text-ink/60">
            <Link href="/privacy" className="hover:text-ink">Privacy</Link>
            <Link href="/disclaimer" className="hover:text-ink">Disclaimer</Link>
            <Link href="/release-notes" className="hover:text-ink">Release Notes</Link>
          </nav>
        </footer>
      </body>
    </html>
  )
}
