import Link from "next/link"

const studioLinks = [
  { label: "Apps", href: "/#apps" },
  { label: "Skills", href: "/#skills" },
  { label: "About", href: "/about" },
] as const

export function SiteFooter() {
  return (
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
            <div className="flex items-center gap-2.5 mb-3">
              <svg viewBox="0 0 32 32" className="w-7 h-7 shrink-0" aria-hidden="true">
                <defs>
                  <linearGradient id="footer-ac" x1="4" y1="15" x2="17" y2="28" gradientUnits="userSpaceOnUse">
                    <stop offset="0" stopColor="#FF8F5A" />
                    <stop offset="1" stopColor="#FF6B2B" />
                  </linearGradient>
                </defs>
                <rect x="15" y="4" width="13" height="13" rx="4" fill="#FF6B2B" opacity="0.4" />
                <rect x="9.5" y="9.5" width="13" height="13" rx="4" fill="#FF6B2B" opacity="0.7" />
                <rect x="4" y="15" width="13" height="13" rx="4" fill="url(#footer-ac)" />
              </svg>
              <span className="font-semibold text-white text-sm">AppCrafter Studio</span>
            </div>
            <p className="text-sm" style={{ color: "#71717A" }}>
              Apps built with craft and intention.
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold text-white mb-4 uppercase tracking-wider">
              Studio
            </p>
            <div className="flex flex-col gap-3">
              {studioLinks.map((item) => (
                <Link
                  key={item.label}
                  href={item.href}
                  className="text-sm transition-colors duration-200 hover:text-white"
                  style={{ color: "#71717A" }}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold text-white mb-4 uppercase tracking-wider">
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
              <Link
                href="/contact"
                className="text-sm transition-colors duration-200 hover:text-white"
                style={{ color: "#71717A" }}
              >
                Contact
              </Link>
              <a
                href="https://github.com/vineetag/mystudio"
                target="_blank"
                rel="noopener noreferrer"
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
  )
}
