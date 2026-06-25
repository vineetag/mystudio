import { NextResponse } from "next/server"

import { sendContactEmail } from "@/lib/email"
import { checkRateLimit, getClientIp } from "@/lib/rate-limit"

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const MINUTE = 60 * 1000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

type Errors = Record<string, string>

export async function POST(request: Request) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { error: "Invalid request. Please submit the form again." },
      { status: 400 },
    )
  }

  const { name, email, message, company } = (body ?? {}) as Record<string, unknown>

  // Honeypot: real users never fill the hidden "company" field. Bots do.
  if (typeof company === "string" && company.trim() !== "") {
    // Pretend success so bots get no signal.
    return NextResponse.json({ ok: true })
  }

  const errors: Errors = {}
  const cleanName = typeof name === "string" ? name.trim() : ""
  const cleanEmail = typeof email === "string" ? email.trim() : ""
  const cleanMessage = typeof message === "string" ? message.trim() : ""

  if (cleanName.length < 2) errors.name = "Please enter your name (at least 2 characters)."
  if (!EMAIL_RE.test(cleanEmail)) errors.email = "Please enter a valid email address."
  if (cleanMessage.length < 10) {
    errors.message = "Please write a little more — at least 10 characters."
  }
  if (cleanMessage.length > 5000) {
    errors.message = "That message is too long. Please keep it under 5000 characters."
  }

  if (Object.keys(errors).length > 0) {
    return NextResponse.json({ errors }, { status: 422 })
  }

  const clientIp = getClientIp(request)
  const normalizedEmail = cleanEmail.toLowerCase()
  const rateLimit = checkRateLimit([
    // Stop short bursts from turning directly into Resend API calls.
    { key: `contact:ip:${clientIp}:burst`, limit: 3, windowMs: MINUTE },
    // Keep sustained abuse from one network bounded.
    { key: `contact:ip:${clientIp}:hour`, limit: 10, windowMs: HOUR },
    // Also throttle repeated sends for the same submitted address.
    { key: `contact:email:${normalizedEmail}:day`, limit: 5, windowMs: DAY },
  ])

  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Too many messages. Please wait a bit before trying again." },
      {
        status: 429,
        headers: { "Retry-After": String(rateLimit.retryAfterSeconds) },
      },
    )
  }

  try {
    await sendContactEmail({ name: cleanName, email: cleanEmail, message: cleanMessage })
    return NextResponse.json({ ok: true })
  } catch (err) {
    const reason = err instanceof Error ? err.message : "unknown"
    if (reason === "EMAIL_NOT_CONFIGURED") {
      return NextResponse.json(
        { error: "The contact form isn't available right now. Please try again later." },
        { status: 503 },
      )
    }
    console.error("[contact] send failed:", reason)
    return NextResponse.json(
      { error: "We couldn't send your message. Please try again in a moment." },
      { status: 502 },
    )
  }
}
