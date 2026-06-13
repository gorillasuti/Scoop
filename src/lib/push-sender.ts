import { prisma } from "@/lib/prisma"
import { webpush } from "@/lib/web-push"

export async function sendPushToUser(
  userId: string,
  payload: { title: string; body: string; icon?: string; badge?: string; url?: string }
) {
  try {
    // Skip push in demo mode - VAPID keys are not configured
    if (process.env.NEXT_PUBLIC_DEMO_MODE === "true") return;

    const subscriptions = await prisma.pushSubscription.findMany({
      where: { userId },
    })

    console.log(`[PUSH] sendPushToUser userId=${userId} → found ${subscriptions.length} subscription(s)`)

    if (subscriptions.length === 0) {
      console.log(`[PUSH] ❌ No push subscriptions for user ${userId} - native notification will NOT fire`)
      return
    }

    const pushPayload = JSON.stringify(payload)
    console.log(`[PUSH] Sending payload: ${pushPayload.substring(0, 200)}`)

    const results = await Promise.allSettled(
      subscriptions.map((sub) =>
        webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: {
              p256dh: sub.p256dh,
              auth: sub.auth,
            },
          },
          pushPayload
        )
      )
    )

    // Log results and clean up expired/invalid subscriptions (410 Gone or 404)
    for (let i = 0; i < results.length; i++) {
      const result = results[i]
      if (result.status === "fulfilled") {
        console.log(`[PUSH] ✅ Subscription ${subscriptions[i].id} → delivered (status ${result.value.statusCode})`)
      } else {
        const statusCode = (result.reason as any)?.statusCode
        console.error(`[PUSH] ❌ Subscription ${subscriptions[i].id} → FAILED (status ${statusCode}):`, result.reason?.message || result.reason)
        if (statusCode === 410 || statusCode === 404) {
          console.log(`[PUSH] 🗑️ Removing expired subscription ${subscriptions[i].id}`)
          await prisma.pushSubscription.delete({
            where: { id: subscriptions[i].id },
          }).catch(() => { })
        }
      }
    }
  } catch (err) {
    console.error("[PUSH] sendPushToUser error:", err)
  }
}

