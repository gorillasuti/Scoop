"use client"

import React, { useState, useRef, useEffect } from "react"
import { useSession, signOut } from "next-auth/react"
import { useRouter } from "next/navigation"
import {
  ArrowLeft,
  ChevronRight,
  Check,
  Eye,
  EyeOff,
  Copy,
  ChefHat,
  Salad,
  Soup,
  Utensils,
  Drumstick,
  Fish,
  Apple,
  Coffee,
  CakeSlice,
  Leaf,
  Clock,
  TreePine,
  Egg,
  Bell,
  Download,
  Flame,
} from "lucide-react"
import { Button3D } from "react-3d-button"
import "react-3d-button/styles"
import { updateProfile, changePassword, updateFamilyName, updateUserRoleOrRemove } from "@/app/actions/settings"
import { createInvite } from "@/app/actions/auth"
import { toast } from "sonner"
import gsap from "gsap"
import { useGSAP } from "@gsap/react"
import { UserIcon } from "@/components/animated-icons/user"
import { BrushIcon } from "@/components/animated-icons/brush"
import { CookingPotIcon } from "@/components/animated-icons/cooking-pot"
import { UsersIcon } from "@/components/animated-icons/users"
import { LogoutIcon } from "@/components/animated-icons/logout"
import { AudioLinesIcon } from "@/components/animated-icons/audio-lines"
import { sounds, playSound, haptics } from "@/lib/sounds"

gsap.registerPlugin(useGSAP)

const AVATARS = [
  { id: "Face1-female", path: "/Avatar/Faces/Face1-female.svg", name: "Pimasz" },
  { id: "Face2-female", path: "/Avatar/Faces/Face2-female.svg", name: "Vidám" },
  { id: "Face3-female", path: "/Avatar/Faces/Face3-female.svg", name: "Lelkes" },
  { id: "Face4-female", path: "/Avatar/Faces/Face4-female.svg", name: "Meglepett" },
  { id: "Face1", path: "/Avatar/Faces/Face1.svg", name: "Nyugodt" },
  { id: "Face2", path: "/Avatar/Faces/Face2.svg", name: "Gyanakvó" },
  { id: "Face4", path: "/Avatar/Faces/Face4.svg", name: "Ravasz" },
  { id: "Face5", path: "/Avatar/Faces/Face5.svg", name: "Fáradt" },
  { id: "Face8", path: "/Avatar/Faces/Face8.svg", name: "Vigyorgó" },
]

const PREFERENCE_OPTIONS = [
  { id: "breakfast", label: "Reggeli", icon: <Coffee size={20} /> },
  { id: "soups", label: "Levesek", icon: <Soup size={20} /> },
  { id: "mains", label: "Főételek", icon: <ChefHat size={20} /> },
  { id: "pasta", label: "Tészták", icon: <Flame size={20} /> },
  { id: "onepot", label: "Egytálételek", icon: <Utensils size={20} /> },
  { id: "desserts", label: "Desszertek", icon: <CakeSlice size={20} /> },
  { id: "salads", label: "Saláták", icon: <Salad size={20} /> },
  { id: "baking", label: "Sütés", icon: <Egg size={20} /> },
  { id: "poultry", label: "Szárnyasok", icon: <Drumstick size={20} /> },
  { id: "pork_beef", label: "Sertés & Marha", icon: <Drumstick size={20} /> },
  { id: "vegetarian", label: "Vegetáriánus", icon: <Leaf size={20} /> },
  { id: "quick", label: "Gyors", icon: <Clock size={20} /> },
  { id: "healthy", label: "Egészséges", icon: <Apple size={20} /> },
]

type SettingsView = "main" | "profile" | "avatar" | "preferences" | "password" | "family" | "sounds"

interface UserData {
  id: string
  name: string
  email: string
  image: string
  role: string
  familyName: string
  preferences: string[]
  createdAt: string
}

interface FamilyMember {
  id: string
  name: string
  image: string
  role: string
}

export function SettingsClient({
  user,
  familyMembers = [],
}: {
  user: UserData
  familyMembers?: FamilyMember[]
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const logoutIconRef = useRef<any>(null)
  const router = useRouter()
  const { update: updateSession } = useSession()

  const [view, setView] = useState<SettingsView>("main")
  const [loading, setLoading] = useState(false)

  // Sounds & System state
  const [soundsEnabled, setSoundsEnabled] = useState(true)
  const [hapticsEnabled, setHapticsEnabled] = useState(true)
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission | "unsupported">("default")
  const [wakeLockEnabled, setWakeLockEnabled] = useState(false)
  const [deferredInstallPrompt, setDeferredInstallPrompt] = useState<any>(null)
  const [isPWAInstalled, setIsPWAInstalled] = useState(false)

  useEffect(() => {
    // 1. Sounds
    setSoundsEnabled(sounds.isEnabled())

    // 2. Haptics
    setHapticsEnabled(haptics.isEnabled())

    // 3. Notifications Permission
    if (typeof window !== "undefined") {
      if (!("Notification" in window)) {
        setNotificationPermission("unsupported")
      } else {
        setNotificationPermission(Notification.permission)
      }
    }

    // 4. Wake Lock Preference
    const wl = localStorage.getItem("scoop_wake_lock_enabled")
    setWakeLockEnabled(wl === "true")

    // 5. PWA install and mode detection
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault()
      setDeferredInstallPrompt(e)
    }

    const checkPWAInstalled = () => {
      const isStandalone = window.matchMedia("(display-mode: standalone)").matches ||
        (window.navigator as any).standalone === true
      setIsPWAInstalled(isStandalone)
    }

    if (typeof window !== "undefined") {
      window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt)
      checkPWAInstalled()
    }

    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt)
      }
    }
  }, [])

  // Profile state
  const [name, setName] = useState(user.name)
  const [email, setEmail] = useState(user.email)

  // Avatar state
  const [avatar, setAvatar] = useState(user.image)

  // Preferences state
  const [preferences, setPreferences] = useState<string[]>(user.preferences)

  // Password state
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew] = useState(false)

  // Invite state
  const [inviteLink, setInviteLink] = useState("")
  const [isCopied, setIsCopied] = useState(false)
  const [generatingInvite, setGeneratingInvite] = useState(false)

  // Family Name state (admin only)
  const [familyName, setFamilyName] = useState(user.familyName || "")
  const [savingFamilyName, setSavingFamilyName] = useState(false)

  // Local family members state (to react immediately to changes)
  const [localMembers, setLocalMembers] = useState<FamilyMember[]>(familyMembers)

  const isAdmin = user.role === "ADMIN"

  // Sync prop updates
  useEffect(() => {
    setName(user.name)
  }, [user.name])

  useEffect(() => {
    setEmail(user.email)
  }, [user.email])

  useEffect(() => {
    setAvatar(user.image)
  }, [user.image])

  useEffect(() => {
    setPreferences(user.preferences)
  }, [user.preferences])

  useEffect(() => {
    setFamilyName(user.familyName || "")
  }, [user.familyName])

  useEffect(() => {
    setLocalMembers(familyMembers)
  }, [familyMembers])

  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(`inviteLink_${user.id}`)
      if (stored) {
        try {
          const { link, expiresAt } = JSON.parse(stored)
          if (link && expiresAt && Date.now() < expiresAt) {
            setInviteLink(link)
          } else {
            localStorage.removeItem(`inviteLink_${user.id}`)
          }
        } catch (e) {
          localStorage.removeItem(`inviteLink_${user.id}`)
        }
      }
    }
  }, [user.id])


  const getCompletenessScore = () => {
    let score = 0
    if (name.trim()) score += 25
    if (avatar && avatar !== "Face1") score += 25
    if (preferences.length > 0) score += 25
    if (user.familyName) score += 25
    return score
  }



  useEffect(() => {
    if (view !== "main") {
      document.body.classList.add("hide-global-header")
    } else {
      document.body.classList.remove("hide-global-header")
    }
    return () => {
      document.body.classList.remove("hide-global-header")
    }
  }, [view])

  useGSAP(() => {
    if (view === "avatar") {
      gsap.killTweensOf(".face-btn-active")
      gsap.fromTo(
        ".face-btn-active",
        { scale: 0.95 },
        { scale: 1.03, repeat: -1, yoyo: true, duration: 0.8, ease: "sine.inOut" }
      )
    }
  }, [avatar, view])

  const navigateTo = (target: SettingsView, pushState = true) => {
    if (view === target) return

    const currentPanel = `.settings-panel-${view}`
    const targetPanel = `.settings-panel-${target}`

    const isGoingDeeper = target !== "main"

    if (pushState && typeof window !== "undefined") {
      if (isGoingDeeper) {
        window.history.pushState({ settingsView: target }, "")
      }
    }

    gsap.to(currentPanel, {
      x: isGoingDeeper ? -24 : 24,
      autoAlpha: 0,
      duration: 0.28,
      ease: "power3.inOut",
      onComplete: () => {
        setView(target)
        gsap.fromTo(
          targetPanel,
          { x: isGoingDeeper ? 24 : -24, autoAlpha: 0 },
          { x: 0, autoAlpha: 1, duration: 0.38, ease: "power3.out" }
        )
      },
    })
  }

  const handleBack = () => {
    if (typeof window !== "undefined" && window.history.state?.settingsView) {
      window.history.back()
    } else {
      navigateTo("main")
    }
  }

  useEffect(() => {
    if (typeof window === "undefined") return

    const handlePopState = (event: PopStateEvent) => {
      const targetView = (event.state && event.state.settingsView) || "main"
      navigateTo(targetView, false)
    }

    window.addEventListener("popstate", handlePopState)
    return () => {
      window.removeEventListener("popstate", handlePopState)
    }
  }, [view])

  const handleSaveProfile = async () => {
    setLoading(true)
    const nameEmailChanged = name.trim() !== user.name || email.trim() !== user.email
    const passwordChanged = !!newPassword

    try {
      if (nameEmailChanged) {
        const res = await updateProfile({ name: name.trim(), email: email.trim() })
        if (res.error) {
          toast.error(res.error)
          setLoading(false)
          return
        }
        await updateSession({ name: name.trim(), email: email.trim() })
      }

      if (passwordChanged) {
        if (!currentPassword) {
          toast.error("A jelenlegi jelszó megadása kötelező a jelszó módosításához!")
          setLoading(false)
          return
        }
        const res = await changePassword({ currentPassword, newPassword })
        if (res.error) {
          toast.error(res.error)
          setLoading(false)
          return
        }
      }

      if (!nameEmailChanged && !passwordChanged) {
        toast.error("Nincs módosított adat!")
        setLoading(false)
        return
      }

      toast.success("Profil adatok sikeresen frissítve!")
      setCurrentPassword("")
      setNewPassword("")
      router.refresh()
      setTimeout(() => navigateTo("main"), 1000)
    } catch {
      toast.error("Hiba történt!")
    } finally {
      setLoading(false)
    }
  }

  const handleSaveAvatar = async () => {
    setLoading(true)
    try {
      const res = await updateProfile({ avatar })
      if (res.error) {
        toast.error(res.error)
      } else {
        await updateSession({ image: avatar })
        toast.success("Avatar frissítve!")
        setTimeout(() => navigateTo("main"), 1000)
      }
    } catch {
      toast.error("Hiba történt!")
    } finally {
      setLoading(false)
    }
  }

  const handleSavePreferences = async () => {
    setLoading(true)
    try {
      const res = await updateProfile({ preferences })
      if (res.error) {
        toast.error(res.error)
      } else {
        toast.success("Preferenciák mentve!")
        setTimeout(() => navigateTo("main"), 1000)
      }
    } catch {
      toast.error("Hiba történt!")
    } finally {
      setLoading(false)
    }
  }

  const lastClickRef = useRef(0)

  const handleToggleSounds = (enabled: boolean) => {
    if (enabled === soundsEnabled) return

    const now = Date.now()
    if (now - lastClickRef.current < 400) return
    lastClickRef.current = now

    sounds.setEnabled(enabled)
    setSoundsEnabled(enabled)
    if (enabled) {
      playSound("toggleOn")
      toast.success("Hanghatások bekapcsolva! 🔊", { id: "sounds-toast" })
    } else {
      playSound("toggleOff")
      toast.success("Hanghatások kikapcsolva! 🔇", { id: "sounds-toast" })
    }
  }

  const handleToggleHaptics = (enabled: boolean) => {
    if (enabled === hapticsEnabled) return

    const now = Date.now()
    if (now - lastClickRef.current < 400) return
    lastClickRef.current = now

    haptics.setEnabled(enabled)
    setHapticsEnabled(enabled)
    if (enabled) {
      haptics.trigger("success")
      toast.success("Rezgő visszajelzés bekapcsolva! 📳", { id: "haptics-toast" })
    } else {
      playSound("toggleOff")
      toast.success("Rezgő visszajelzés kikapcsolva! 📴", { id: "haptics-toast" })
    }
  }

  const handleToggleNotifications = async () => {
    const now = Date.now()
    if (now - lastClickRef.current < 400) return
    lastClickRef.current = now

    playSound("toggleOn")
    if (typeof window === "undefined" || !("Notification" in window)) {
      toast.error("Ez a böngésző nem támogatja az értesítéseket.", { id: "notification-toast" })
      return
    }

    if (Notification.permission === "granted") {
      toast.success("Az értesítések már be vannak kapcsolva! 🔔", { id: "notification-toast" })
      window.dispatchEvent(new CustomEvent("trigger-push-subscribe"))
      return
    }

    try {
      const permission = await Notification.requestPermission()
      setNotificationPermission(permission)
      if (permission === "granted") {
        toast.success("Értesítések bekapcsolva! 🔔", { id: "notification-toast" })
        playSound("registrationSuccess")
        window.dispatchEvent(new CustomEvent("trigger-push-subscribe"))
      } else if (permission === "denied") {
        toast.error("Az értesítések le vannak tiltva a böngésződben.", { id: "notification-toast" })
      } else {
        toast.info("Értesítések engedélyezése elhalasztva.", { id: "notification-toast" })
      }
    } catch {
      toast.error("Hiba történt az értesítések engedélyezésekor.", { id: "notification-toast" })
    }
  }

  const handleToggleWakeLock = (enabled: boolean) => {
    if (enabled === wakeLockEnabled) return

    const now = Date.now()
    if (now - lastClickRef.current < 400) return
    lastClickRef.current = now

    setWakeLockEnabled(enabled)
    localStorage.setItem("scoop_wake_lock_enabled", enabled ? "true" : "false")
    if (enabled) {
      playSound("toggleOn")
      toast.success("Képernyő ébrentartása bekapcsolva! 💡", { id: "wakelock-toast" })
    } else {
      playSound("toggleOff")
      toast.success("Képernyő ébrentartása kikapcsolva! 💤", { id: "wakelock-toast" })
    }
  }

  const handleInstallClick = async () => {
    const now = Date.now()
    if (now - lastClickRef.current < 500) return
    lastClickRef.current = now

    playSound("toggleOn")

    if (deferredInstallPrompt) {
      deferredInstallPrompt.prompt()
      const { outcome } = await deferredInstallPrompt.userChoice
      if (outcome === "accepted") {
        toast.success("Köszi, hogy telepítetted a Receptkönyvet! 🎉", { id: "install-toast" })
        setIsPWAInstalled(true)
      }
      setDeferredInstallPrompt(null)
    } else {
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream
      if (isIOS) {
        toast.info(
          "iOS-en való mentéshez: koppints a Megosztás gombra a Safari alján, majd a 'Továbbiak megtekintése' és utolsó lépésként pedig a 'Főképernyőhöz adás' opciót!",
          { id: "install-toast", duration: 8000 }
        )
      } else {
        toast.info(
          "A telepítéshez használd a böngésző menüjét és válaszd a 'Telepítés' vagy 'Főképernyőhöz adás' lehetőséget!",
          { id: "install-toast", duration: 8000 }
        )
      }
    }
  }

  const handleSaveFamilyName = async () => {
    if (!familyName.trim()) {
      toast.error("A családnév nem lehet üres!")
      return
    }
    setSavingFamilyName(true)
    try {
      const res = await updateFamilyName(familyName.trim())
      if (res.error) {
        toast.error(res.error)
      } else {
        toast.success("Családnév sikeresen frissítve!")
        await updateSession({ familyName: familyName.trim() })
        router.refresh()
      }
    } catch {
      toast.error("Hiba történt a mentés során!")
    } finally {
      setSavingFamilyName(false)
    }
  }

  const handleUserAction = async (targetUserId: string, action: "MAKE_ADMIN" | "MAKE_USER" | "REMOVE") => {
    setLoading(true)
    try {
      const res = await updateUserRoleOrRemove(targetUserId, action)
      if (res.error) {
        toast.error(res.error)
      } else {
        toast.success(
          action === "MAKE_ADMIN"
            ? "Felhasználó adminisztrátorrá téve!"
            : action === "MAKE_USER"
              ? "Felhasználó taggá alakítva!"
              : "Felhasználó eltávolítva a családból!"
        )

        if (action === "REMOVE") {
          playSound("delete")
          setLocalMembers((prev) => prev.filter((m) => m.id !== targetUserId))
        } else {
          setLocalMembers((prev) =>
            prev.map((m) =>
              m.id === targetUserId
                ? { ...m, role: action === "MAKE_ADMIN" ? "ADMIN" : "USER" }
                : m
            )
          )
        }
        router.refresh()
      }
    } catch {
      toast.error("Sikertelen művelet!")
    } finally {
      setLoading(false)
    }
  }

  const handleGenerateInvite = async () => {
    setGeneratingInvite(true)
    try {
      const res = await createInvite({ maxUses: 20, expiresInDays: 30 })
      if (res.error) {
        toast.error(res.error)
      } else if (res.inviteToken) {
        const link = `${window.location.origin}/register?token=${res.inviteToken}`
        setInviteLink(link)
        const expiresAt = Date.now() + 30 * 24 * 60 * 60 * 1000 // 30 days
        localStorage.setItem(
          `inviteLink_${user.id}`,
          JSON.stringify({ link, expiresAt })
        )
        toast.success("Meghívó link elkészült!")
      }
    } catch {
      toast.error("Hiba történt!")
    } finally {
      setGeneratingInvite(false)
    }
  }

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(inviteLink)
      setIsCopied(true)
      toast.success("Link másolva!", { id: "copy-link" })
      setTimeout(() => setIsCopied(false), 2000)
    } catch {
      toast.error("Nem sikerült másolni!")
    }
  }

  const togglePreference = (pref: string) => {
    setPreferences((prev) =>
      prev.includes(pref) ? prev.filter((p) => p !== pref) : [...prev, pref]
    )
  }

  const handleLogout = async () => {
    await signOut({ redirectTo: "/login" })
  }

  return (
    <main ref={containerRef} className="flex flex-col h-full max-h-full overflow-hidden bg-bg-primary w-full pb-28 max-w-5xl mx-auto">
      {/* ===================== MAIN VIEW ===================== */}
      <div className={`settings-panel-main h-full flex flex-col justify-between ${view === "main" ? "" : "hidden"}`}>
        <div className="flex-1 overflow-y-auto hide-scrollbar py-4 flex flex-col gap-5">
          {/* Profile Card */}
          <section className="px-4 md:px-8">
            <div className="relative bg-white border-2 border-border-default rounded-3xl shadow-[0_4px_0_#E5E2E1] p-5 flex items-center gap-5">
              <div className="w-[72px] h-[72px] flex-shrink-0 p-2 rounded-full border-2 border-border-default bg-[#E9F0FD] overflow-hidden shadow-[0_3px_0_#E5E2E1] flex items-center justify-center">
                <img
                  src={`/Avatar/Faces/${avatar}.svg`}
                  alt="Avatar"
                  className={`object-contain object-center transition-all duration-200 ${avatar.includes("-female") ? "w-[92%] h-[92%]" : "w-[80%] h-[80%]"
                    }`}
                />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="font-nunito font-black text-xl text-text-primary truncate">{user.name}</h2>
                <p className="text-text-tertiary text-sm font-medium truncate">{user.email}</p>
                {user.familyName && (
                  <p className="text-accent-primary text-xs font-bold mt-1">
                    {user.familyName}
                  </p>
                )}
              </div>
              {isAdmin && (
                <span className="absolute top-4 right-4 bg-accent-primary text-white text-[10px] font-black px-2.5 py-1 rounded-full ">
                  Admin
                </span>
              )}
            </div>
          </section>

          {/* Profile Completeness */}
          <section className="px-4 md:px-8">
            <div className="bg-white border-2 border-border-default rounded-3xl p-5 shadow-[0_4px_0_#E5E2E1]">
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-sm text-text-secondary">Profil kitöltöttsége</span>
                <span className="font-black text-sm text-accent-primary">{getCompletenessScore()}%</span>
              </div>
              {/* 3D Progress Bar */}
              <div className="h-6 w-full bg-[#F0EDED] border-2 border-border-default rounded-full overflow-hidden shadow-inner flex items-center p-0.5">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#007BFF] to-[#00C6FF] border-r-2 border-border-default shadow-[inset_0_2px_4px_rgba(255,255,255,0.4)] transition-all duration-500 ease-out"
                  style={{ width: `${getCompletenessScore()}%` }}
                />
              </div>
              <p className="text-[11px] text-text-tertiary font-nunito  font-bold mt-2 text-center">
                {getCompletenessScore() === 100
                  ? "Hurráá! A profilod 100%-ban kész! 🌟"
                  : "Töltsd ki a hiányzó adatokat a 100%-os szinthez!"}
              </p>
            </div>
          </section>

          {/* Menu Items */}
          <section className="px-4 md:px-8 flex flex-col gap-3">
            <SettingsMenuItem
              icon={<UserIcon size={20} className="text-accent-primary group-hover:text-white transition-colors duration-200" />}
              label="Profil szerkesztése"
              description={`${user.name} • ${user.email}`}
              onClick={() => navigateTo("profile")}
            />
            <SettingsMenuItem
              icon={<AudioLinesIcon size={20} className="text-accent-primary group-hover:text-white transition-colors duration-200" />}
              label="Hangok & Rendszer"
              description="Értesítések, hangok, rezgések és ébrentartás"
              onClick={() => navigateTo("sounds")}
            />
            <SettingsMenuItem
              icon={<BrushIcon size={20} className="text-accent-primary group-hover:text-white transition-colors duration-200" />}
              label="Avatar módosítása"
              description={AVATARS.find((a) => a.id === avatar)?.name || "Nyugodt"}
              onClick={() => navigateTo("avatar")}
            />
            <SettingsMenuItem
              icon={<CookingPotIcon size={20} className="text-accent-primary group-hover:text-white transition-colors duration-200" />}
              label="Preferenciák"
              description={`${preferences.length} kiválasztva`}
              onClick={() => navigateTo("preferences")}
            />

            {/* Family Members & Invite */}
            <SettingsMenuItem
              icon={<UsersIcon size={20} className="text-accent-primary group-hover:text-white transition-colors duration-200" />}
              label="Családtagok & Meghívó"
              description={`${localMembers.length} tag • meghívó`}
              onClick={() => navigateTo("family")}
            />

            {/* Divider */}
            <div className="h-px bg-border-subtle my-1" />

            {/* Logout */}
            <button
              onClick={handleLogout}
              onMouseEnter={() => logoutIconRef.current?.startAnimation?.()}
              onMouseLeave={() => logoutIconRef.current?.stopAnimation?.()}
              className="flex items-center gap-4 bg-white border-2 border-accent-red/20 rounded-2xl shadow-[0_4px_0_rgba(220,53,69,0.15)] px-5 py-4 cursor-pointer transition-all duration-200 hover:translate-y-[2px] hover:shadow-[0_2px_0_rgba(220,53,69,0.15)] active:translate-y-[3px] active:shadow-none group text-left w-full"
            >
              <div className="w-10 h-10 rounded-xl bg-accent-red/10 flex items-center justify-center text-accent-red group-hover:bg-accent-red group-hover:text-white transition-colors duration-200 flex-shrink-0">
                <LogoutIcon ref={logoutIconRef} size={20} className="text-accent-red group-hover:text-white transition-colors duration-200" />
              </div>
              <span className="font-bold text-accent-red text-[15px]">Kijelentkezés</span>
            </button>
          </section>
        </div>
      </div>

      {/* ===================== PROFILE EDIT ===================== */}
      <div className={`settings-panel-profile h-full flex flex-col justify-start ${view === "profile" ? "" : "hidden"}`}>
        <SubpageHeader title="Profil szerkesztése" onBack={handleBack} />

        <div className="flex-1 flex flex-col justify-between max-w-sm mx-auto w-full px-4 md:px-8 pb-6 min-h-0 gap-4">
          <div className="flex-1 overflow-y-auto hide-scrollbar flex flex-col gap-4 py-1">
            {/* Név */}
            <div>
              <label htmlFor="settings-name-input" className="font-nunito font-black text-sm text-text-secondary mb-2 block">
                Név
              </label>
              <div className="relative flex items-center bg-white border-2 border-border-default rounded-2xl px-4 h-12 shadow-[0_3px_0_#E5E2E1] transition-all duration-200 ease-out focus-within:translate-y-[2px] focus-within:shadow-[0_2px_0_#007bff] focus-within:border-[#007bff]">
                <input
                  id="settings-name-input"
                  className="w-full bg-transparent border-none outline-none font-bold text-text-primary placeholder:text-text-tertiary p-0 text-sm"
                  placeholder="A neved"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label htmlFor="settings-email-input" className="font-nunito font-black text-sm text-text-secondary mb-2 block">
                Email cím
              </label>
              <div className="relative flex items-center bg-white border-2 border-border-default rounded-2xl px-4 h-12 shadow-[0_3px_0_#E5E2E1] transition-all duration-200 ease-out focus-within:translate-y-[2px] focus-within:shadow-[0_2px_0_#007bff] focus-within:border-[#007bff]">
                <input
                  id="settings-email-input"
                  type="email"
                  className="w-full bg-transparent border-none outline-none font-bold text-text-primary placeholder:text-text-tertiary p-0 text-sm"
                  placeholder="Email címed"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            {/* Current password */}
            <div>
              <label htmlFor="settings-current-password" className="font-nunito font-black text-sm text-text-secondary mb-2 block">
                Jelenlegi jelszó (csak jelszóváltoztatáshoz)
              </label>
              <div className="relative flex items-center bg-white border-2 border-border-default rounded-2xl px-4 h-12 shadow-[0_3px_0_#E5E2E1] transition-all duration-200 ease-out focus-within:translate-y-[2px] focus-within:shadow-[0_2px_0_#007bff] focus-within:border-[#007bff]">
                <input
                  id="settings-current-password"
                  type={showCurrent ? "text" : "password"}
                  className="w-full bg-transparent border-none outline-none font-bold text-text-primary placeholder:text-text-tertiary p-0 text-sm pr-10"
                  placeholder="••••••••"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                />
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => setShowCurrent(!showCurrent)}
                  className="absolute right-4 text-text-tertiary hover:text-text-primary transition-colors cursor-pointer"
                >
                  {showCurrent ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* New password */}
            <div>
              <label htmlFor="settings-new-password" className="font-nunito font-black text-sm text-text-secondary mb-2 block">
                Új jelszó
              </label>
              <div className="relative flex items-center bg-white border-2 border-border-default rounded-2xl px-4 h-12 shadow-[0_3px_0_#E5E2E1] transition-all duration-200 ease-out focus-within:translate-y-[2px] focus-within:shadow-[0_2px_0_#007bff] focus-within:border-[#007bff]">
                <input
                  id="settings-new-password"
                  type={showNew ? "text" : "password"}
                  className="w-full bg-transparent border-none outline-none font-bold text-text-primary placeholder:text-text-tertiary p-0 text-sm pr-10"
                  placeholder="Min. 8 karakter"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => setShowNew(!showNew)}
                  className="absolute right-4 text-text-tertiary hover:text-text-primary transition-colors cursor-pointer"
                >
                  {showNew ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Password strength indicator */}
            {newPassword.length > 0 && (
              <div className="flex gap-1.5 mt-1">
                {[1, 2, 3, 4].map((level) => {
                  const strength =
                    newPassword.length >= 12
                      ? 4
                      : newPassword.length >= 10
                        ? 3
                        : newPassword.length >= 8
                          ? 2
                          : 1
                  const colors = ["bg-accent-red", "bg-orange-400", "bg-yellow-400", "bg-green-500"]
                  return (
                    <div
                      key={level}
                      className={`flex-1 h-1 rounded-full transition-all duration-300 ${level <= strength ? colors[strength - 1] : "bg-bg-elevated"
                        }`}
                    />
                  )
                })}
              </div>
            )}
          </div>

          <div className="shrink-0 flex flex-col gap-4">
            <Button3D
              className="w-full cursor-pointer"
              type="primary"
              fullWidth
              rounded="full"
              size="xl"
              disabled={loading || (!name.trim() && !email.trim()) || (name.trim() === user.name && email.trim() === user.email && !newPassword)}
              onPress={handleSaveProfile}
            >
              {loading ? "Mentés..." : "Mentés"}
            </Button3D>

          </div>
        </div>
      </div>

      {/* ===================== AVATAR EDIT ===================== */}
      <div className={`settings-panel-avatar h-full flex flex-col ${view === "avatar" ? "" : "hidden"}`}>
        <SubpageHeader title="Avatar módosítása" onBack={handleBack} />

        <div className="flex-1 flex flex-col justify-between max-w-sm mx-auto w-full px-4 md:px-8 pt-4 pb-6 min-h-0 gap-4">
          {/* Current Avatar Preview */}
          <div className="flex flex-col items-center gap-2 shrink-0">
            <div className="w-[clamp(72px,12vh,96px)] h-[clamp(72px,12vh,96px)] p-2 rounded-full border-2 border-accent-primary bg-[#E9F0FD] shadow-[0_3px_0_#0056b3] flex items-center justify-center">
              <img
                src={`/Avatar/Faces/${avatar}.svg`}
                alt="Selected Avatar"
                className={`object-contain object-center avatar-preview transition-all duration-200 ${avatar.includes("-female") ? "w-[92%] h-[92%]" : "w-[80%] h-[80%]"
                  }`}
              />
            </div>
            <span className="bg-[#E9F0FD] text-accent-primary font-bold text-xs px-3.5 py-1 rounded-full font-nunito border border-accent-primary/20 shadow-[0_2px_0_rgba(0,123,255,0.15)]">
              Karakter: {AVATARS.find((a) => a.id === avatar)?.name} 🎭
            </span>
          </div>

          {/* Grid of Faces */}
          <div className="grid grid-cols-3 gap-[clamp(6px,1.2vh,12px)] w-full max-w-[clamp(180px,30vh,260px)] mx-auto shrink-0">
            {AVATARS.map((av) => {
              const isSelected = avatar === av.id
              return (
                <button
                  key={av.id}
                  onClick={() => {
                    setAvatar(av.id)
                    gsap.fromTo(
                      ".avatar-preview",
                      { scale: 0.85, rotate: -8 },
                      { scale: 1, rotate: 0, duration: 0.4, ease: "elastic.out(1.2, 0.4)" }
                    )
                  }}
                  className={`face-btn relative aspect-square rounded-2xl flex items-center justify-center p-2 transition-all duration-200 cursor-pointer border-2
                    ${isSelected
                      ? "border-[#007BFF] shadow-[0_3px_0_#0056b3] bg-white translate-y-[-1px] face-btn-active"
                      : "border-[#E5E2E1] shadow-[0_3px_0_#E5E2E1] bg-[#FAF7F6] hover:bg-white"
                    }`}
                >
                  <img
                    src={av.path}
                    alt={av.name}
                    className={`object-contain pointer-events-none transition-all duration-200 ${av.id.includes("-female") ? "w-[92%] h-[92%]" : "w-[80%] h-[80%]"
                      }`}
                  />
                </button>
              )
            })}
          </div>

          <Button3D
            className="w-full cursor-pointer shrink-0"
            type="primary"
            fullWidth
            rounded="full"
            size="xl"
            disabled={loading || avatar === user.image}
            onPress={handleSaveAvatar}
          >
            {loading ? "Mentés..." : "Mentés"}
          </Button3D>
        </div>
      </div>

      {/* ===================== PREFERENCES EDIT ===================== */}
      <div className={`settings-panel-preferences h-full flex flex-col ${view === "preferences" ? "" : "hidden"}`}>
        <SubpageHeader title="Preferenciák" onBack={handleBack} />

        <div className="flex-1 flex flex-col justify-between max-w-sm mx-auto w-full px-4 md:px-8 gap-4 pt-4 pb-6 min-h-0">
          <p className="text-text-secondary text-xs font-semibold text-center max-w-xs mx-auto shrink-0">
            Válaszd ki a kedvenc kategóriáidat, hogy személyre szabjuk a scoopet.
          </p>

          <div className="flex-1 min-h-0 overflow-y-auto hide-scrollbar flex flex-wrap justify-center content-start gap-2 py-1 font-nunito">
            {PREFERENCE_OPTIONS.map((pref) => {
              const isSelected = preferences.includes(pref.id)
              return (
                <button
                  key={pref.id}
                  onClick={() => togglePreference(pref.id)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-full border-2 transition-all duration-200 font-bold text-xs select-none cursor-pointer
                    ${isSelected
                      ? "border-[#007BFF] shadow-[0_2px_0_#0056b3] bg-[#007BFF] text-white translate-y-[1px]"
                      : "border-[#E5E2E1] shadow-[0_2.5px_0_#E5E2E1] bg-white text-text-secondary hover:translate-y-[-1px] hover:shadow-[0_3px_0_#D5D2D1] hover:text-text-primary"
                    }`}
                >
                  {pref.icon}
                  {pref.label}
                </button>
              )
            })}
          </div>

          <Button3D
            className="w-full cursor-pointer shrink-0"
            type="primary"
            fullWidth
            rounded="full"
            size="xl"
            disabled={loading}
            onPress={handleSavePreferences}
          >
            {loading ? "Mentés..." : "Mentés"}
          </Button3D>
        </div>
      </div>



      {/* ===================== FAMILY MEMBERS & INVITE MERGED ===================== */}
      <div className={`settings-panel-family h-full flex flex-col justify-start ${view === "family" ? "" : "hidden"}`}>
        <SubpageHeader title="Családtagok" onBack={handleBack} />

        <div className="flex-1 flex flex-col justify-start max-w-sm mx-auto w-full px-4 md:px-8 pb-4 overflow-hidden gap-4 pt-4">
          {/* Family name card */}
          <div className="bg-white border-2 border-border-default rounded-2xl p-4 shadow-[0_3px_0_#E5E2E1] flex flex-col gap-2.5 w-full shrink-0">
            <label className="font-nunito font-black text-sm text-text-secondary block">
              Családnév {isAdmin ? "(Szerkesztés)" : ""}
            </label>
            {isAdmin ? (
              <div className="flex gap-2 items-center">
                <div className="relative flex-1 flex items-center bg-white border-2 border-border-default rounded-2xl px-4 h-12 shadow-[0_3px_0_#E5E2E1] transition-all duration-200 ease-out focus-within:translate-y-[2px] focus-within:shadow-[0_2px_0_#007bff] focus-within:border-[#007bff]">
                  <input
                    type="text"
                    className="w-full bg-transparent border-none outline-none font-bold text-text-primary placeholder:text-text-tertiary p-0 text-sm"
                    placeholder="Családod neve"
                    value={familyName}
                    onChange={(e) => setFamilyName(e.target.value)}
                  />
                </div>
                <Button3D
                  type="primary"
                  size="md"
                  rounded="xl"
                  containerProps={{ style: { height: "48px" } }}
                  disabled={savingFamilyName || !familyName.trim() || familyName.trim() === user.familyName}
                  onPress={handleSaveFamilyName}
                >
                  {savingFamilyName ? "..." : "Mentés"}
                </Button3D>
              </div>
            ) : (
              <div className="bg-[#FAF7F6] border-2 border-border-default rounded-xl px-3 py-2 shadow-inner">
                <p className="font-bold text-text-primary text-sm">
                  {user.familyName || "Nincs családnév megadva"}
                </p>
              </div>
            )}
          </div>

          {/* Members List */}
          <div className="flex-1 flex flex-col min-h-0 w-full">
            <h3 className="font-nunito font-black text-sm text-text-secondary mb-2">Tagok listája</h3>
            <div className="flex-1 overflow-y-auto hide-scrollbar flex flex-col gap-2.5 pr-0.5">
              {localMembers.length === 0 ? (
                <div className="bg-white border-2 border-border-default rounded-2xl p-4 text-center shadow-[0_3px_0_#E5E2E1] flex flex-col items-center gap-2">
                  <div className="w-10 h-10 rounded-xl bg-[#E9F0FD] flex items-center justify-center text-[#007BFF]">
                    <UsersIcon size={20} />
                  </div>
                  <p className="text-text-tertiary text-xs font-bold">
                    Nincs más családtag a csoportban.
                  </p>
                </div>
              ) : (
                localMembers.map((member) => (
                  <div
                    key={member.id}
                    className="bg-white border-2 border-border-default rounded-2xl p-3 shadow-[0_3px_0_#E5E2E1] flex flex-col gap-2"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 flex-shrink-0 p-1 rounded-full border border-border-default bg-[#E9F0FD] overflow-hidden flex items-center justify-center">
                        <img
                          src={`/Avatar/Faces/${member.image}.svg`}
                          alt={member.name}
                          className="w-full h-full object-contain object-center"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-lg text-text-primary truncate">{member.name}</h3>
                        <p className="text-sm font-medium text-text-tertiary ">
                          {member.role === "ADMIN" ? "Admin" : "Családtag"}
                        </p>
                      </div>
                    </div>
                    {/* Admin Actions */}
                    {isAdmin && (
                      <div className="flex gap-2 mt-1">
                        <Button3D
                          type={member.role === "ADMIN" ? "secondary" : "primary"}
                          size="sm"
                          rounded="xl"
                          className="flex-1"
                          disabled={loading}
                          onPress={() => handleUserAction(member.id, member.role === "ADMIN" ? "MAKE_USER" : "MAKE_ADMIN")}
                        >
                          {member.role === "ADMIN" ? "Tag státusz" : "Adminná tétel"}
                        </Button3D>
                        <Button3D
                          type="secondary"
                          size="sm"
                          rounded="xl"
                          className="flex-1 text-accent-red"
                          disabled={loading}
                          onPress={() => handleUserAction(member.id, "REMOVE")}
                        >
                          Eltávolítás
                        </Button3D>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Invite Generator merged at bottom */}
          <div className="bg-[#FAF7F6] border-2 border-dashed border-border-default rounded-2xl p-3 shrink-0 flex flex-col gap-2 w-full">
            <div className="flex items-center gap-2">
              <Bell size={16} className="text-accent-primary shrink-0" />
              <h4 className="font-nunito font-black text-sm text-text-secondary">Meghívó generálása</h4>
            </div>
            <p className="text-[11px] font-semibold text-text-tertiary leading-tight">
              Hívj meg másokat a családba. A link 30 napig érvényes.
            </p>

            {!inviteLink ? (
              <Button3D
                type="primary"
                fullWidth
                rounded="xl"
                size="md"
                disabled={generatingInvite}
                onPress={handleGenerateInvite}
              >
                {generatingInvite ? "Generálás..." : "Link generálása 🔗"}
              </Button3D>
            ) : (
              <div className="relative font-nunito flex items-center bg-white border-2 border-border-default rounded-2xl pl-4 pr-2 h-12 shadow-[0_3px_0_#E5E2E1] transition-all duration-200 ease-out focus-within:translate-y-[2px] focus-within:shadow-[0_2px_0_#007bff] focus-within:border-[#007bff]">
                <input
                  type="text"
                  readOnly
                  value={inviteLink}
                  className="bg-transparent border-none outline-none flex-1 text-text-primary text-xs font-bold truncate pr-2"
                  onClick={(e) => e.currentTarget.select()}
                />
                <div className="shrink-0 flex items-center">
                  <Button3D
                    type={isCopied ? "secondary" : "primary"}
                    iconOnly
                    size="sm"
                    rounded="full"
                    containerProps={{ style: { width: '32px', height: '32px' } }}
                    onPress={copyToClipboard}
                  >
                    <div className="relative w-4 h-4 flex items-center justify-center">
                      <Check
                        size={16}
                        className={`absolute text-[#007BFF] transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${isCopied ? 'opacity-100 scale-100 rotate-0' : 'opacity-0 scale-50 -rotate-90'}`}
                      />
                      <Copy
                        size={16}
                        className={`absolute transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${!isCopied ? 'opacity-100 scale-100 rotate-0' : 'opacity-0 scale-50 rotate-90'}`}
                      />
                    </div>
                  </Button3D>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ===================== SOUND SETTINGS ===================== */}
      <div className={`settings-panel-sounds h-full flex flex-col justify-start ${view === "sounds" ? "" : "hidden"}`}>
        <SubpageHeader title="Hangok & Rendszer" onBack={handleBack} />

        <div className="flex-1 overflow-y-auto hide-scrollbar flex flex-col justify-start max-w-sm mx-auto w-full px-4 md:px-8 gap-5 pt-2 pb-6">
          {/* Sounds & Haptics Card */}
          <div className="bg-white border-2 border-border-default rounded-3xl p-5 shadow-[0_4px_0_#E5E2E1] flex flex-col gap-4">
            <h3 className="font-nunito font-black text-sm text-text-secondary border-b border-border-subtle pb-2 flex items-center gap-2">
              <AudioLinesIcon size={16} className="text-accent-primary" />
              Hangok és Rezgések
            </h3>

            {/* Sounds Switch */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-bold text-sm text-text-primary block">Hanghatások</span>
                  <span className="text-[11px] text-text-tertiary font-nunito ">Kattintások és sikeres műveletek hangja</span>
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button3D
                    type={soundsEnabled ? "primary" : "secondary"}
                    rounded="xl"
                    size="sm"
                    onPress={() => handleToggleSounds(true)}
                    containerProps={{ "data-sound": "off", style: { width: "50px", height: "32px" } } as any}
                  >
                    Be
                  </Button3D>
                  <Button3D
                    type={!soundsEnabled ? "primary" : "secondary"}
                    rounded="xl"
                    size="sm"
                    onPress={() => handleToggleSounds(false)}
                    containerProps={{ "data-sound": "off", style: { width: "50px", height: "32px" } } as any}
                  >
                    Ki
                  </Button3D>
                </div>
              </div>
            </div>

            {/* Haptics Switch */}
            <div className="flex flex-col gap-2 pt-2 border-t border-dashed border-border-subtle">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-bold text-sm text-text-primary block">Rezgő visszajelzés</span>
                  <span className="text-[11px] text-text-tertiary font-nunito ">Finom haptikus rezgés gomboknál</span>
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button3D
                    type={hapticsEnabled ? "primary" : "secondary"}
                    rounded="xl"
                    size="sm"
                    onPress={() => handleToggleHaptics(true)}
                    containerProps={{ "data-sound": "off", style: { width: "50px", height: "32px" } } as any}
                  >
                    Be
                  </Button3D>
                  <Button3D
                    type={!hapticsEnabled ? "primary" : "secondary"}
                    rounded="xl"
                    size="sm"
                    onPress={() => handleToggleHaptics(false)}
                    containerProps={{ "data-sound": "off", style: { width: "50px", height: "32px" } } as any}
                  >
                    Ki
                  </Button3D>
                </div>
              </div>
            </div>
          </div>

          {/* Notifications & Wake Lock Card */}
          <div className="bg-white border-2 border-border-default rounded-3xl p-5 shadow-[0_4px_0_#E5E2E1] flex flex-col gap-4">
            <h3 className="font-nunito font-black text-sm text-text-secondary border-b border-border-subtle pb-2 flex items-center gap-2">
              <Bell size={16} className="text-accent-primary" />
              Értesítések & Kijelző
            </h3>

            {/* Push Notifications Switch */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-bold text-sm text-text-primary block flex items-center gap-1.5">
                    Push Értesítések
                    <span className={`text-[9px] px-2 py-0.5 rounded-full font-black uppercase ${notificationPermission === "granted"
                      ? "bg-green-100 text-green-700"
                      : notificationPermission === "denied"
                        ? "bg-red-100 text-red-700"
                        : "bg-amber-100 text-amber-700"
                      }`}>
                      {notificationPermission === "granted"
                        ? "Aktív"
                        : notificationPermission === "denied"
                          ? "Tiltva"
                          : "Kérdez"}
                    </span>
                  </span>
                  <span className="text-[11px] text-text-tertiary font-nunito ">Új étel időzítések azonnali értesítései</span>
                </div>
                {notificationPermission !== "granted" && (
                  <Button3D
                    type="primary"
                    rounded="xl"
                    size="sm"
                    onPress={handleToggleNotifications}
                    containerProps={{ style: { height: "32px" } } as any}
                  >
                    Bekapcsolás
                  </Button3D>
                )}
              </div>
              {notificationPermission === "denied" && (
                <p className="text-[10px] font-semibold text-accent-red mt-1 leading-normal">
                  Az értesítések le vannak tiltva. Az engedélyezéshez nyisd meg a böngésző vagy telefonod beállításait!
                </p>
              )}
            </div>

            {/* Wake Lock Switch */}
            <div className="flex flex-col gap-2 pt-2 border-t border-dashed border-border-subtle">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-bold text-sm text-text-primary block">Képernyő ébrentartása</span>
                  <span className="text-[11px] text-text-tertiary font-nunito ">Nem engedi elaludni a kijelzőt főzés közben</span>
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button3D
                    type={wakeLockEnabled ? "primary" : "secondary"}
                    rounded="xl"
                    size="sm"
                    onPress={() => handleToggleWakeLock(true)}
                    containerProps={{ "data-sound": "off", style: { width: "50px", height: "32px" } } as any}
                  >
                    Be
                  </Button3D>
                  <Button3D
                    type={!wakeLockEnabled ? "primary" : "secondary"}
                    rounded="xl"
                    size="sm"
                    onPress={() => handleToggleWakeLock(false)}
                    containerProps={{ "data-sound": "off", style: { width: "50px", height: "32px" } } as any}
                  >
                    Ki
                  </Button3D>
                </div>
              </div>
            </div>
          </div>

          {/* Download App Card */}
          <div className="bg-white border-2 border-border-default rounded-3xl p-5 shadow-[0_4px_0_#E5E2E1] flex flex-col gap-4">
            <h3 className="font-nunito font-black text-sm text-text-secondary border-b border-border-subtle pb-2 flex items-center gap-2">
              <Download size={16} className="text-accent-primary" />
              Alkalmazás telepítése
            </h3>

            <div className="flex flex-col gap-3">
              <p className="text-xs text-text-secondary font-medium leading-relaxed">
                Telepítsd az alkalmazást a főképernyődre a gyors eléréshez és a natív mobil élményért!
              </p>

              {isPWAInstalled ? (
                <div className="flex items-center justify-center gap-2 p-3 bg-green-50 border border-green-200 rounded-2xl text-green-700 font-bold text-xs">
                  <Check size={16} strokeWidth={3} />
                  Az alkalmazás sikeresen telepítve! 📱
                </div>
              ) : (
                <Button3D
                  type="primary"
                  rounded="xl"
                  size="md"
                  fullWidth
                  onPress={handleInstallClick}
                  containerProps={{ style: { height: "42px" } } as any}
                >
                  Letöltés / Telepítés 📱
                </Button3D>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}

/* ===================== SUB COMPONENTS ===================== */

function SubpageHeader({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <header className="px-4 md:px-8 pt-6 flex items-center gap-4 mb-4">
      <Button3D
        type="secondary"
        iconOnly
        rounded="full"
        onPress={() => {
          playSound("swipe")
          onBack()
        }}
        className="cursor-pointer"
      >
        <ArrowLeft size={22} />
      </Button3D>
      <h1 className="font-nunito font-black text-2xl text-text-primary">{title}</h1>
    </header>
  )
}


function SettingsMenuItem({
  icon,
  label,
  description,
  onClick,
}: {
  icon: React.ReactElement
  label: string
  description?: string
  onClick: () => void
}) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const iconRef = useRef<any>(null)

  const handleMouseEnter = () => {
    iconRef.current?.startAnimation?.()
  }

  const handleMouseLeave = () => {
    iconRef.current?.stopAnimation?.()
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const iconWithRef = React.cloneElement(icon as React.ReactElement<any>, { ref: iconRef })

  return (
    <button
      onClick={onClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className="flex items-center gap-4 bg-white border-2 border-border-default rounded-2xl shadow-[0_4px_0_#E5E2E1] px-5 py-4 cursor-pointer transition-all duration-200 hover:translate-y-[2px] hover:shadow-[0_2px_0_#E5E2E1] active:translate-y-[3px] active:shadow-none w-full text-left group"
    >
      <div className="w-10 h-10 rounded-xl bg-[#E9F0FD] flex items-center justify-center text-accent-primary group-hover:bg-[#007BFF] group-hover:text-white transition-colors duration-200 flex-shrink-0">
        {iconWithRef}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-bold text-sm text-text-primary">{label}</p>
        {description && (
          <p className="text-text-tertiary text-xs font-semibold truncate mt-0.5">{description}</p>
        )}
      </div>
      <ChevronRight size={18} className="text-text-tertiary flex-shrink-0" />
    </button>
  )
}
