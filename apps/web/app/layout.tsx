import type { Metadata, Viewport } from "next"
import { Inter } from "next/font/google"
import "./globals.css"

const inter = Inter({ subsets: ["latin"] })

export const viewport: Viewport = {
  themeColor: "#080808",
}

export const metadata: Metadata = {
  title: "AppCrafter Studio — Apps Built with Craft and Intention",
  description:
    "Independent app studio building focused consumer apps for families, learners, and builders.",
  metadataBase: new URL("https://appcrafter.studio"),
  alternates: {
    canonical: "/",
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className={inter.className}>{children}</body>
    </html>
  )
}
