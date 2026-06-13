import { NextResponse } from "next/server"
import { cookies } from "next/headers"

export async function GET(request: Request) {
  const cookieStore = await cookies()
  cookieStore.delete("next-auth.session-token")
  cookieStore.delete("__Secure-next-auth.session-token")
  
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host") || new URL(request.url).host
  const proto = request.headers.get("x-forwarded-proto") || new URL(request.url).protocol.replace(":", "") || "https"
  
  const url = new URL("/login", `${proto}://${host}`)
  return NextResponse.redirect(url)
}
