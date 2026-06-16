import type { Metadata } from "next"

import { SiteNav } from "@/components/site-nav"
import { SiteFooter } from "@/components/site-footer"

const GITHUB_URL = "https://github.com/vineetag/mystudio"
const LINKEDIN_URL = "https://www.linkedin.com/in/vineetag"

export function generateMetadata(): Metadata {
  return {
    title: "About — AppCrafter Studio",
    description:
      "A product person who gets ideas stuck in their head and builds them to get them out.",
    alternates: {
      canonical: "https://appcrafter.studio/about",
    },
  }
}

const approach = [
  {
    icon: "🧪",
    title: "Prototype first",
    body: "Get something working as fast as possible. The version of an idea that lives only in your head is usually missing something important.",
  },
  {
    icon: "🚀",
    title: "Ship early",
    body: "Put it in front of people before it feels ready. Real feedback from real users beats imagined feedback every time.",
  },
  {
    icon: "🔁",
    title: "Iterate honestly",
    body: "Not everything works out. That's fine. The useful stuff becomes obvious pretty quickly once it's actually in use.",
  },
]

const stack = [
  {
    icon: "⚡",
    name: "Next.js",
    desc: "Full-stack React with SSR, API routes, and App Router",
  },
  {
    icon: "🗄️",
    name: "Supabase",
    desc: "Postgres, auth, and file storage as a service",
  },
  {
    icon: "🤖",
    name: "Claude AI",
    desc: "Anthropic API for all AI features, server-side only",
  },
  {
    icon: "🎨",
    name: "Tailwind + shadcn",
    desc: "Utility-first styling with copy-paste components",
  },
  {
    icon: "🚀",
    name: "Vercel",
    desc: "Every branch gets a preview URL. Main goes to production.",
  },
  {
    icon: "📊",
    name: "PostHog",
    desc: "Product analytics, session replay, and feature flags",
  },
]

const techPills = ["Next.js", "Supabase", "Claude AI"]

const eyebrowClass = "text-xs tracking-widest font-semibold uppercase"
const cardStyle = {
  background: "#111111",
  border: "1px solid rgba(255,255,255,0.08)",
}

export default function AboutPage() {
  return (
    <div style={{ background: "#080808", color: "#ffffff", minHeight: "100vh" }}>
      <SiteNav />

      {/* ── 1. PAGE HERO ── */}
      <section
        className="flex items-center justify-center text-center px-6 sm:px-8 overflow-hidden"
        style={{
          minHeight: "50vh",
          background:
            "radial-gradient(ellipse 60% 40% at 50% 0%, rgba(255,107,43,0.08) 0%, transparent 60%)",
        }}
      >
        <div className="max-w-3xl w-full py-16">
          <span
            className={`inline-block rounded-full px-3 py-1 mb-6 ${eyebrowClass}`}
            style={{
              color: "#A1A1AA",
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.10)",
            }}
          >
            The Builder
          </span>
          <h1 className="text-3xl md:text-5xl font-bold tracking-tight text-white">
            I get ideas stuck in my head.
            <br />
            Building them is the only way to get them out.
          </h1>
          <p
            className="max-w-lg mx-auto mt-6 text-lg leading-relaxed"
            style={{ color: "#A1A1AA" }}
          >
            A product person, a tinkerer, and an occasional over-builder of things that
            probably could have been a spreadsheet.
          </p>
        </div>
      </section>

      {/* ── 2. WHO I AM ── */}
      <section className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div className="relative">
              <span
                aria-hidden="true"
                className="absolute -top-10 -left-3 font-bold select-none pointer-events-none"
                style={{
                  fontSize: "9rem",
                  lineHeight: 1,
                  color: "#FF6B2B",
                  opacity: 0.1,
                }}
              >
                V
              </span>
              <p
                className="relative text-lg leading-relaxed"
                style={{ color: "rgba(255,255,255,0.8)" }}
              >
                I&apos;ve spent a good chunk of my career in product and program
                management — helping teams figure out what to build and then actually
                shipping it. On the side, I&apos;ve always been the person tinkering with
                ideas and wishing certain apps existed. AppCrafter Studio is just me
                finally doing something about that.
              </p>
            </div>

            <div>
              <div className="rounded-2xl p-8" style={cardStyle}>
                <p
                  className="font-bold"
                  style={{ fontSize: "3rem", color: "#FF6B2B", lineHeight: 1 }}
                >
                  15+
                </p>
                <p className="mt-2 text-sm" style={{ color: "#A1A1AA" }}>
                  years in product &amp; program management
                </p>
              </div>
              <div className="flex flex-wrap gap-2 mt-4">
                {techPills.map((pill) => (
                  <span
                    key={pill}
                    className="rounded-full px-3 py-1 text-xs"
                    style={{
                      background: "rgba(255,255,255,0.06)",
                      color: "rgba(255,255,255,0.6)",
                    }}
                  >
                    {pill}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 3. HOW I LIKE TO WORK ── */}
      <section
        className="py-20 px-4"
        style={{
          background: "#0D0D0D",
          borderTop: "1px solid rgba(255,255,255,0.06)",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <div className="max-w-7xl mx-auto">
          <p className={eyebrowClass} style={{ color: "#71717A" }}>
            The Approach
          </p>
          <h2 className="mt-3 mb-10 text-4xl font-bold text-white">
            Ship early. Learn faster.
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {approach.map((item) => (
              <div key={item.title} className="rounded-2xl p-7" style={cardStyle}>
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-xl mb-5"
                  style={{ background: "rgba(255,107,43,0.15)" }}
                  aria-hidden="true"
                >
                  {item.icon}
                </div>
                <h3 className="text-white font-semibold mb-2">{item.title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: "#A1A1AA" }}>
                  {item.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 4. WHY OPEN SOURCE ── */}
      <section className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-start">
            <div>
              <h2 className="text-3xl font-bold text-white max-w-sm">
                Ideas go further when more people can run with them.
              </h2>
              <div
                className="mt-6 space-y-4 text-base leading-relaxed"
                style={{ color: "#A1A1AA" }}
              >
                <p>
                  I could have kept this private. But if someone looks at how this is
                  built and thinks &ldquo;I could take this in a completely different
                  direction&rdquo; — that&apos;s a good thing.
                </p>
                <p>
                  Everything here is MIT licensed. Fork it, change what you want, build
                  something I never would have thought to build. The scaffold is already
                  there: auth, database, AI integration, CI/CD, the whole setup.
                  You&apos;re not starting from a blank file. You&apos;re starting from
                  something that already works.
                </p>
                <p>If you build something with it, I&apos;d love to hear about it.</p>
              </div>
            </div>

            <div>
              <div
                className="rounded-2xl p-6 overflow-x-auto"
                style={{
                  background: "#0A0A0A",
                  border: "1px solid rgba(255,255,255,0.08)",
                }}
              >
                <pre className="font-mono text-sm leading-relaxed whitespace-pre">
                  <code>
                    <span style={{ color: "#71717A" }}># Get started{"\n"}</span>
                    <span style={{ color: "#4ADE80" }}>${" "}</span>
                    <span className="text-white">
                      git clone github.com/vineetag/mystudio{"\n"}
                    </span>
                    <span style={{ color: "#4ADE80" }}>${" "}</span>
                    <span className="text-white">cd mystudio{"\n"}</span>
                    <span style={{ color: "#4ADE80" }}>${" "}</span>
                    <span className="text-white">pnpm install{"\n\n"}</span>
                    <span style={{ color: "#71717A" }}>
                      # Build something great{"\n"}
                    </span>
                    <span style={{ color: "#4ADE80" }}>${" "}</span>
                    <span className="text-white">pnpm dev</span>
                  </code>
                </pre>
              </div>
              <a
                href={GITHUB_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center mt-4 py-2 text-sm font-medium transition-opacity duration-200 hover:opacity-75"
                style={{ color: "#FF6B2B" }}
              >
                View on GitHub →
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ── 5. OPEN TO COLLABORATING ── */}
      <section
        className="py-20 px-4 text-center"
        style={{
          background: "linear-gradient(135deg, rgba(255,107,43,0.06), transparent)",
          borderTop: "1px solid rgba(255,107,43,0.12)",
          borderBottom: "1px solid rgba(255,107,43,0.12)",
        }}
      >
        <div className="max-w-2xl mx-auto">
          <h2 className="text-3xl font-bold text-white">
            Want to take any of this further?
          </h2>
          <p className="mt-4 text-lg leading-relaxed" style={{ color: "#A1A1AA" }}>
            If any of the apps here spark ideas for you — features you&apos;d want to add,
            directions you&apos;d want to take things — feel free to reach out. Sometimes
            it&apos;s just a good conversation. Sometimes it&apos;s more. Either way, happy
            to talk.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center mt-8">
            <a
              href={LINKEDIN_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full px-7 py-3 font-medium bg-white text-black transition-all duration-200 ease-out hover:bg-white/90 min-h-[44px] flex items-center justify-center"
            >
              Say hi on LinkedIn
            </a>
            <a
              href={GITHUB_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full px-7 py-3 font-medium text-white transition-all duration-200 ease-out hover:bg-white/10 min-h-[44px] flex items-center justify-center border border-white/30"
            >
              View GitHub
            </a>
          </div>
        </div>
      </section>

      {/* ── 6. THE STACK ── */}
      <section className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <p className={eyebrowClass} style={{ color: "#71717A" }}>
            Under the Hood
          </p>
          <h2 className="mt-3 mb-3 text-4xl font-bold text-white">
            What everything is built with
          </h2>
          <p className="max-w-2xl mb-10 text-lg leading-relaxed" style={{ color: "#A1A1AA" }}>
            The same stack across every app — consistent, modern, and designed to ship
            fast without cutting corners.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
            {stack.map((item) => (
              <div key={item.name} className="rounded-2xl p-6" style={cardStyle}>
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-xl mb-4"
                  style={{ background: "rgba(255,107,43,0.15)" }}
                  aria-hidden="true"
                >
                  {item.icon}
                </div>
                <h3 className="text-white font-semibold mb-1">{item.name}</h3>
                <p className="text-sm leading-relaxed" style={{ color: "#A1A1AA" }}>
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
          <p className="mt-8 text-center text-sm" style={{ color: "#71717A" }}>
            Every app enforces per-user AI rate limits and a hard monthly spend cap.
            Database changes go through versioned migrations, never manual edits.
          </p>
        </div>
      </section>

      {/* ── 7. FOOTER ── */}
      <SiteFooter />
    </div>
  )
}
