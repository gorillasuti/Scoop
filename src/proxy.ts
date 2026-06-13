import NextAuth from "next-auth"
import { authConfig } from "./auth.config"
import { NextResponse } from "next/server"

const { auth } = NextAuth(authConfig)

export const proxy = auth(async (req) => {
  const isLoggedIn = !!req.auth
  const user = req.auth?.user as any
  const { pathname } = req.nextUrl

  // 1. Auth API routes & PWA assets - always pass through
  if (
    pathname.startsWith("/api/auth") ||
    pathname === "/sw.js" ||
    pathname === "/manifest.webmanifest" ||
    pathname === "/offline.html"
  ) {
    return NextResponse.next()
  }

  const authRoutes = ["/login", "/register"]
  const isAuthRoute = authRoutes.some((route) => pathname.startsWith(route))
  const isOnboardingRoute = pathname.startsWith("/onboarding")

  // 2. NOT logged in
  if (!isLoggedIn) {
    // Allow auth routes (login, register)
    if (isAuthRoute) {
      return NextResponse.next()
    }
    // Block everything else - send existing users to login (register is invite-only)
    const loginUrl = new URL("/login", req.nextUrl.origin)
    if (pathname !== "/") {
      loginUrl.searchParams.set("callbackUrl", pathname)
    }
    return NextResponse.redirect(loginUrl)
  }

  // --- From here, user IS logged in ---

  const onboardingComplete = user?.onboardingComplete ?? false

  // 3. Logged in + on auth routes (login/register) → redirect away
  if (isAuthRoute) {
    if (!onboardingComplete) {
      return NextResponse.redirect(new URL("/onboarding", req.nextUrl.origin))
    }
    return NextResponse.redirect(new URL("/", req.nextUrl.origin))
  }

  // 4. Logged in + onboarding NOT complete
  if (!onboardingComplete) {
    // Allow the onboarding page itself
    if (isOnboardingRoute) {
      return NextResponse.next()
    }
    // Block everything else - redirect to onboarding
    return NextResponse.redirect(new URL("/onboarding", req.nextUrl.origin))
  }

  // 5. Logged in + onboarding IS complete + on onboarding page → redirect to home
  if (isOnboardingRoute) {
    return NextResponse.redirect(new URL("/", req.nextUrl.origin))
  }

  // 6. All good - allow
  return NextResponse.next()
})

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - Rive (static Rive animation files)
     * - public files (.svg, .png, .wasm, etc.)
     */
    "/((?!api|_next/static|_next/image|favicon.ico|sw\\.js|manifest\\.webmanifest|Rive|.*\\.(?:svg|png|jpg|jpeg|gif|webp|wasm|mp3|lottie|woff2|woff|ttf)$).*)"
  ],
}
