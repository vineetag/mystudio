"use client"

import { useState } from "react"
import Link from "next/link"

const navItems = [
  { label: "Apps", href: "/#apps" },
  { label: "Skills", href: "/#skills" },
  { label: "About", href: "/about" },
] as const

export function SiteNav() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <>
      {/* ── NAVIGATION ── */}
      <header
        className="sticky top-0 z-50"
        style={{
          background: "rgba(8,8,8,0.85)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          borderBottom: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center gap-2">
              <span
                className="w-3 h-3 rounded-[3px] shrink-0"
                style={{ background: "#FF6B2B" }}
              />
              <span className="font-semibold text-white text-sm">AppCrafter Studio</span>
            </Link>

            <nav className="hidden md:flex items-center gap-8">
              {navItems.map((item) => (
                <Link
                  key={item.label}
                  href={item.href}
                  className="text-sm transition-colors duration-200 text-[#A1A1AA] hover:text-white"
                >
                  {item.label}
                </Link>
              ))}
            </nav>

            <button
              className="md:hidden flex flex-col gap-1.5 items-center justify-center w-11 h-11"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle menu"
            >
              <span
                className={`w-5 h-0.5 bg-white origin-center transition-all duration-200 ${
                  mobileMenuOpen ? "rotate-45 translate-y-2" : ""
                }`}
              />
              <span
                className={`w-5 h-0.5 bg-white transition-all duration-200 ${
                  mobileMenuOpen ? "opacity-0" : ""
                }`}
              />
              <span
                className={`w-5 h-0.5 bg-white origin-center transition-all duration-200 ${
                  mobileMenuOpen ? "-rotate-45 -translate-y-2" : ""
                }`}
              />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile menu overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 flex flex-col px-8 pt-24"
          style={{ background: "#080808" }}
        >
          <nav className="flex flex-col gap-8">
            {navItems.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className="text-3xl font-bold text-white"
                onClick={() => setMobileMenuOpen(false)}
              >
                {item.label}
              </Link>
            ))}
            <Link
              href="/contact"
              className="text-3xl font-bold"
              style={{ color: "#FF6B2B" }}
              onClick={() => setMobileMenuOpen(false)}
            >
              Get in touch
            </Link>
          </nav>
        </div>
      )}
    </>
  )
}
