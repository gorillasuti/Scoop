"use client"

import { useEffect, useRef } from "react"
import { usePathname } from "next/navigation"
import { useSession } from "next-auth/react"
import gsap from "gsap"

export default function AppTemplate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { status, update } = useSession()
  const ref = useRef<HTMLDivElement>(null)

  const lastPathRef = useRef(pathname)

  useEffect(() => {
    // Only fetch session update on actual route transitions
    if (lastPathRef.current !== pathname) {
      lastPathRef.current = pathname
      update().catch((err) => console.error("Session update error:", err))
    }
  }, [pathname, update])

  useEffect(() => {
    if (status === "unauthenticated") {
      // Clear cookie and redirect to login to prevent middleware loop
      window.location.href = "/api/auth/invalid-session"
    }
  }, [status])

  useEffect(() => {
    const el = ref.current
    if (!el) return

    gsap.fromTo(
      el,
      { autoAlpha: 0, y: 16 },
      { autoAlpha: 1, y: 0, duration: 0.42, ease: "power3.out", clearProps: "transform" }
    )
  }, [pathname])

  return (
    <div ref={ref} className="h-full w-full min-h-0 overflow-hidden">
      {children}
    </div>
  )
}
