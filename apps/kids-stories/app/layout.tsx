import type { Metadata } from "next"
import { Nunito, Lora } from "next/font/google"
import "./globals.css"
import { Toaster } from "sonner"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { StoryClaimer } from "@/components/story-claimer"
import { TimezoneSync } from "@/components/timezone-sync"
import { AppAnalytics } from "@/components/app-analytics"
import { Analytics } from "@vercel/analytics/next"
import { SpeedInsights } from "@vercel/speed-insights/next"

// UI typeface — wired to Tailwind's font-sans via the CSS variable.
const nunito = Nunito({
  subsets: ["latin"],
  variable: "--font-nunito",
  display: "swap",
})

// Story body typeface — wired to Tailwind's font-serif via the CSS variable.
const lora = Lora({
  subsets: ["latin"],
  variable: "--font-lora",
  display: "swap",
})

// The app is served on more than one host (zippytales.app and the
// zippytales.appcrafter.studio fallback), so every page emits an absolute
// canonical URL pointing at NEXT_PUBLIC_SITE_URL. Changing that env var is all
// it takes to move the canonical host if a domain is ever dropped.
export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3001",
  ),
  alternates: { canonical: "/" },
  title: "ZippyTales",
  description: "AI-powered stories crafted for little readers.",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${nunito.variable} ${lora.variable}`}>
      <body className="flex min-h-screen flex-col">
        <AppAnalytics
          posthogKey={process.env.NEXT_PUBLIC_POSTHOG_KEY ?? ""}
          posthogHost={process.env.NEXT_PUBLIC_POSTHOG_HOST}
        >
          <StoryClaimer />
          <TimezoneSync />
          <Navbar />
          <div className="flex-1">{children}</div>
          <Footer />
          <Toaster richColors position="top-center" />
        </AppAnalytics>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  )
}
