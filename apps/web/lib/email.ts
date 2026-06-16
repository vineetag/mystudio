// Server-only email helper. Never import this from a client component.
// Sends transactional email through the Resend REST API (no SDK dependency).

const RESEND_ENDPOINT = "https://api.resend.com/emails"

export interface ContactMessage {
  name: string
  email: string
  message: string
}

/**
 * Sends a contact-form submission to the studio inbox.
 *
 * Required env vars (server-side only):
 * - RESEND_API_KEY  — Resend API key
 * - CONTACT_TO      — inbox that receives submissions (your real address)
 * - CONTACT_FROM    — verified sender, e.g. "AppCrafter <contact@appcrafter.studio>"
 *
 * In development, if RESEND_API_KEY is missing the message is logged to the
 * console and treated as sent, so the form works without external setup.
 */
export async function sendContactEmail({ name, email, message }: ContactMessage): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY
  const to = process.env.CONTACT_TO
  const from = process.env.CONTACT_FROM

  if (!apiKey || !to || !from) {
    // Treat only the real production deployment as "must be configured".
    // On Vercel, NODE_ENV is "production" even for preview builds, so key off
    // VERCEL_ENV when it's present; fall back to NODE_ENV for local dev.
    const isProduction = process.env.VERCEL_ENV
      ? process.env.VERCEL_ENV === "production"
      : process.env.NODE_ENV === "production"

    if (!isProduction) {
      console.warn("[contact] Email not configured — logging submission instead:", {
        name,
        email,
        message,
      })
      return
    }
    throw new Error("EMAIL_NOT_CONFIGURED")
  }

  const res = await fetch(RESEND_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [to],
      reply_to: email,
      subject: `New message from ${name} via AppCrafter Studio`,
      text: `From: ${name} <${email}>\n\n${message}`,
    }),
  })

  if (!res.ok) {
    const detail = await res.text().catch(() => "")
    throw new Error(`RESEND_FAILED: ${res.status} ${detail}`)
  }
}
