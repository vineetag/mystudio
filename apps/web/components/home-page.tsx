import Link from "next/link"

import { SiteNav } from "@/components/site-nav"
import { SiteFooter } from "@/components/site-footer"

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
      "AI-powered bedtime stories sparked by your child's favorite themes and imagination.",
    status: "Live",
    gradient: "linear-gradient(135deg, #4C1D95 0%, #7C3AED 40%, #EC4899 100%)",
    href: "https://zippytales.app",
  },
  {
    name: "Math Workbook",
    emoji: "🔢",
    description:
      "Personalized math practice that adapts to your child's pace.",
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
  const symbols = [
    { x: "4%",  y: "6%",  text: "E=mc²", size: "0.68rem", opacity: 0.85 },
    { x: "62%", y: "3%",  text: "∫ dx",  size: "0.72rem", opacity: 0.70 },
    { x: "80%", y: "20%", text: "∑",     size: "1.05rem", opacity: 0.80 },
    { x: "3%",  y: "46%", text: "π",     size: "1.15rem", opacity: 0.82 },
    { x: "83%", y: "50%", text: "Δ",     size: "0.95rem", opacity: 0.62 },
    { x: "10%", y: "70%", text: "∞",     size: "0.95rem", opacity: 0.68 },
    { x: "73%", y: "73%", text: "√2",    size: "0.72rem", opacity: 0.78 },
    { x: "44%", y: "82%", text: "λ",     size: "0.88rem", opacity: 0.58 },
  ]

  return (
    <div className="relative w-full h-full overflow-hidden">
      {symbols.map(({ x, y, text, size, opacity }, i) => (
        <span
          key={i}
          className="absolute font-mono font-semibold animate-pulse select-none"
          style={{
            left: x, top: y,
            fontSize: size,
            color: `rgba(255,255,255,${opacity})`,
            animationDuration: `${2 + (i % 4) * 0.6}s`,
            animationDelay: `${(i % 5) * 0.35}s`,
          }}
        >
          {text}
        </span>
      ))}

      {/* Central atom */}
      <svg
        className="absolute"
        style={{ top: "50%", left: "50%", transform: "translate(-50%, -54%)" }}
        width="96" height="96" viewBox="0 0 96 96"
        aria-hidden="true"
      >
        <circle cx="48" cy="48" r="6.5" fill="rgba(255,255,255,0.92)" />
        <ellipse cx="48" cy="48" rx="40" ry="15" fill="none"
          stroke="rgba(255,255,255,0.22)" strokeWidth="1.3" />
        <ellipse cx="48" cy="48" rx="40" ry="15" fill="none"
          stroke="rgba(255,255,255,0.22)" strokeWidth="1.3"
          transform="rotate(60 48 48)" />
        <ellipse cx="48" cy="48" rx="40" ry="15" fill="none"
          stroke="rgba(255,255,255,0.22)" strokeWidth="1.3"
          transform="rotate(120 48 48)" />
        <circle cx="88" cy="48" r="3.8" fill="#22D3EE" opacity="0.9" />
        <circle cx="28" cy="23" r="3.8" fill="#818CF8" opacity="0.9" />
        <circle cx="28" cy="73" r="3.8" fill="#34D399" opacity="0.9" />
      </svg>

      {/* Periodic-table tile */}
      <div
        className="absolute bottom-2 right-3 rounded text-center select-none"
        style={{
          width: 34, height: 36,
          background: "rgba(255,255,255,0.11)",
          border: "1px solid rgba(255,255,255,0.20)",
        }}
        aria-hidden="true"
      >
        <p className="text-white font-bold" style={{ fontSize: "0.6rem", lineHeight: 1.3, marginTop: 3 }}>6</p>
        <p className="text-white font-bold" style={{ fontSize: "0.9rem", lineHeight: 1 }}>C</p>
        <p style={{ fontSize: "0.42rem", color: "rgba(255,255,255,0.55)", lineHeight: 1.3 }}>Carbon</p>
      </div>
    </div>
  )
}

function WealthTrackerPreview() {
  const symbols = [
    { x: "4%",  y: "6%",  text: "+12.4%", size: "0.65rem", opacity: 0.85 },
    { x: "68%", y: "4%",  text: "$",      size: "1.15rem", opacity: 0.72 },
    { x: "82%", y: "20%", text: "↗",      size: "1.1rem",  opacity: 0.80 },
    { x: "3%",  y: "47%", text: "APY",    size: "0.65rem", opacity: 0.75 },
    { x: "84%", y: "52%", text: "%",      size: "1.0rem",  opacity: 0.60 },
    { x: "8%",  y: "70%", text: "yield",  size: "0.60rem", opacity: 0.65 },
    { x: "74%", y: "74%", text: "∑",      size: "0.85rem", opacity: 0.72 },
    { x: "42%", y: "84%", text: "×1.8",   size: "0.65rem", opacity: 0.55 },
  ]

  const r = 28, cx = 48, cy = 48
  const circ = 2 * Math.PI * r
  const segments = [
    { pct: 0.55, color: "#34D399", label: "Stocks", deg: -90 },
    { pct: 0.30, color: "#22D3EE", label: "Bonds",  deg: -90 + 0.55 * 360 },
    { pct: 0.15, color: "#FBB724", label: "Cash",   deg: -90 + 0.85 * 360 },
  ]

  return (
    <div className="relative w-full h-full overflow-hidden">
      {symbols.map(({ x, y, text, size, opacity }, i) => (
        <span
          key={i}
          className="absolute font-mono font-semibold animate-pulse select-none"
          style={{
            left: x, top: y,
            fontSize: size,
            color: `rgba(255,255,255,${opacity})`,
            animationDuration: `${2 + (i % 4) * 0.6}s`,
            animationDelay: `${(i % 5) * 0.35}s`,
          }}
        >
          {text}
        </span>
      ))}

      {/* Portfolio donut chart */}
      <svg
        className="absolute"
        style={{ top: "50%", left: "50%", transform: "translate(-50%, -54%)" }}
        width="96" height="96" viewBox="0 0 96 96"
        aria-hidden="true"
      >
        <circle cx={cx} cy={cy} r={r} fill="none"
          stroke="rgba(255,255,255,0.08)" strokeWidth="8" />
        {segments.map(({ pct, color, label, deg }) => (
          <circle key={label} cx={cx} cy={cy} r={r} fill="none"
            stroke={color} strokeWidth="8" strokeLinecap="butt"
            strokeDasharray={`${(circ * pct).toFixed(2)} ${(circ * (1 - pct)).toFixed(2)}`}
            transform={`rotate(${deg} ${cx} ${cy})`} />
        ))}
        <text x={cx} y={cy - 3} textAnchor="middle"
          fill="white" fontSize="8" fontWeight="bold" fontFamily="monospace">NET</text>
        <text x={cx} y={cy + 7} textAnchor="middle"
          fill="rgba(255,255,255,0.65)" fontSize="6.5" fontFamily="monospace">WORTH</text>
      </svg>

      {/* Mini legend */}
      <div className="absolute bottom-2 left-3 flex flex-col gap-0.5 select-none" aria-hidden="true">
        {segments.map(({ label, color, pct }) => (
          <div key={label} className="flex items-center gap-1">
            <span className="rounded-full shrink-0" style={{ width: 5, height: 5, background: color }} />
            <span style={{ fontSize: "0.42rem", color: "rgba(255,255,255,0.62)" }}>
              {label} {Math.round(pct * 100)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

function AppCard({ app }: { app: AppData }) {
  const isClickable = app.href !== "#"
  const isLive = app.status === "Live"
  const cardClassName = `flex flex-col rounded-2xl overflow-hidden transition-all duration-200 ease-out aspect-[3/4] min-h-[420px] max-h-[520px] ${
    isLive ? "border-2 border-white/[0.22]" : "border border-white/[0.08]"
  } ${
    isClickable
      ? "cursor-pointer hover:scale-[1.02] hover:border-white/[0.3]"
      : "cursor-default"
  }`
  const cardStyle = {
    background: app.gradient,
    ...(isLive
      ? { boxShadow: "0 0 0 1px rgba(255,255,255,0.06), 0 20px 50px -12px rgba(236,72,153,0.45)" }
      : {}),
  }

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
            {app.status === "Live" && (
              <span
                className="rounded-full px-2.5 py-0.5 text-xs font-semibold shrink-0 flex items-center gap-1.5 uppercase tracking-wide"
                style={{
                  background: "rgba(52,211,153,0.18)",
                  color: "#34D399",
                  border: "1px solid rgba(52,211,153,0.4)",
                }}
              >
                <span className="relative flex shrink-0" style={{ width: 7, height: 7 }}>
                  <span
                    className="absolute inline-flex h-full w-full rounded-full animate-ping"
                    style={{ background: "#34D399", opacity: 0.75 }}
                  />
                  <span
                    className="relative inline-flex rounded-full"
                    style={{ width: 7, height: 7, background: "#34D399" }}
                  />
                </span>
                Live
              </span>
            )}
            {app.status === "Coming Soon" && (
              <span
                className="rounded-full px-2.5 py-0.5 text-xs font-semibold shrink-0 flex items-center gap-1.5"
                style={{
                  background: "rgba(251,191,36,0.18)",
                  color: "#FBB724",
                  border: "1px solid rgba(251,191,36,0.35)",
                }}
              >
                <span
                  className="rounded-full animate-pulse shrink-0"
                  style={{ width: 5, height: 5, background: "#FBB724" }}
                />
                Coming Soon
              </span>
            )}
          </div>
        </div>
        <span
          className="w-8 h-8 rounded-lg flex items-center justify-center text-sm shrink-0"
          style={
            isLive
              ? { background: "#ffffff", color: "#7C3AED", fontWeight: 700 }
              : { background: "rgba(255,255,255,0.15)", color: "#ffffff" }
          }
          aria-hidden="true"
        >
          →
        </span>
      </div>

      {/* Description */}
      <div className="px-5 pb-4">
        <p
          className="text-sm leading-relaxed line-clamp-2 min-h-[2.875rem]"
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
      <div className={cardClassName} style={cardStyle}>
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
        style={cardStyle}
      >
        {content}
      </a>
    )
  }

  return (
    <Link href={app.href} className={cardClassName} style={cardStyle}>
      {content}
    </Link>
  )
}

export function HomePage() {
  return (
    <div style={{ background: "#080808", color: "#ffffff", minHeight: "100vh" }}>

      <SiteNav />

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
              href="https://github.com/vineetag/mystudio"
              target="_blank"
              rel="noopener noreferrer"
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
          <div className="max-w-2xl mx-auto text-center">
            <div>
              <p
                className="text-xs tracking-widest font-semibold uppercase mb-5"
                style={{ color: "#71717A" }}
              >
                The Builder
              </p>
              <p
                className="text-lg leading-relaxed mb-4"
                style={{ color: "rgba(255,255,255,0.8)" }}
              >
                I&apos;m Vineet — a product person who gets ideas stuck in my head and
                builds them to get them out. AppCrafter Studio is my little lab for that.
                I prototype fast, ship early, and figure out what&apos;s actually useful
                from there.
              </p>
              <p
                className="text-lg leading-relaxed mb-6"
                style={{ color: "rgba(255,255,255,0.8)" }}
              >
                The whole codebase is open source because I think ideas go further when
                more people can run with them. If something here gives you a starting
                point for your own thing, that&apos;s great. And if you want to take any
                of these ideas further together, I&apos;m open to it — just reach out.
              </p>
              <Link
                href="/about"
                className="font-medium transition-opacity duration-200 hover:opacity-75 hover:underline"
                style={{ color: "#FF6B2B" }}
              >
                Read the full story →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <SiteFooter />
    </div>
  )
}
