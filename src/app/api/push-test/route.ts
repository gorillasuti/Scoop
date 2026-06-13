import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { webpush } from "@/lib/web-push"
import { NextRequest, NextResponse } from "next/server"

/**
 * GET /api/push-test
 * 
 * Diagnostic endpoint: lists your push subscriptions AND sends a test push to yourself.
 * Hit this URL in your browser to verify the entire chain works.
 */
export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized - log in first" }, { status: 401 })
  }

  const userId = session.user.id

  try {
    // 1. Check VAPID config
    const vapidPublic = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
    const vapidPrivate = process.env.VAPID_PRIVATE_KEY
    const vapidEmail = process.env.VAPID_EMAIL

    const vapidStatus = {
      publicKeySet: !!vapidPublic,
      publicKeyLength: vapidPublic?.length ?? 0,
      privateKeySet: !!vapidPrivate,
      privateKeyLength: vapidPrivate?.length ?? 0,
      emailSet: !!vapidEmail,
      email: vapidEmail || "(not set)",
    }

    // 2. Check subscriptions in DB for this user
    const subscriptions = await prisma.pushSubscription.findMany({
      where: { userId },
      select: {
        id: true,
        endpoint: true,
        p256dh: true,
        auth: true,
        createdAt: true,
      },
    })

    const subSummary = subscriptions.map((s) => ({
      id: s.id,
      endpoint: s.endpoint.substring(0, 80) + "...",
      p256dhLength: s.p256dh.length,
      authLength: s.auth.length,
      createdAt: s.createdAt.toISOString(),
    }))

    // 3. If subscriptions exist, try to send a test push
    const pushResults: any[] = []
    if (subscriptions.length > 0 && vapidPublic && vapidPrivate) {
      const testPayload = JSON.stringify({
        title: "🧪 Teszt push",
        body: "Ha ezt látod, a push működik!",
        icon: "/icon-512.png",
        badge: "/icon-512.png",
        url: "/",
      })

      for (const sub of subscriptions) {
        try {
          const result = await webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: {
                p256dh: sub.p256dh,
                auth: sub.auth,
              },
            },
            testPayload
          )
          pushResults.push({
            subscriptionId: sub.id,
            status: "success",
            statusCode: result.statusCode,
            body: result.body,
          })
        } catch (err: any) {
          pushResults.push({
            subscriptionId: sub.id,
            status: "failed",
            statusCode: err.statusCode,
            message: err.message,
            body: err.body,
          })
        }
      }
    }

    return NextResponse.json({
      userId,
      vapidStatus,
      subscriptionCount: subscriptions.length,
      subscriptions: subSummary,
      pushResults,
      diagnosis: subscriptions.length === 0
        ? "❌ NO SUBSCRIPTIONS FOUND - The browser never registered a push subscription for this user. Go to Settings > Értesítések and re-enable notifications."
        : pushResults.every((r) => r.status === "success")
          ? "✅ Push sent successfully! You should see a native notification banner."
          : "⚠️ Some push deliveries failed - check pushResults for details.",
    })
  } catch (err: any) {
    console.error("Push test error:", err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
