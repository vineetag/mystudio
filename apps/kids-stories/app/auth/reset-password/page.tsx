import type { Metadata } from "next"
import { ResetPasswordForm } from "@/modules/auth"

export const metadata: Metadata = {
  title: "Set new password · ZippyTales",
}

export default function ResetPasswordPage() {
  return (
    <main className="flex min-h-[calc(100dvh-4rem)] items-center justify-center p-6">
      <ResetPasswordForm />
    </main>
  )
}
