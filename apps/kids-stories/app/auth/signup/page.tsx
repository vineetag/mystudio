import { Suspense } from "react"
import type { Metadata } from "next"
import { AuthForm } from "@/modules/auth"

export const metadata: Metadata = {
  title: "Sign up · ZippyTales",
}

export default function SignupPage() {
  return (
    <main className="flex min-h-[calc(100dvh-4rem)] items-center justify-center p-6">
      <Suspense>
        <AuthForm mode="signup" />
      </Suspense>
    </main>
  )
}
