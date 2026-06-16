import type { Metadata } from "next"

import { SiteNav } from "@/components/site-nav"
import { SiteFooter } from "@/components/site-footer"
import { ContactForm } from "@/components/contact-form"

export function generateMetadata(): Metadata {
  return {
    title: "Contact — AppCrafter Studio",
    description: "Get in touch with the builder behind AppCrafter Studio.",
    alternates: {
      canonical: "https://appcrafter.studio/contact",
    },
  }
}

export default function ContactPage() {
  return (
    <div style={{ background: "#080808", color: "#ffffff", minHeight: "100vh" }}>
      <SiteNav />

      <section
        className="px-4 overflow-hidden"
        style={{
          background:
            "radial-gradient(ellipse 60% 40% at 50% 0%, rgba(255,107,43,0.08) 0%, transparent 60%)",
        }}
      >
        <div className="max-w-xl mx-auto py-20">
          <p
            className="text-xs tracking-widest font-semibold uppercase"
            style={{ color: "#71717A" }}
          >
            Get in Touch
          </p>
          <h1 className="mt-3 text-3xl md:text-4xl font-bold tracking-tight text-white">
            Say hello.
          </h1>
          <p className="mt-4 mb-10 text-lg leading-relaxed" style={{ color: "#A1A1AA" }}>
            Questions, ideas, or just want to take one of these apps further together?
            Drop a note and I&apos;ll get back to you.
          </p>

          <ContactForm />
        </div>
      </section>

      <SiteFooter />
    </div>
  )
}
