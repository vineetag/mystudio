"use client"

import { useState } from "react"

type FieldErrors = Partial<Record<"name" | "email" | "message", string>>
type Status = "idle" | "submitting" | "success" | "error"

const inputStyle = {
  background: "#111111",
  border: "1px solid rgba(255,255,255,0.08)",
}

export function ContactForm() {
  const [status, setStatus] = useState<Status>("idle")
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [formError, setFormError] = useState<string | null>(null)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setStatus("submitting")
    setFieldErrors({})
    setFormError(null)

    const form = event.currentTarget
    const data = new FormData(form)
    const payload = {
      name: String(data.get("name") ?? ""),
      email: String(data.get("email") ?? ""),
      message: String(data.get("message") ?? ""),
      company: String(data.get("company") ?? ""), // honeypot
    }

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (res.ok) {
        setStatus("success")
        form.reset()
        return
      }

      const result = await res.json().catch(() => ({}))
      if (result.errors) {
        setFieldErrors(result.errors as FieldErrors)
        setStatus("error")
      } else {
        setFormError(result.error ?? "Something blocked the send. Please try again.")
        setStatus("error")
      }
    } catch {
      setFormError("Network error — check your connection and try again.")
      setStatus("error")
    }
  }

  if (status === "success") {
    return (
      <div
        className="rounded-2xl p-8 text-center"
        style={{ background: "#111111", border: "1px solid rgba(255,107,43,0.3)" }}
      >
        <p className="text-xl font-semibold text-white mb-2">Message sent.</p>
        <p style={{ color: "#A1A1AA" }}>
          Thanks for reaching out — I&apos;ll get back to you soon.
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-white mb-2">
          Name
        </label>
        <input
          id="name"
          name="name"
          type="text"
          autoComplete="name"
          className="w-full rounded-xl px-4 text-white outline-none transition-colors duration-200 focus:border-white/30"
          style={{ ...inputStyle, minHeight: 48 }}
          aria-invalid={Boolean(fieldErrors.name)}
          aria-describedby={fieldErrors.name ? "name-error" : undefined}
        />
        {fieldErrors.name && (
          <p id="name-error" className="mt-1.5 text-sm" style={{ color: "#F87171" }}>
            {fieldErrors.name}
          </p>
        )}
      </div>

      <div>
        <label htmlFor="email" className="block text-sm font-medium text-white mb-2">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          className="w-full rounded-xl px-4 text-white outline-none transition-colors duration-200 focus:border-white/30"
          style={{ ...inputStyle, minHeight: 48 }}
          aria-invalid={Boolean(fieldErrors.email)}
          aria-describedby={fieldErrors.email ? "email-error" : undefined}
        />
        {fieldErrors.email && (
          <p id="email-error" className="mt-1.5 text-sm" style={{ color: "#F87171" }}>
            {fieldErrors.email}
          </p>
        )}
      </div>

      <div>
        <label htmlFor="message" className="block text-sm font-medium text-white mb-2">
          Message
        </label>
        <textarea
          id="message"
          name="message"
          rows={5}
          className="w-full rounded-xl px-4 py-3 text-white outline-none transition-colors duration-200 focus:border-white/30 resize-y"
          style={inputStyle}
          aria-invalid={Boolean(fieldErrors.message)}
          aria-describedby={fieldErrors.message ? "message-error" : undefined}
        />
        {fieldErrors.message && (
          <p id="message-error" className="mt-1.5 text-sm" style={{ color: "#F87171" }}>
            {fieldErrors.message}
          </p>
        )}
      </div>

      {/* Honeypot — hidden from humans, tempting to bots. */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label htmlFor="company">Company</label>
        <input id="company" name="company" type="text" tabIndex={-1} autoComplete="off" />
      </div>

      {formError && (
        <p className="text-sm" style={{ color: "#F87171" }} role="alert">
          {formError}
        </p>
      )}

      <button
        type="submit"
        disabled={status === "submitting"}
        className="rounded-full px-7 font-medium bg-white text-black transition-all duration-200 ease-out hover:bg-white/90 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center"
        style={{ minHeight: 48 }}
      >
        {status === "submitting" ? "Sending…" : "Send message"}
      </button>
    </form>
  )
}
