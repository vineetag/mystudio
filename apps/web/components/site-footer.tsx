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
