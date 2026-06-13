import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await req.json()
    const { endpoint, keys } = body

    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      console.log(`[PUSH-SUB] ❌ Invalid subscription data from user ${session.user.id}`, { endpoint: !!endpoint, p256dh: !!keys?.p256dh, auth: !!keys?.auth })
      return NextResponse.json({ error: "Invalid subscription" }, { status: 400 })
    }

    // Upsert: if endpoint already exists, update it; otherwise create
    const result = await prisma.pushSubscription.upsert({
      where: { endpoint },
      update: {
        userId: session.user.id,
        p256dh: keys.p256dh,
        auth: keys.auth,
      },
      create: {
        userId: session.user.id,
        endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
      },
    })

    console.log(`[PUSH-SUB] ✅ Saved subscription for user ${session.user.id}, id=${result.id}, endpoint=${endpoint.substring(0, 60)}...`)

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error("[PUSH-SUB] Push subscription save error:", err)
    return NextResponse.json({ error: "Failed to save subscription" }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await req.json()
    const { endpoint } = body

    if (!endpoint) {
      return NextResponse.json({ error: "Missing endpoint" }, { status: 400 })
    }

    await prisma.pushSubscription.deleteMany({
      where: {
        endpoint,
        userId: session.user.id,
      },
    })

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error("Push subscription delete error:", err)
    return NextResponse.json({ error: "Failed to delete subscription" }, { status: 500 })
  }
}
