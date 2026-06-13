import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { cookies } from "next/headers"

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  const cookieStore = await cookies()
  const hasSessionCookie = cookieStore.has("next-auth.session-token") || cookieStore.has("__Secure-next-auth.session-token")

  if (hasSessionCookie && (!session || !session.user || !session.user.id)) {
    redirect("/api/auth/invalid-session")
  }


  return (
    <div className="min-h-[100dvh] w-full bg-surface flex flex-col antialiased">
      <div className="flex-1 w-full max-w-md mx-auto flex flex-col relative bg-bg-primary sm:shadow-2xl sm:border-x border-border-subtle">
        {children}
      </div>
    </div>
  )
}
