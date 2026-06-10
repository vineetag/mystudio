import type { Metadata } from "next"
import { ForgotPasswordForm } from "@/modules/auth"

export const metadata: Metadata = {
  title: "Reset password · ZippyTales",
}

export default function ForgotPasswordPage() {
  return (
    <main className="flex min-h-[calc(100dvh-4rem)] items-center justify-center p-6">
      <ForgotPasswordForm />
    </main>
  )
}
