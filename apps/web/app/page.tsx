"use client"

import { useState } from "react"
import Link from "next/link"

type Category = "All" | "Kids" | "Education" | "Finance"

const CATEGORIES: Category[] = ["All", "Kids", "Education", "Finance"]

type AppData = {
  name: string
  emoji: string
  description: string
  category: Category
  status: "Live" | "Coming Soon"
  tags: string[]
  gradient: string
  href: string
}

const apps: AppData[] = [
  {
    name: "ZippyTales",
    emoji: "📚",
    description:
      "AI-powered bedtime stories personalized for your child's name, age, and favorite themes.",
    category: "Kids",
    status: "Live",
    tags: ["Kids", "AI"],
    gradient: "linear-gradient(135deg, #4C1D95 0%, #7C3AED 40%, #EC4899 100%)",
    href: "https://zippytales.app",
  },
  {
    name: "Math Workbook",
    emoji: "🔢",
    description:
      "Personalized math practice that adapts to your child's pace and covers K-8 curriculum.",
    category: "Education",
    status: "Coming Soon",
    tags: ["Education", "AI"],
    gradient: "linear-gradient(135deg, #1E3A5F 0%, #1D4ED8 40%, #06B6D4 100%)",
    href: "#",
  },
  {
    name: "Wealth Tracker",
    emoji: "📈",
    description:
      "Track your net worth, investments, and monthly cash flow in one private dashboard.",
    category: "Finance",
    status: "Coming Soon",
    tags: ["Finance"],
    gradient: "linear-gradient(135deg, #064E3B 0%, #059669 40%, #34D399 100%)",
    href: "#",
  },
]

function GitHubIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current" aria-hidden="true">
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
    </svg>
  )
}

function ZippyTalesPreview() {
  return (
    <div className="flex gap-2 items-end h-full">
      {[
        { height: 120, bg: "rgba(167,139,250,0.45)" },
        { height: 145, bg: "rgba(236,72,153,0.45)" },
        { height: 100, bg: "rgba(139,92,246,0.40)" },
      ].map((card, i) => (
        <div
          key={i}
          className="flex-1 flex flex-col rounded-xl overflow-hidden"
          style={{ height: card.height }}
        >
          <div className="flex-1 rounded-t-xl" style={{ background: card.bg }} />
          <div className="p-2" style={{ background: "rgba(255,255,255,0.12)" }}>
            <div
              className="h-2 rounded-full mb-1"
              style={{ background: "rgba(255,255,255,0.5)", width: "100%" }}
            />
            <div
              className="h-2 rounded-full"
              style={{ background: "rgba(255,255,255,0.25)", width: "70%" }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}

function MathWorkbookPreview() {
  return (
    <div className="flex flex-col items-center justify-between h-full">
      <p className="text-white font-bold" style={{ fontSize: "2.25rem", lineHeight: 1 }}>
        4 × 7 = ?
      </p>
      <div className="flex gap-2 flex-wrap justify-center">
        {["28", "35", "42", "49"].map((ans, i) => (
          <div
            key={ans}
            className="rounded-full text-sm font-medium px-4 py-2"
            style={{
              background: i === 2 ? "rgba(255,255,255,0.30)" : "rgba(255,255,255,0.10)",
              color: i === 2 ? "#fff" : "rgba(255,255,255,0.60)",
            }}
          >
            {ans}
          </div>
        ))}
      </div>
      <div className="w-full">
        <div
          className="flex justify-between mb-1.5 text-xs"
          style={{ color: "rgba(255,255,255,0.5)" }}
        >
          <span>Progress</span>
          <span>60%</span>
        </div>
        <div
          className="h-1.5 rounded-full w-full"
          style={{ background: "rgba(255,255,255,0.12)" }}
        >
          <div className="h-full rounded-full" style={{ width: "60%", background: "#22D3EE" }} />
        </div>
      </div>
    </div>
  )
}

function WealthTrackerPreview() {
  const pts = [30, 45, 35, 55, 48, 65, 58, 72, 68, 80]
  const max = Math.max(...pts)
  const W = 240
  const H = 70
  const coords = pts.map((p, i) => ({
    x: (i / (pts.length - 1)) * W,
    y: H - (p / max) * H * 0.85,
  }))
  const line = coords.map((c, i) => `${i === 0 ? "M" : "L"} ${c.x.toFixed(1)} ${c.y.toFixed(1)}`).join(" ")
  const area = `${line} L ${W} ${H} L 0 ${H} Z`

  return (
    <div className="flex flex-col justify-between h-full">
      <div className="rounded-lg overflow-hidden" style={{ height: 80 }}>
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full" preserveAspectRatio="none">
          <defs>
            <linearGradient id="wgrd" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#34D399" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#34D399" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={area} fill="url(#wgrd)" />
          <path
            d={line}
            fill="none"
            stroke="#34D399"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
      <div className="flex gap-3">
        {[
          { value: "$124,500", label: "Portfolio Value", color: "#ffffff" },
          { value: "+4.2%", label: "Monthly Change", color: "#34D399" },
        ].map(({ value, label, color }) => (
          <div
            key={label}
            className="flex-1 rounded-xl p-3"
            style={{ background: "rgba(255,255,255,0.10)" }}
          >
            <p className="font-bold text-base" style={{ color }}>
              {value}
            </p>
            <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.5)" }}>
              {label}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}

function AppCard({ app }: { app: AppData }) {
  return (
    <div
      className="rounded-2xl overflow-hidden transition-all duration-200 ease-out hover:scale-[1.02] cursor-pointer border border-white/[0.08] hover:border-white/[0.16]"
      style={{ background: app.gradient, minHeight: 380 }}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-5">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0"
            style={{ background: "rgba(255,255,255,0.15)", backdropFilter: "blur(8px)" }}
          >
            {app.emoji}
          </div>
          <span className="text-white font-semibold text-lg">{app.name}</span>
        </div>
        <Link
          href={app.href}
          className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm transition-colors duration-200 hover:bg-white/20 shrink-0"
          style={{ background: "rgba(255,255,255,0.15)" }}
          onClick={(e) => app.href === "#" && e.preventDefault()}
        >
          →
        </Link>
      </div>

      {/* Description */}
      <div className="px-5 pb-4">
        <p
          className="text-sm leading-relaxed line-clamp-2"
          style={{ color: "rgba(255,255,255,0.8)" }}
        >
          {app.description}
        </p>
      </div>

      {/* Divider */}
      <div style={{ height: 1, background: "rgba(255,255,255,0.10)" }} />

      {/* Preview */}
      <div className="p-5" style={{ height: 200 }}>
        {app.name === "ZippyTales" && <ZippyTalesPreview />}
        {app.name === "Math Workbook" && <MathWorkbookPreview />}
        {app.name === "Wealth Tracker" && <WealthTrackerPreview />}
      </div>

      {/* Footer */}
      <div className="flex items-center gap-2 px-5 pb-5 flex-wrap">
        <div
          className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs text-white"
          style={{ background: "rgba(255,255,255,0.10)" }}
        >
          <span
            className="w-1.5 h-1.5 rounded-full shrink-0"
            style={{ background: app.status === "Live" ? "#4ADE80" : "#FCD34D" }}
          />
          {app.status}
        </div>
        {app.tags.map((tag) => (
          <div
            key={tag}
            className="rounded-full px-2.5 py-1 text-xs"
            style={{ background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.6)" }}
          >
            {tag}
          </div>
        ))}
      </div>
    </div>
  )
}

export default function HomePage() {
  const [activeCategory, setActiveCategory] = useState<Category>("All")
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const filteredApps =
    activeCategory === "All" ? apps : apps.filter((a) => a.category === activeCategory)

  return (
    <div style={{ background: "#080808", color: "#ffffff", minHeight: "100vh" }}>

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
              {(["Apps", "Skills", "About"] as const).map((item) => (
                <Link
                  key={item}
                  href={`#${item.toLowerCase()}`}
                  className="text-sm transition-colors duration-200 text-[#A1A1AA] hover:text-white"
                >
                  {item}
                </Link>
              ))}
              <Link
                href="mailto:vineet140@gmail.com"
                className="rounded-full px-4 py-2 text-sm font-medium transition-all duration-200 border border-white/30 text-white hover:bg-white hover:text-black min-h-[44px] flex items-center"
              >
                Get in touch
              </Link>
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
            {(["Apps", "Skills", "About"] as const).map((item) => (
              <Link
                key={item}
                href={`#${item.toLowerCase()}`}
                className="text-3xl font-bold text-white"
                onClick={() => setMobileMenuOpen(false)}
              >
                {item}
              </Link>
            ))}
            <a
              href="mailto:vineet140@gmail.com"
              className="text-3xl font-bold"
              style={{ color: "#FF6B2B" }}
              onClick={() => setMobileMenuOpen(false)}
            >
              Get in touch
            </a>
          </nav>
        </div>
      )}

      {/* ── HERO ── */}
      <section
        className="flex items-center justify-center text-center px-6 sm:px-8 overflow-hidden"
        style={{
          minHeight: "80vh",
          background:
            "radial-gradient(ellipse 80% 50% at 50% -10%, rgba(255,107,43,0.12) 0%, transparent 60%)",
        }}
      >
        <div className="max-w-3xl w-full">
          {/* Badge */}
          <div
            className="inline-flex items-center rounded-full px-3 py-1 mb-8 text-sm"
            style={{
              border: "1px solid rgba(255,255,255,0.12)",
              background: "rgba(255,255,255,0.06)",
              color: "#A1A1AA",
            }}
          >
            ✦ Independent App Studio
          </div>

          {/* Headline */}
          <h1
            className="font-bold tracking-tight mb-6 break-words"
            style={{ fontSize: "clamp(1.875rem, 7vw, 4.5rem)", lineHeight: 1.08 }}
          >
            Apps built with
            <br />
            <span
              style={{
                color: "#FF6B2B",
                textShadow: "0 0 40px rgba(255,107,43,0.4)",
              }}
            >
              craft
            </span>{" "}
            and intention.
          </h1>

          {/* Subheading */}
          <p
            className="max-w-xl mx-auto text-lg leading-relaxed mb-10"
            style={{ color: "#A1A1AA" }}
          >
            One person. A portfolio of focused apps designed to solve real problems — for
            families, learners, and builders.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="#apps"
              className="rounded-full px-7 py-3 font-semibold text-black bg-white transition-transform duration-200 ease-out hover:scale-105 min-h-[44px] flex items-center justify-center"
            >
              Explore Apps
            </Link>
            <a
              href="#"
              className="rounded-full px-7 py-3 font-medium text-white transition-all duration-200 ease-out hover:bg-white/10 min-h-[44px] flex items-center justify-center gap-2 border border-white/30"
            >
              <GitHubIcon />
              View on GitHub
            </a>
          </div>

          {/* Scroll indicator */}
          <div className="flex justify-center gap-2 mt-16">
            {[0, 150, 300].map((delay) => (
              <span
                key={delay}
                className="w-1.5 h-1.5 rounded-full animate-pulse"
                style={{ background: "#FF6B2B", animationDelay: `${delay}ms` }}
              />
            ))}
          </div>
        </div>
      </section>

      {/* ── APPS SHOWCASE ── */}
      <section id="apps" className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="mb-10">
            <p
              className="text-xs tracking-widest font-semibold uppercase mb-3"
              style={{ color: "#71717A" }}
            >
              Portfolio
            </p>
            <h2 className="text-4xl font-bold text-white mb-3">What I&apos;ve built</h2>
            <p style={{ color: "#A1A1AA" }}>Each app is focused on one job, done well.</p>
          </div>

          {/* Category filter */}
          <div className="flex flex-wrap gap-2 mb-8">
            {CATEGORIES.map((cat) => {
              const isActive = activeCategory === cat
              return (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`rounded-full px-4 py-2 text-sm font-medium transition-all duration-200 ease-out min-h-[44px] border ${
                    isActive
                      ? "bg-[#1A1A1A] text-white border-white/[0.15]"
                      : "bg-transparent text-[#71717A] border-white/[0.08] hover:text-white"
                  }`}
                >
                  {cat}
                </button>
              )
            })}
          </div>

          {/* Apps grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {filteredApps.map((app) => (
              <AppCard key={app.name} app={app} />
            ))}
          </div>
        </div>
      </section>

      {/* ── PHILOSOPHY ── */}
      <section
        className="py-20 px-4"
        style={{
          background: "#0D0D0D",
          borderTop: "1px solid rgba(255,255,255,0.06)",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-start">
            <h2
              className="font-bold text-white"
              style={{ fontSize: "clamp(2rem, 4vw, 3rem)", lineHeight: 1.15 }}
            >
              <span className="block">Small team.</span>
              <span className="block">Focused scope.</span>
              <span className="block">No feature bloat.</span>
            </h2>
            <div className="flex flex-col gap-6">
              {[
                "Every app solves one problem well before solving ten poorly.",
                "Shipped beats perfect. Real users beat imagined ones.",
                "Privacy by default. Collect only what's needed.",
              ].map((principle) => (
                <div key={principle} className="flex gap-3 items-start">
                  <span
                    className="w-2 h-2 rounded-full mt-2 shrink-0"
                    style={{ background: "#FF6B2B" }}
                  />
                  <p style={{ color: "#A1A1AA", lineHeight: 1.65 }}>{principle}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── SKILLS ── */}
      <section id="skills" className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="mb-10">
            <p
              className="text-xs tracking-widest font-semibold uppercase mb-3"
              style={{ color: "#71717A" }}
            >
              Open Source
            </p>
            <h2 className="text-4xl font-bold text-white mb-3">Agent Skills</h2>
            <p style={{ color: "#A1A1AA" }}>
              Claude and Gemini skills published for anyone to use. Coming soon.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 opacity-50">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="rounded-2xl p-6"
                style={{
                  background: "#111111",
                  border: "1px solid rgba(255,255,255,0.08)",
                }}
              >
                <div
                  className="w-10 h-10 rounded-xl mb-5"
                  style={{ background: "rgba(255,255,255,0.06)" }}
                />
                <div
                  className="h-4 rounded-full mb-4"
                  style={{ background: "rgba(255,255,255,0.08)", width: 120 }}
                />
                <div className="flex flex-col gap-2 mb-5">
                  <div
                    className="h-3 rounded-full"
                    style={{ background: "rgba(255,255,255,0.06)", width: 180 }}
                  />
                  <div
                    className="h-3 rounded-full"
                    style={{ background: "rgba(255,255,255,0.06)", width: 140 }}
                  />
                </div>
                <p className="text-sm" style={{ color: "#71717A" }}>
                  Coming Soon
                </p>
              </div>
            ))}
          </div>

          <p className="text-center mt-10 text-sm" style={{ color: "#71717A" }}>
            Agent skills are in development.{" "}
            <a
              href="#"
              className="transition-opacity duration-200 hover:opacity-75"
              style={{ color: "#FF6B2B" }}
            >
              Follow along on GitHub
            </a>{" "}
            for updates.
          </p>
        </div>
      </section>

      {/* ── ABOUT ── */}
      <section
        id="about"
        className="py-20 px-4"
        style={{
          background:
            "linear-gradient(135deg, rgba(255,107,43,0.08) 0%, rgba(255,107,43,0.02) 100%)",
          borderTop: "1px solid rgba(255,107,43,0.15)",
          borderBottom: "1px solid rgba(255,107,43,0.15)",
        }}
      >
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div>
              <p
                className="text-xs tracking-widest font-semibold uppercase mb-5"
                style={{ color: "#71717A" }}
              >
                The Builder
              </p>
              <p
                className="text-lg leading-relaxed mb-6"
                style={{ color: "rgba(255,255,255,0.8)" }}
              >
                Built by Vineet, a product and technical program manager with 15+ years
                shipping software at scale. AppCrafter Studio is where I build the apps I
                wish existed.
              </p>
              <a
                href="#"
                className="font-medium transition-opacity duration-200 hover:opacity-75"
                style={{ color: "#FF6B2B" }}
              >
                Read my story →
              </a>
            </div>
            <div className="flex gap-12">
              {[
                { value: "3", label: "apps in portfolio" },
                { value: "1", label: "person building" },
              ].map(({ value, label }) => (
                <div key={label}>
                  <p
                    className="font-bold"
                    style={{ fontSize: "3.5rem", color: "#FF6B2B", lineHeight: 1 }}
                  >
                    {value}
                  </p>
                  <p className="mt-2 text-sm" style={{ color: "#A1A1AA" }}>
                    {label}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer
        className="py-14 px-4"
        style={{
          background: "#050505",
          borderTop: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10 mb-10">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span
                  className="w-3 h-3 rounded-[3px] shrink-0"
                  style={{ background: "#FF6B2B" }}
                />
                <span className="font-semibold text-white text-sm">AppCrafter Studio</span>
              </div>
              <p className="text-sm" style={{ color: "#71717A" }}>
                Apps built with craft and intention.
              </p>
            </div>
            <div>
              <p
                className="text-xs font-semibold text-white mb-4 uppercase tracking-wider"
              >
                Studio
              </p>
              <div className="flex flex-col gap-3">
                {["Apps", "Skills", "About", "Blog"].map((item) => (
                  <Link
                    key={item}
                    href={`#${item.toLowerCase()}`}
                    className="text-sm transition-colors duration-200 hover:text-white"
                    style={{ color: "#71717A" }}
                  >
                    {item}
                  </Link>
                ))}
              </div>
            </div>
            <div>
              <p
                className="text-xs font-semibold text-white mb-4 uppercase tracking-wider"
              >
                Legal
              </p>
              <div className="flex flex-col gap-3">
                <Link
                  href="/privacy"
                  className="text-sm transition-colors duration-200 hover:text-white"
                  style={{ color: "#71717A" }}
                >
                  Privacy Policy
                </Link>
                <a
                  href="mailto:vineet140@gmail.com"
                  className="text-sm transition-colors duration-200 hover:text-white"
                  style={{ color: "#71717A" }}
                >
                  Contact
                </a>
                <a
                  href="#"
                  className="text-sm transition-colors duration-200 hover:text-white"
                  style={{ color: "#71717A" }}
                >
                  GitHub
                </a>
              </div>
            </div>
          </div>
          <div
            className="pt-6 text-xs"
            style={{
              borderTop: "1px solid rgba(255,255,255,0.06)",
              color: "#71717A",
            }}
          >
            © 2026 AppCrafter Studio — Built with Next.js and Claude Code.
          </div>
        </div>
      </footer>
    </div>
  )
}
