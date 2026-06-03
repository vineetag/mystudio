import type { Metadata } from "next"
import { Nunito, Lora } from "next/font/google"
import "./globals.css"
import { Toaster } from "sonner"
import { Navbar } from "@/components/navbar"

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

export const metadata: Metadata = {
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
      <body>
        <Navbar />
        {children}
        <Toaster richColors position="top-center" />
      </body>
    </html>
  )
}
