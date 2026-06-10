"use client"

import { useState } from "react"
import Link from "next/link"

type AppData = {
  name: string
  emoji: string
  description: string
  status: "Live" | "Coming Soon"
  gradient: string
  href: string
}

const apps: AppData[] = [
  {
    name: "ZippyTales",
    emoji: "📚",
    description:
      "AI-powered bedtime stories personalized for your child's name, age, and favorite themes.",
    status: "Live",
    gradient: "linear-gradient(135deg, #4C1D95 0%, #7C3AED 40%, #EC4899 100%)",
    href: "https://zippytales.app",
  },
  {
    name: "Math Workbook",
    emoji: "🔢",
    description:
      "Personalized math practice that adapts to your child's pace and covers K-8 curriculum.",
    status: "Coming Soon",
    gradient: "linear-gradient(135deg, #1E3A5F 0%, #1D4ED8 40%, #06B6D4 100%)",
    href: "#",
  },
  {
    name: "Wealth Tracker",
    emoji: "📈",
    description:
      "Track your net worth, investments, and monthly cash flow in one private dashboard.",
    status: "Coming Soon",
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
  const stars = [
    { x: "10%", y: "6%", s: 2.5, o: 0.9 },
    { x: "30%", y: "4%", s: 1.5, o: 0.7 },
    { x: "55%", y: "10%", s: 3,   o: 1   },
    { x: "75%", y: "6%", s: 2,   o: 0.8 },
    { x: "88%", y: "20%", s: 1.5, o: 0.6 },
    { x: "20%", y: "25%", s: 2,   o: 0.7 },
    { x: "65%", y: "28%", s: 1.5, o: 0.9 },
    { x: "42%", y: "16%", s: 1.5, o: 0.5 },
    { x: "4%",  y: "40%", s: 2,   o: 0.6 },
    { x: "93%", y: "42%", s: 1.5, o: 0.7 },
  ]

  return (
    <div className="relative w-full h-full overflow-hidden">
      {stars.map(({ x, y, s, o }, i) => (
        <span
          key={i}
          className="absolute rounded-full animate-pulse"
          style={{
            left: x, top: y, width: s, height: s,
            background: i % 4 === 0 ? "#FDE68A" : "#fff",
            opacity: o,
            animationDuration: `${1.8 + (i % 5) * 0.4}s`,
            animationDelay: `${(i % 7) * 0.25}s`,
          }}
        />
      ))}

      {/* Crescent moon */}
      <svg className="absolute" style={{ top: "4%", right: "12%" }} width="34" height="34" viewBox="0 0 34 34">
        <defs>
          <mask id="zt-moon">
            <rect width="34" height="34" fill="white" />
            <circle cx="22" cy="10" r="13" fill="black" />
          </mask>
        </defs>
        <circle cx="17" cy="17" r="14" fill="#FDE68A" opacity="0.9" mask="url(#zt-moon)" />
      </svg>

      {/* Open book */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 flex justify-center">
        <svg width="120" height="72" viewBox="0 0 120 72" fill="none">
          <ellipse cx="60" cy="69" rx="40" ry="5" fill="rgba(255,255,255,0.07)" />
          <path d="M60 14 C46 11 20 13 12 16 L12 62 C20 59 46 57 60 60 Z"
            fill="rgba(255,255,255,0.15)" stroke="rgba(255,255,255,0.3)" strokeWidth="1" />
          <path d="M60 14 C74 11 100 13 108 16 L108 62 C100 59 74 57 60 60 Z"
            fill="rgba(255,255,255,0.15)" stroke="rgba(255,255,255,0.3)" strokeWidth="1" />
          <line x1="60" y1="14" x2="60" y2="60" stroke="rgba(255,255,255,0.45)" strokeWidth="1.5" />
          <line x1="24" y1="28" x2="52" y2="27" stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
          <line x1="23" y1="36" x2="51" y2="35" stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
          <line x1="24" y1="44" x2="50" y2="43" stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
          <line x1="68" y1="28" x2="96" y2="27" stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
          <line x1="69" y1="36" x2="97" y2="35" stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
          <line x1="70" y1="44" x2="96" y2="43" stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
        </svg>
      </div>

      {/* Floating sparkles */}
      {[
        { x: "12%", y: "55%", delay: "0s",   dur: "2s",   size: 12 },
        { x: "80%", y: "50%", delay: "0.7s", dur: "2.5s", size: 10 },
        { x: "58%", y: "62%", delay: "1.2s", dur: "3s",   size: 8  },
      ].map(({ x, y, delay, dur, size }, i) => (
        <svg key={i} className="absolute animate-pulse"
          style={{ left: x, top: y, animationDelay: delay, animationDuration: dur }}
          width={size} height={size} viewBox="0 0 12 12"
        >
          <path d="M6 0 L7 5 L12 6 L7 7 L6 12 L5 7 L0 6 L5 5 Z" fill="#FDE68A" opacity="0.85" />
        </svg>
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
  const isClickable = app.href !== "#"
  const cardClassName = `flex flex-col rounded-2xl overflow-hidden transition-all duration-200 ease-out border border-white/[0.08] aspect-[3/4] min-h-[420px] max-h-[520px] ${
    isClickable
      ? "cursor-pointer hover:scale-[1.02] hover:border-white/[0.16]"
      : "cursor-default"
  }`

  const content = (
    <>
      {/* Header */}
      <div className="flex items-center justify-between p-5">
        <div className="flex items-center gap-3 min-w-0">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0"
            style={{ background: "rgba(255,255,255,0.15)", backdropFilter: "blur(8px)" }}
          >
            {app.emoji}
          </div>
          <div className="flex items-center gap-2 min-w-0 flex-wrap">
            <span className="text-white font-semibold text-lg">{app.name}</span>
            {app.status === "Coming Soon" && (
              <span
                className="rounded-full px-2 py-0.5 text-xs font-medium shrink-0"
                style={{
                  background: "rgba(255,255,255,0.12)",
                  color: "rgba(255,255,255,0.7)",
                }}
              >
                Coming Soon
              </span>
            )}
          </div>
        </div>
        <span
          className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm shrink-0"
          style={{ background: "rgba(255,255,255,0.15)" }}
          aria-hidden="true"
        >
          →
        </span>
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
      <div className="flex-1 p-5 min-h-0">
        {app.name === "ZippyTales" && <ZippyTalesPreview />}
        {app.name === "Math Workbook" && <MathWorkbookPreview />}
        {app.name === "Wealth Tracker" && <WealthTrackerPreview />}
      </div>
    </>
  )

  if (!isClickable) {
    return (
      <div className={cardClassName} style={{ background: app.gradient }}>
        {content}
      </div>
    )
  }

  if (app.href.startsWith("http")) {
    return (
      <a
        href={app.href}
        target="_blank"
        rel="noopener noreferrer"
        className={cardClassName}
        style={{ background: app.gradient }}
      >
        {content}
      </a>
    )
  }

  return (
    <Link href={app.href} className={cardClassName} style={{ background: app.gradient }}>
      {content}
    </Link>
  )
}

export function HomePage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

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
        className="flex items-center justify-center text-center px-6 sm:px-8 overflow-hidden pt-20 pb-2"
        style={{
          background:
            "radial-gradient(ellipse 80% 50% at 50% -10%, rgba(255,107,43,0.12) 0%, transparent 60%)",
        }}
      >
        <div className="max-w-3xl w-full">
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
            A portfolio of focused apps designed to solve real problems — for
            families, learners, and builders.
          </p>

          {/* Section separator */}
          <div className="flex justify-center mt-8">
            <div
              className="h-px w-16 rounded-full"
              style={{
                background:
                  "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.2) 50%, transparent 100%)",
              }}
              aria-hidden="true"
            />
          </div>
        </div>
      </section>

      {/* ── APPS SHOWCASE ── */}
      <section id="apps" className="pt-4 pb-16 px-4">
        <div className="max-w-7xl mx-auto">
          {/* Apps grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 lg:gap-6">
            {apps.map((app) => (
              <AppCard key={app.name} app={app} />
            ))}
          </div>

          <div className="flex justify-center mt-10">
            <a
              href="#"
              className="rounded-full px-7 py-3 font-medium text-white transition-all duration-200 ease-out hover:bg-white/10 min-h-[44px] flex items-center justify-center gap-2 border border-white/30"
            >
              <GitHubIcon />
              View on GitHub
            </a>
          </div>
        </div>
      </section>

      {/* ── SKILLS — remove `hidden` when section is ready to publish ── */}
      <section
        id="skills"
        className="hidden py-20 px-4 border-t border-white/[0.06]"
      >
        <div className="max-w-7xl mx-auto">
          <div className="mb-6">
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

          {/* Placeholder skill cards — remove `hidden` when skills are published */}
          <div className="hidden grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 opacity-50">
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

          <p className="text-center text-sm" style={{ color: "#71717A" }}>
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
                {["Apps", "Skills", "About"].map((item) => (
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
