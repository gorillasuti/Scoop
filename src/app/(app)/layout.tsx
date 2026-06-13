import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { cookies } from "next/headers"
import { BottomNav } from "@/components/layout/bottom-nav"
import { AppHeader } from "@/components/layout/app-header"
import { DemoBanner } from "@/components/demo-banner"
import { Suspense } from "react"

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()
  const cookieStore = await cookies()
  const hasSessionCookie = cookieStore.has("next-auth.session-token") || cookieStore.has("__Secure-next-auth.session-token")

  if (hasSessionCookie && (!session || !session.user || !session.user.id)) {
    redirect("/api/auth/invalid-session")
  }

  if (!session?.user?.id) {
    redirect("/login")
  }

  return (
    <div className="relative h-[100dvh] w-full flex flex-col overflow-hidden bg-bg-primary">
      <DemoBanner />
      <AppHeader />
      <div className="flex-1 min-h-0 w-full relative">
        {children}
      </div>
      <Suspense fallback={null}>
        <BottomNav />
      </Suspense>
    </div>
  )
}
