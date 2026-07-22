import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"

const inter = Inter({ subsets: ["latin"] })

// Canonical host comes from NEXT_PUBLIC_SITE_URL (math.appcrafter.studio in
// production) so canonical URLs survive a domain change.
export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3002",
  ),
  alternates: { canonical: "/" },
  title: "Math Workbook",
  description: "Personalized math practice for every level",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>{children}</body>
    </html>
  )
}
