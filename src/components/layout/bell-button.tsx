"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { BellRingIcon } from "@/components/animated-icons/bell-ring"
import { Button3D } from "react-3d-button"
import "react-3d-button/styles"
import { Modal } from "@/components/ui/modal"
import {
  getUnreadNotifications,
  getRecentNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
  deleteNotification,
  clearAllNotifications,
} from "@/app/actions/notifications"
import { playSound } from "@/lib/sounds"
import { Bell, Check, Trash2 } from "lucide-react"
import gsap from "gsap"

function formatTime(dateVal: Date | string) {
  const d = new Date(dateVal)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMins / 60)

  if (diffMins < 1) return "Most"
  if (diffMins < 60) return `${diffMins} perce`
  if (diffHours < 24) return `${diffHours} órája`
  return d.toLocaleDateString("hu-HU", { month: "short", day: "numeric" })
}

export interface SwipeableNotificationProps {
  notif: any
  isUnread: boolean
  unreadCount: number
  setUnreadCount?: React.Dispatch<React.SetStateAction<number>>
  onDelete: (id: string) => void
  onMarkAsRead: (id: string) => Promise<any>
  router: any
  setIsOpen?: (open: boolean) => void
}

export function SwipeableNotification({
  notif,
  isUnread,
  unreadCount,
  setUnreadCount,
  onDelete,
  onMarkAsRead,
  router,
  setIsOpen,
}: SwipeableNotificationProps) {
  const cardRef = useRef<HTMLDivElement>(null)
  const deleteBtnRef = useRef<HTMLDivElement>(null)

  const dragInfo = useRef({
    startX: 0,
    startY: 0,
    currentX: 0,
    isDragging: false,
    directionChecked: false,
    isSwipeLocked: false,
    revealWidth: 68,
  })

  useEffect(() => {
    return () => {
      if (cardRef.current) {
        gsap.killTweensOf(cardRef.current)
      }
      if (deleteBtnRef.current) {
        gsap.killTweensOf(deleteBtnRef.current)
      }
    }
  }, [])

  const handlePointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0 && e.pointerType === "mouse") return

    const info = dragInfo.current
    info.startX = e.clientX
    info.startY = e.clientY
    info.isDragging = true
    info.directionChecked = false
    info.isSwipeLocked = false

    e.currentTarget.setPointerCapture(e.pointerId)
  }

  const handlePointerMove = (e: React.PointerEvent) => {
    const info = dragInfo.current
    if (!info.isDragging) return

    const dx = e.clientX - info.startX
    const dy = e.clientY - info.startY

    if (!info.directionChecked) {
      const absX = Math.abs(dx)
      const absY = Math.abs(dy)
      if (absX > 5 || absY > 5) {
        info.directionChecked = true
        if (absX > absY) {
          info.isSwipeLocked = true
          playSound("swipe")
        } else {
          info.isDragging = false
        }
      }
      return
    }

    if (!info.isSwipeLocked) return

    let newX = info.currentX + dx
    if (newX > 0) {
      newX = newX * 0.2
    } else if (newX < -info.revealWidth) {
      const overflow = newX + info.revealWidth
      newX = -info.revealWidth + overflow * 0.2
    }

    gsap.to(cardRef.current, {
      x: newX,
      duration: 0.1,
      overwrite: "auto",
      ease: "power1.out",
    })

    const progress = Math.min(1, Math.max(0, Math.abs(newX) / info.revealWidth))
    gsap.to(deleteBtnRef.current, {
      scale: 0.6 + progress * 0.4,
      opacity: progress,
      duration: 0.1,
      overwrite: "auto",
    })
  }

  const handlePointerUp = (e: React.PointerEvent) => {
    const info = dragInfo.current
    if (!info.isDragging) return

    info.isDragging = false
    e.currentTarget.releasePointerCapture(e.pointerId)

    if (!info.isSwipeLocked) return

    const finalX = cardRef.current ? (gsap.getProperty(cardRef.current, "x") as number) : 0

    if (finalX < -info.revealWidth * 0.4) {
      info.currentX = -info.revealWidth
      gsap.to(cardRef.current, {
        x: -info.revealWidth,
        duration: 0.35,
        ease: "back.out(1.5)",
      })
      gsap.to(deleteBtnRef.current, {
        scale: 1,
        opacity: 1,
        duration: 0.25,
        ease: "power2.out",
      })
    } else {
      info.currentX = 0
      gsap.to(cardRef.current, {
        x: 0,
        duration: 0.3,
        ease: "power3.out",
      })
      gsap.to(deleteBtnRef.current, {
        scale: 0.6,
        opacity: 0,
        duration: 0.2,
        ease: "power2.out",
      })
    }
  }

  const handleCardClick = async () => {
    const info = dragInfo.current
    if (info.currentX !== 0) {
      info.currentX = 0
      gsap.to(cardRef.current, {
        x: 0,
        duration: 0.3,
        ease: "power3.out",
      })
      gsap.to(deleteBtnRef.current, {
        scale: 0.6,
        opacity: 0,
        duration: 0.2,
        ease: "power2.out",
      })
      return
    }

    if (setIsOpen) {
      setIsOpen(false)
    }
    if (isUnread) {
      await onMarkAsRead(notif.id)
      if (setUnreadCount) {
        setUnreadCount((c) => Math.max(0, c - 1))
      }
      window.dispatchEvent(new CustomEvent("unread-notifications-count", {
        detail: { count: Math.max(0, unreadCount - 1) }
      }))
      window.dispatchEvent(new CustomEvent("sync-notification-read", {
        detail: { id: notif.id }
      }))
    }
    if (notif.recipeId) {
      router.push(`/recept/${notif.recipeId}`)
    }
  }

  return (
    <div className="relative overflow-hidden rounded-2xl mb-3 select-none touch-pan-y">
      {/* Behind: Delete Button */}
      <div
        ref={deleteBtnRef}
        className="absolute right-3.5 top-1/2 -translate-y-1/2 z-10 opacity-0 scale-75"
      >
        <Button3D
          type="primary"
          iconOnly
          rounded="full"
          containerProps={{
            style: {
              width: "40px",
              height: "40px",
              "--button-primary-color": "#EF4444",
              "--button-primary-color-dark": "#DC2626",
              "--button-primary-color-hover": "#F87171",
              "--button-primary-color-light": "#FFFFFF",
            } as React.CSSProperties
          }}
          onPress={() => onDelete(notif.id)}
        >
          <Trash2 size={16} className="pointer-events-none" />
        </Button3D>
      </div>

      {/* Front: Swipeable Content Card */}
      <div
        ref={cardRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onClick={handleCardClick}
        className={`relative z-20 flex items-start gap-3 p-3.5 border-2 transition-colors cursor-grab active:cursor-grabbing rounded-2xl
          ${isUnread
            ? "border-[#FF6B35] bg-[#FFF8EE] text-text-primary shadow-[0_3px_0_#FFE2C5] hover:bg-[#FFF8EE]/80 active:translate-y-[1px] active:shadow-none"
            : "border-border-default bg-white text-text-secondary shadow-[0_3px_0_#E5E2E1] hover:bg-bg-card active:translate-y-[1px] active:shadow-none"
          }`}
      >
        {/* Sender Avatar */}
        <div className={`w-10 h-10 rounded-full border-2 p-1 flex items-center justify-center overflow-hidden flex-shrink-0 bg-bg-primary
          ${isUnread ? "border-[#FF6B35]" : "border-border-default"}`}
        >
          <img
            src={`/Avatar/Faces/${notif.sender?.image || "Face1"}.svg`}
            alt={notif.sender?.name || "Feladó"}
            className="w-full h-full object-contain object-bottom pointer-events-none"
          />
        </div>

        {/* Notification details */}
        <div className="flex-1 min-w-0 flex flex-col pointer-events-none">
          <div className="flex items-center justify-between gap-1.5">
            <span className={`text-xs font-black truncate ${isUnread ? "text-[#FF6B35]" : "text-text-primary"}`}>
              {notif.title}
            </span>
            <span className="text-[10px] text-text-tertiary font-bold flex-shrink-0">
              {formatTime(notif.createdAt)}
            </span>
          </div>
          <p className="text-xs font-semibold leading-relaxed mt-1 text-text-secondary line-clamp-2">
            {notif.message}
          </p>
        </div>
      </div>
    </div>
  )
}

export function BellButton() {
  const [unreadCount, setUnreadCount] = useState(0)
  const [notifications, setNotifications] = useState<any[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const iconRef = useRef<any>(null)

  useEffect(() => {
    // Initial fetch of unread count on mount
    getUnreadNotifications().then((res) => {
      if (res.success && res.notifications) {
        setUnreadCount(res.notifications.length)
      }
    })

    const handleUpdate = (e: Event) => {
      const customEvent = e as CustomEvent<{ count: number }>
      if (customEvent.detail) {
        setUnreadCount(customEvent.detail.count)
      }
    }

    const handleSyncRead = (e: Event) => {
      const customEvent = e as CustomEvent<{ id: string }>
      const id = customEvent.detail?.id
      setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, read: true } : n))
      getUnreadNotifications().then((res) => {
        if (res.success && res.notifications) {
          setUnreadCount(res.notifications.length)
        }
      })
    }

    const handleSyncDelete = (e: Event) => {
      const customEvent = e as CustomEvent<{ id: string }>
      const id = customEvent.detail?.id
      setNotifications((prev) => prev.filter((n) => n.id !== id))
      getUnreadNotifications().then((res) => {
        if (res.success && res.notifications) {
          setUnreadCount(res.notifications.length)
        }
      })
    }

    const handleSyncReadAll = () => {
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
      setUnreadCount(0)
    }

    const handleSyncDeleteAll = () => {
      setNotifications([])
      setUnreadCount(0)
    }

    window.addEventListener("unread-notifications-count", handleUpdate)
    window.addEventListener("sync-notification-read", handleSyncRead)
    window.addEventListener("sync-notification-delete", handleSyncDelete)
    window.addEventListener("sync-notification-read-all", handleSyncReadAll)
    window.addEventListener("sync-notification-delete-all", handleSyncDeleteAll)

    return () => {
      window.removeEventListener("unread-notifications-count", handleUpdate)
      window.removeEventListener("sync-notification-read", handleSyncRead)
      window.removeEventListener("sync-notification-delete", handleSyncDelete)
      window.removeEventListener("sync-notification-read-all", handleSyncReadAll)
      window.removeEventListener("sync-notification-delete-all", handleSyncDeleteAll)
    }
  }, [])

  const handleOpenNotifications = async () => {
    iconRef.current?.startAnimation?.()
    setIsOpen(true)
    setIsLoading(true)

    // Fetch recent notifications
    const res = await getRecentNotifications()
    if (res.success && res.notifications) {
      setNotifications(res.notifications)
    }
    setIsLoading(false)
  }

  const handleMarkAllAsRead = async () => {
    playSound("registrationSuccess")

    // Call server action to mark all as read in DB
    await markAllNotificationsAsRead()

    // Update local state
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
    setUnreadCount(0)

    // Dispatch event to sync any other listeners
    window.dispatchEvent(new CustomEvent("unread-notifications-count", {
      detail: { count: 0 }
    }))
    window.dispatchEvent(new CustomEvent("sync-notification-read-all"))
  }

  const handleDeleteNotification = async (id: string) => {
    playSound("delete")

    // Call server action to delete notification from DB
    await deleteNotification(id)

    // Update local state
    setNotifications((prev) => prev.filter((n) => n.id !== id))

    // Update unread count
    const res = await getUnreadNotifications()
    if (res.success && res.notifications) {
      setUnreadCount(res.notifications.length)
      window.dispatchEvent(new CustomEvent("unread-notifications-count", {
        detail: { count: res.notifications.length }
      }))
    }
    window.dispatchEvent(new CustomEvent("sync-notification-delete", {
      detail: { id }
    }))
  }

  const handleClearAll = async () => {
    playSound("delete")

    // Call server action to delete all notifications from DB
    await clearAllNotifications()

    // Update local state
    setNotifications([])
    setUnreadCount(0)

    // Dispatch event to sync any other listeners
    window.dispatchEvent(new CustomEvent("unread-notifications-count", {
      detail: { count: 0 }
    }))
    window.dispatchEvent(new CustomEvent("sync-notification-delete-all"))
  }

  const handleCloseNotifications = () => {
    setIsOpen(false)
  }

  const hasUnread = notifications.some((n) => !n.read)

  return (
    <div
      className="relative w-12 h-12 flex-shrink-0 flex items-center justify-center"
      data-sound="off"
      onMouseEnter={() => iconRef.current?.startAnimation?.()}
      onMouseLeave={() => iconRef.current?.stopAnimation?.()}
    >
      <Button3D
        type="secondary"
        size="lg"
        iconOnly
        rounded="full"
        containerProps={{
          "data-sound": "off",
          style: {
            width: "48px",
            height: "48px",
            "--button-secondary-color": "#ffffff",
            "--button-secondary-color-dark": "#E5E2E1",
            "--button-secondary-color-hover": "#FCF9F8",
            "--button-secondary-color-light": "#1C1B1B",
          } as React.CSSProperties
        } as any}
        onPress={handleOpenNotifications}
      >
        <BellRingIcon ref={iconRef} size={22} className="pointer-events-none" />
      </Button3D>

      {unreadCount > 0 && (
        <span className="absolute top-0 right-0 z-30 transform translate-x-1/4 -translate-y-1/4 bg-accent-red text-white text-[10px] font-black w-5 h-5 rounded-full border-2 border-white flex items-center justify-center shadow-[0_2px_0_rgba(0,0,0,0.1)] select-none pointer-events-none">
          {unreadCount}
        </span>
      )}

      {/* Notifications Modal */}
      <Modal
        open={isOpen}
        onClose={handleCloseNotifications}
        title="Értesítések"
      >
        <div className="flex flex-col min-h-0 h-full">
          {/* Scrollable List Container */}
          <div className="flex-1 min-h-0 overflow-y-auto pr-1 py-1 hide-scrollbar">
            {isLoading && notifications.length === 0 ? (
              <div className="flex justify-center items-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-accent-primary border-t-transparent"></div>
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center gap-3">
                <div className="w-16 h-16 rounded-full bg-bg-card border-2 border-border-subtle flex items-center justify-center text-text-tertiary shadow-[0_3px_0_#E5E2E1]">
                  <Bell size={28} />
                </div>
                <p className="font-bold text-sm text-text-secondary">Nincsenek értesítéseid</p>
                <p className="text-xs text-text-tertiary max-w-[220px]">
                  Családtagjaid étel időzítései és értesítései itt fognak megjelenni.
                </p>
              </div>
            ) : (
              notifications.map((notif) => {
                const isUnread = !notif.read
                return (
                  <SwipeableNotification
                    key={notif.id}
                    notif={notif}
                    isUnread={isUnread}
                    unreadCount={unreadCount}
                    setUnreadCount={setUnreadCount}
                    onDelete={handleDeleteNotification}
                    onMarkAsRead={markNotificationAsRead}
                    router={router}
                    setIsOpen={setIsOpen}
                  />
                )
              })
            )}
          </div>

          {/* Pinned Footer: Mark All As Read & Clear All Buttons */}
          {notifications.length > 0 && (
            <div className="mt-4 pt-3 pb-1 border-t border-[#E5E2E1] shrink-0 no-print flex gap-2">
              {/* Mark All As Read */}
              <Button3D
                type="secondary"
                rounded="full"
                disabled={!hasUnread}
                containerProps={{
                  style: {
                    flex: 1,
                    height: "48px",
                    opacity: !hasUnread ? 0.6 : 1,
                    "--button-secondary-color": "#ffffff",
                    "--button-secondary-color-dark": "#E5E2E1",
                    "--button-secondary-color-hover": "#FCF9F8",
                    "--button-secondary-color-light": "#1C1B1B",
                  } as React.CSSProperties
                }}
                onPress={handleMarkAllAsRead}
              >
                <span className="font-nunito font-bold text-sm text-text-primary flex items-center justify-center gap-1.5 truncate">
                  <Check size={14} strokeWidth={3} className={hasUnread ? "text-success-primary" : "text-text-tertiary"} />
                  Mind olvasott
                </span>
              </Button3D>

              {/* Clear All */}
              <Button3D
                type="primary"
                rounded="full"
                containerProps={{
                  style: {
                    flex: 1,
                    height: "48px",
                    "--button-primary-color": "#EF4444",
                    "--button-primary-color-dark": "#DC2626",
                    "--button-primary-color-hover": "#F87171",
                    "--button-primary-color-light": "#FFFFFF",
                  } as React.CSSProperties
                }}
                onPress={handleClearAll}
              >
                <span className="font-nunito font-bold text-sm text-white flex items-center justify-center gap-1.5 truncate">
                  <Trash2 size={14} />
                  Összes törlése
                </span>
              </Button3D>
            </div>
          )}
        </div>
      </Modal>
    </div>
  )
}
