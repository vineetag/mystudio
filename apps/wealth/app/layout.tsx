import type { Metadata } from "next"
import Link from "next/link"
import { Inter } from "next/font/google"
import { ModeBanner } from "@/components/mode-banner"
import { SiteHeader } from "@/components/site-header"
import "./globals.css"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "OneFolio",
  description: "Many accounts, one view — a personal stock portfolio tracker.",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} flex min-h-dvh flex-col`}>
        <ModeBanner />
        <SiteHeader />
        <div className="flex-1">{children}</div>
        <footer className="border-t border-neutral-200">
          <nav className="mx-auto flex w-full max-w-5xl flex-wrap gap-x-6 gap-y-2 px-4 py-6 text-sm text-neutral-500">
            <Link href="/privacy" className="hover:text-neutral-900">Privacy</Link>
            <Link href="/disclaimer" className="hover:text-neutral-900">Disclaimer</Link>
            <Link href="/release-notes" className="hover:text-neutral-900">Release Notes</Link>
          </nav>
        </footer>
      </body>
    </html>
  )
}
