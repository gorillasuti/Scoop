// @ts-ignore -- web-push lacks type declarations
import webpush from "web-push"

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY!
const VAPID_EMAIL = process.env.VAPID_EMAIL || "mailto:noreply@scoop.hu"

// Skip VAPID setup in demo mode (push notifications are disabled)
if (process.env.NEXT_PUBLIC_DEMO_MODE !== "true" && VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(VAPID_EMAIL, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY)
}

export { webpush }
