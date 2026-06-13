"use client"

import { useEffect, useRef, useCallback } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { getUnreadNotifications, markNotificationAsRead } from "@/app/actions/notifications"
import { toast } from "sonner"
import { playSound } from "@/lib/sounds"

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/")
  const rawData = atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

async function subscribeToPush(vapidPublicKey: string) {
  if (!("serviceWorker" in navigator)) {
    toast.error("Push hiba: Service Worker nem támogatott ebben a böngészőben.")
    return
  }
  if (!("PushManager" in window)) {
    // On iOS, PushManager is only available when running from the Home Screen (as a PWA)
    toast.error("Push hiba: PushManager nem támogatott. (iOS-en add az appot a Főképernyőhöz!)", { id: "push-pwa-error" })
    return
  }
  if (!vapidPublicKey) {
    toast.error("Push hiba: VAPID publikus kulcs hiányzik. Ellenőrizd a környezeti változókat!", { id: "push-key-error" })
    return
  }

  try {
    const reg = await navigator.serviceWorker.ready

    let subscription = await reg.pushManager.getSubscription()

    if (!subscription) {
      subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
      })
    }

    const subJSON = subscription.toJSON()
    const res = await fetch("/api/push-subscription", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        endpoint: subJSON.endpoint,
        keys: subJSON.keys,
      }),
    })
    const resData = await res.json()
    if (resData.error) {
      toast.error("Push mentés hiba a szerveren: " + resData.error)
    }
  } catch (err: any) {
    console.warn("Push subscription failed:", err)
    toast.error("Push regisztráció sikertelen: " + (err.message || String(err)), { id: "push-sub-fail" })
  }
}

// Module-level sets - survive React Strict Mode double-mount and re-renders
const globalNotifiedIds = new Set<string>()
let globalInitialLoadUser = ""
let globalPushSubscribedUserId = ""

export function NotificationListener({ vapidPublicKey }: { vapidPublicKey: string }) {
  const { data: session } = useSession()
  const router = useRouter()
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const isMountedRef = useRef(false)

  const checkNotifications = useCallback(async () => {
    if (!isMountedRef.current || !session?.user?.id) return

    const res = await getUnreadNotifications()
    if (!res.success || !res.notifications) return

    // Dispatch event to update unread badge on BellButton
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("unread-notifications-count", {
        detail: { count: res.notifications.length }
      }))
    }

    // First load for this user: register all existing unread IDs so we don't spam on page open
    if (globalInitialLoadUser !== session.user.id) {
      globalNotifiedIds.clear()
      res.notifications.forEach((n: any) => globalNotifiedIds.add(n.id))
      globalInitialLoadUser = session.user.id
      return
    }

    for (const notif of res.notifications) {
      if (globalNotifiedIds.has(notif.id)) continue
      globalNotifiedIds.add(notif.id)

      // Play notification chime
      playSound("registrationSuccess")

      toast(
        <div
          onClick={async () => {
            await markNotificationAsRead(notif.id)
            const newRes = await getUnreadNotifications()
            if (newRes.success && newRes.notifications) {
              window.dispatchEvent(new CustomEvent("unread-notifications-count", {
                detail: { count: newRes.notifications.length }
              }))
            }
            if (notif.recipeId) {
              router.push(`/recept/${notif.recipeId}`)
            }
          }}
          className="cursor-pointer w-full flex flex-col"
        >
          <div className="font-bold text-sm">{notif.title}</div>
          <div className="text-xs text-text-secondary mt-0.5">{notif.message}</div>
        </div>,
        {
          duration: 8000,
          id: notif.id,
        }
      )
    }
  }, [router, session?.user?.id])

  useEffect(() => {
    if (typeof window === "undefined") return

    const handleTriggerSubscribe = () => {
      const userId = session?.user?.id
      if (userId && "Notification" in window && Notification.permission === "granted") {
        globalPushSubscribedUserId = userId
        subscribeToPush(vapidPublicKey)
      }
    }

    window.addEventListener("trigger-push-subscribe", handleTriggerSubscribe)
    return () => {
      window.removeEventListener("trigger-push-subscribe", handleTriggerSubscribe)
    }
  }, [session?.user?.id, vapidPublicKey])

  useEffect(() => {
    const userId = session?.user?.id
    if (!userId) return

    isMountedRef.current = true

    // Subscribe to Web Push (once globally per user)
    if (globalPushSubscribedUserId !== userId && typeof window !== "undefined" && "Notification" in window) {
      if (Notification.permission === "default") {
        Notification.requestPermission().then((perm) => {
          if (perm === "granted") {
            globalPushSubscribedUserId = userId
            subscribeToPush(vapidPublicKey)
          }
        })
      } else if (Notification.permission === "granted") {
        globalPushSubscribedUserId = userId
        subscribeToPush(vapidPublicKey)
      }
    }

    // Run first check
    checkNotifications()

    // Poll every 10 seconds
    intervalRef.current = setInterval(checkNotifications, 10000)

    return () => {
      isMountedRef.current = false
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [session?.user?.id, checkNotifications, vapidPublicKey])

  return null
}
