"use client"

import { useState, useEffect, useRef, useMemo } from "react"
import { useRouter } from "next/navigation"
import {
  Search,
  Soup,
  Utensils,
  ChefHat,
  CakeSlice,
  Leaf,
  Drumstick,
  Apple,
  Clock,
  Calendar,
  Plus,
  Bell,
  Check,
  X,
  ClipboardList,
  Coffee,
  Fish,
  TreePine,
  Egg,
  Salad,
  Signal,
  Trash2,
  Flame,
} from "lucide-react"
import { RecipeCard } from "@/components/recipe/recipe-card"
import { Button3D } from "react-3d-button"
import "react-3d-button/styles"
import { Modal } from "@/components/ui/modal"
import { createNotification, markNotificationAsRead, markAllNotificationsAsRead, deleteNotification, getUnreadNotifications, getRecentNotifications } from "@/app/actions/notifications"
import { createMealPlan, deleteMealPlan } from "@/app/actions/meals"
import {
  getActiveShoppingList,
  saveShoppingListRecipes,
  toggleShoppingListItemKey,
  setShoppingListShared,
  clearShoppingList
} from "@/app/actions/shopping"
import { playSound } from "@/lib/sounds"
import { toast } from "sonner"
import { SwipeableNotification } from "@/components/layout/bell-button"

const CATEGORIES = [
  { id: 'all', label: 'Összes', icon: <Utensils size={15} /> },
  { id: 'breakfast', label: 'Reggeli', icon: <Coffee size={15} /> },
  { id: 'soups', label: 'Levesek', icon: <Soup size={15} /> },
  { id: 'mains', label: 'Főételek', icon: <ChefHat size={15} /> },
  { id: 'pasta', label: 'Tészták', icon: <Flame size={15} /> },
  { id: 'onepot', label: 'Egytálételek', icon: <Utensils size={15} /> },
  { id: 'desserts', label: 'Desszertek', icon: <CakeSlice size={15} /> },
  { id: 'salads', label: 'Saláták', icon: <Salad size={15} /> },
  { id: 'baking', label: 'Sütés', icon: <Egg size={15} /> },
  { id: 'poultry', label: 'Szárnyasok', icon: <Drumstick size={15} /> },
  { id: 'pork_beef', label: 'Sertés & Marha', icon: <Drumstick size={15} /> },
  { id: 'vegetarian', label: 'Vegetáriánus', icon: <Leaf size={15} /> },
  { id: 'quick', label: 'Gyors', icon: <Clock size={15} /> },
  { id: 'healthy', label: 'Egészséges', icon: <Apple size={15} /> },
]

const getDailySeed = () => {
  // Shift time by 6 hours backwards, so 06:00 AM becomes 00:00 AM of the same day.
  const adjustedDate = new Date(Date.now() - 6 * 3600 * 1000)
  const year = adjustedDate.getFullYear()
  const month = String(adjustedDate.getMonth() + 1).padStart(2, "0")
  const day = String(adjustedDate.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

const formatDateStr = (date: Date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

const getDayName = (date: Date) => {
  const names = ["Vasárnap", "Hétfő", "Kedd", "Szerda", "Csütörtök", "Péntek", "Szombat"]
  return names[date.getDay()]
}

const getMonthName = (date: Date) => {
  const names = ["Jan", "Feb", "Már", "Ápr", "Máj", "Jún", "Júl", "Aug", "Sze", "Okt", "Nov", "Dec"]
  return names[date.getMonth()]
}

interface HomeClientProps {
  currentUser: any
  initialRecipes: any[]
  initialNotifications: any[]
  initialMealPlans: any[]
  familyMembers: any[]
  userPreferences: string[]
  initialShoppingList?: {
    id?: string
    userId?: string
    recipeIds: string[]
    checkedKeys: string[]
    isShared: boolean
    familyName?: string | null
    ownerName?: string | null
    sharedWithIds?: string[]
  }
}

export function HomeClient({
  currentUser,
  initialRecipes,
  initialNotifications,
  initialMealPlans,
  familyMembers,
  userPreferences,
  initialShoppingList,
}: HomeClientProps) {
  const router = useRouter()
  const isSavingListRef = useRef(false)
  const [selectedCategory, setSelectedCategory] = useState("all")
  const [notifications, setNotifications] = useState(initialNotifications)
  const [mealPlans, setMealPlans] = useState(initialMealPlans)
  const [showRequestModal, setShowRequestModal] = useState(false)
  const [isRequestPending, setIsRequestPending] = useState(false)
  const [showEditMealPlanModal, setShowEditMealPlanModal] = useState(false)
  const [isDeletingMeal, setIsDeletingMeal] = useState<string | null>(null)

  // Interactive Filters
  const selectedMemberFilter = null

  // Shopping List States
  const [showShoppingModal, setShowShoppingModal] = useState(false)
  const [selectedRecipesForShopping, setSelectedRecipesForShopping] = useState<string[]>([])
  const [shoppingModalSearchQuery, setShoppingModalSearchQuery] = useState("")
  const [shoppingModalCategory, setShoppingModalCategory] = useState("all")

  // Reset shopping list modal filters on close
  useEffect(() => {
    if (!showShoppingModal) {
      setShoppingModalSearchQuery("")
      setShoppingModalCategory("all")
    }
  }, [showShoppingModal])

  const modalFilteredRecipes = useMemo(() => {
    const normalize = (str: string) =>
      str
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim()

    const query = normalize(shoppingModalSearchQuery)

    return initialRecipes.filter((recipe) => {
      // 1. Category filter
      if (shoppingModalCategory !== "all") {
        const matchesCategory =
          recipe.category === shoppingModalCategory ||
          (recipe.tags && recipe.tags.includes(shoppingModalCategory))
        if (!matchesCategory) return false
      }

      // 2. Text query filter
      if (query) {
        const matchesTitle = normalize(recipe.title).includes(query)
        const matchesIngredients =
          recipe.ingredients &&
          recipe.ingredients.some((ing: any) => normalize(ing.name).includes(query))
        if (!matchesTitle && !matchesIngredients) return false
      }

      return true
    })
  }, [initialRecipes, shoppingModalSearchQuery, shoppingModalCategory])

  const [activeShoppingRecipes, setActiveShoppingRecipes] = useState<string[]>(initialShoppingList?.recipeIds || [])
  const [checkedIngredients, setCheckedIngredients] = useState<Record<string, boolean>>(() => {
    const checked: Record<string, boolean> = {}
    if (initialShoppingList?.checkedKeys) {
      initialShoppingList.checkedKeys.forEach(key => {
        checked[key] = true
      })
    }
    return checked
  })
  const [isShoppingListShared, setIsShoppingListShared] = useState(initialShoppingList?.isShared || false)
  const [shoppingListOwnerName, setShoppingListOwnerName] = useState(initialShoppingList?.ownerName || null)
  const [sharedWithIds, setSharedWithIds] = useState<string[]>(initialShoppingList?.sharedWithIds || [])

  // Sync state when initialShoppingList prop changes
  useEffect(() => {
    if (initialShoppingList) {
      setActiveShoppingRecipes(initialShoppingList.recipeIds || [])
      const checked: Record<string, boolean> = {}
      if (initialShoppingList.checkedKeys) {
        initialShoppingList.checkedKeys.forEach(key => {
          checked[key] = true
        })
      }
      setCheckedIngredients(checked)
      setIsShoppingListShared(initialShoppingList.isShared || false)
      setShoppingListOwnerName(initialShoppingList.ownerName || null)
      setSharedWithIds(initialShoppingList.sharedWithIds || [])
    }
  }, [initialShoppingList])

  // Polling to keep shared family lists in sync
  useEffect(() => {
    const interval = setInterval(async () => {
      if (isSavingListRef.current) return

      const res = await getActiveShoppingList()
      if (res.success && res.shoppingList) {
        if (isSavingListRef.current) return

        const newList = res.shoppingList
        const hasRecipesChanged = JSON.stringify(newList.recipeIds) !== JSON.stringify(activeShoppingRecipes)
        const currentCheckedKeys = Object.keys(checkedIngredients).filter(k => checkedIngredients[k])
        const hasCheckedChanged = JSON.stringify([...newList.checkedKeys].sort()) !== JSON.stringify([...currentCheckedKeys].sort())
        const hasSharedWithChanged = JSON.stringify([...(newList.sharedWithIds || [])].sort()) !== JSON.stringify([...sharedWithIds].sort())

        if (hasRecipesChanged || hasCheckedChanged || newList.isShared !== isShoppingListShared || newList.ownerName !== shoppingListOwnerName || hasSharedWithChanged) {
          setActiveShoppingRecipes(newList.recipeIds || [])
          const checked: Record<string, boolean> = {}
          if (newList.checkedKeys) {
            newList.checkedKeys.forEach((key: string) => {
              checked[key] = true
            })
          }
          setCheckedIngredients(checked)
          setIsShoppingListShared(newList.isShared)
          setShoppingListOwnerName(newList.ownerName)
          setSharedWithIds(newList.sharedWithIds || [])
        }
      }
    }, 8000)

    return () => clearInterval(interval)
  }, [activeShoppingRecipes, checkedIngredients, isShoppingListShared, shoppingListOwnerName, sharedWithIds])

  // Polling to keep notifications in sync
  useEffect(() => {
    const interval = setInterval(async () => {
      const res = await getRecentNotifications()
      if (res.success && res.notifications) {
        const currentIds = notifications.map(n => n.id).sort().join(",")
        const newIds = res.notifications.map((n: any) => n.id).sort().join(",")
        const currentReads = notifications.map(n => n.read).sort().join(",")
        const newReads = res.notifications.map((n: any) => n.read).sort().join(",")

        if (currentIds !== newIds || currentReads !== newReads) {
          setNotifications(res.notifications)
          const unreadCount = res.notifications.filter((n: any) => !n.read).length
          window.dispatchEvent(new CustomEvent("unread-notifications-count", {
            detail: { count: unreadCount }
          }))
        }
      }
    }, 8000)

    return () => clearInterval(interval)
  }, [notifications])

  // Helper to update active shopping recipes
  const saveShoppingList = async (recipeIds: string[]) => {
    isSavingListRef.current = true
    setActiveShoppingRecipes(recipeIds)

    // Clean up checkedIngredients that are no longer in the list
    const cleanedChecked: Record<string, boolean> = {}
    recipeIds.forEach(id => {
      const recipe = initialRecipes.find(r => r.id === id)
      if (recipe && recipe.rawIngredients) {
        recipe.rawIngredients.forEach((ing: any) => {
          const key = `${id}-${ing.name}`
          if (checkedIngredients[key]) {
            cleanedChecked[key] = true
          }
        })
      }
    })
    setCheckedIngredients(cleanedChecked)

    // Save to database
    try {
      const res = await saveShoppingListRecipes(recipeIds)
      if (res.success && res.shoppingList) {
        setActiveShoppingRecipes(res.shoppingList.recipeIds || [])
        setIsShoppingListShared(res.shoppingList.isShared || false)
        setSharedWithIds(res.shoppingList.sharedWithIds || [])
        setShoppingListOwnerName(res.shoppingList.ownerName || null)
      }
    } catch (err) {
      console.error(err)
    } finally {
      isSavingListRef.current = false
    }
  }

  const toggleIngredientCheck = async (recipeId: string, ingName: string) => {
    const key = `${recipeId}-${ingName}`
    const isChecked = !checkedIngredients[key]

    isSavingListRef.current = true
    // Optimistic update
    setCheckedIngredients(prev => ({ ...prev, [key]: isChecked }))

    // Save to database
    try {
      const res = await toggleShoppingListItemKey(key, isChecked)
      if (res.success && res.checkedKeys) {
        const checked: Record<string, boolean> = {}
        res.checkedKeys.forEach((k: string) => {
          checked[k] = true
        })
        setCheckedIngredients(checked)
      }
    } catch (err) {
      console.error(err)
    } finally {
      isSavingListRef.current = false
    }
  }

  const [showShareModal, setShowShareModal] = useState(false)
  const [selectedShareMembers, setSelectedShareMembers] = useState<string[]>([])
  const [isShareSaving, setIsShareSaving] = useState(false)

  // Sync selected members with sharedWithIds state when opening modal
  useEffect(() => {
    if (showShareModal) {
      setSelectedShareMembers(sharedWithIds)
    }
  }, [showShareModal, sharedWithIds])

  const handleSaveShareSettings = async () => {
    setIsShareSaving(true)
    isSavingListRef.current = true
    playSound("radio")
    try {
      const res = await setShoppingListShared(selectedShareMembers)
      if (res.error) {
        toast.error(res.error)
      } else {
        const nextShared = selectedShareMembers.length > 0
        setIsShoppingListShared(nextShared)
        setSharedWithIds(selectedShareMembers)
        toast.success(nextShared ? "Bevásárlólista megosztási beállításai mentve! 👥" : "Megosztás visszavonva.")
        setShowShareModal(false)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setIsShareSaving(false)
      isSavingListRef.current = false
    }
  }

  // Request Food Form State
  const [selectedRecipientId, setSelectedRecipientId] = useState(currentUser?.id || familyMembers[0]?.id || "")
  const [selectedRecipeId, setSelectedRecipeId] = useState(initialRecipes[0]?.id || "")
  const [recipeSearchQuery, setRecipeSearchQuery] = useState("")
  const [requestDate, setRequestDate] = useState(formatDateStr(new Date()))
  const [customMessage, setCustomMessage] = useState("")
  const [showRecipeDropdown, setShowRecipeDropdown] = useState(false)

  // Sync state with props
  useEffect(() => {
    setNotifications(initialNotifications)
  }, [initialNotifications])

  useEffect(() => {
    setMealPlans(initialMealPlans)
  }, [initialMealPlans])

  // Sync notification events
  useEffect(() => {
    const handleSyncRead = (e: Event) => {
      const customEvent = e as CustomEvent<{ id: string }>
      const id = customEvent.detail?.id
      setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, read: true } : n))
    }

    const handleSyncDelete = (e: Event) => {
      const customEvent = e as CustomEvent<{ id: string }>
      const id = customEvent.detail?.id
      setNotifications((prev) => prev.filter((n) => n.id !== id))
    }

    const handleSyncReadAll = () => {
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
    }

    const handleSyncDeleteAll = () => {
      setNotifications([])
    }

    window.addEventListener("sync-notification-read", handleSyncRead)
    window.addEventListener("sync-notification-delete", handleSyncDelete)
    window.addEventListener("sync-notification-read-all", handleSyncReadAll)
    window.addEventListener("sync-notification-delete-all", handleSyncDeleteAll)

    return () => {
      window.removeEventListener("sync-notification-read", handleSyncRead)
      window.removeEventListener("sync-notification-delete", handleSyncDelete)
      window.removeEventListener("sync-notification-read-all", handleSyncReadAll)
      window.removeEventListener("sync-notification-delete-all", handleSyncDeleteAll)
    }
  }, [])

  // Get next 7 days starting today
  const weekDays = (() => {
    const days = []
    const today = new Date()
    for (let i = 0; i < 7; i++) {
      const d = new Date(today)
      d.setDate(today.getDate() + i)
      days.push(d)
    }
    return days
  })()

  // Handle Mark Single Notification As Read
  const handleMarkAsRead = async (id: string) => {
    await markNotificationAsRead(id)
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))

    // Sync header bell badge count
    const unreadCount = notifications.filter(n => !n.read && n.id !== id).length
    window.dispatchEvent(new CustomEvent("unread-notifications-count", {
      detail: { count: unreadCount }
    }))

    // Sync header bell button list
    window.dispatchEvent(new CustomEvent("sync-notification-read", {
      detail: { id }
    }))
  }

  // Handle Mark All As Read
  const handleDismissAll = async () => {
    playSound("registrationSuccess")
    await markAllNotificationsAsRead()
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
    window.dispatchEvent(new CustomEvent("unread-notifications-count", {
      detail: { count: 0 }
    }))
    // Dispatch sync read-all event
    window.dispatchEvent(new CustomEvent("sync-notification-read-all"))
  }

  // Handle Delete Notification on Swipe
  const handleDeleteNotification = async (id: string) => {
    playSound("delete")
    await deleteNotification(id)
    setNotifications((prev) => prev.filter((n) => n.id !== id))

    // Update unread count
    const res = await getUnreadNotifications()
    if (res.success && res.notifications) {
      window.dispatchEvent(new CustomEvent("unread-notifications-count", {
        detail: { count: res.notifications.length }
      }))
    }
    window.dispatchEvent(new CustomEvent("sync-notification-delete", {
      detail: { id }
    }))
  }

  // Handle Food Request Submit
  const handleSendRequest = async () => {
    if (isRequestPending) return
    setIsRequestPending(true)

    const recipe = initialRecipes.find(r => r.id === selectedRecipeId)
    const recipient = selectedRecipientId === currentUser?.id
      ? currentUser
      : familyMembers.find(m => m.id === selectedRecipientId)

    if (!recipe || !recipient) {
      toast.error("Válassz ki egy receptet és egy családtagot!")
      setIsRequestPending(false)
      return
    }

    const isSelf = selectedRecipientId === currentUser?.id
    const message = customMessage.trim() || (isSelf
      ? `Saját magamnak terveztem a(z) "${recipe.title}" ételt ${requestDate} napra.`
      : `Szeretném, ha elkészítenéd a ${recipe.title} ételt ${requestDate} napra!`)

    // Create both a MealPlan (for Heti menü) and a Notification (for the bell feed)
    const [mealRes, notifRes] = await Promise.all([
      createMealPlan({
        userId: selectedRecipientId,
        recipeId: selectedRecipeId,
        date: requestDate,
        message,
      }),
      createNotification({
        userId: selectedRecipientId,
        title: isSelf ? "Saját tervezés" : "Új étel Időzítés",
        message,
        recipeId: selectedRecipeId,
        date: requestDate,
      }),
    ])

    if (mealRes.success && notifRes.success) {
      const successMsg = isSelf
        ? "Időzítés sikeresen hozzáadva a saját naptáradhoz!"
        : `Időzítés elküldve ${recipient.name} részére!`
      toast.success(successMsg, { id: "request-sent-success" })
      setShowRequestModal(false)
      setCustomMessage("")

      // Refresh page data
      router.refresh()
    } else {
      toast.error(mealRes.error || notifRes.error || "Hiba történt a Időzítés elküldésekor.")
    }

    setIsRequestPending(false)
  }

  const handleDeleteMealPlan = async (mealId: string) => {
    playSound("delete")
    setIsDeletingMeal(mealId)
    try {
      const res = await deleteMealPlan(mealId)
      if (res.error) {
        toast.error(res.error)
      } else {
        setMealPlans((prev) => prev.filter((mp: any) => mp.id !== mealId))
        toast.success("Kért étel sikeresen törölve a heti menüből!")
        router.refresh()
      }
    } catch (err) {
      console.error(err)
      toast.error("Hiba történt a kért étel törlése során.")
    } finally {
      setIsDeletingMeal(null)
    }
  }

  // Filter recipes based on selected category
  const filteredRecipes = initialRecipes.filter(r => {
    if (selectedCategory === "all") return true
    return r.category === selectedCategory || (r.tags && r.tags.includes(selectedCategory))
  })

  // Filter notifications based on selected family member filter
  const filteredNotifications = notifications.filter(n => {
    if (!selectedMemberFilter) return true
    // Filter by sender or recipient
    return n.senderId === selectedMemberFilter || n.userId === selectedMemberFilter
  })

  // Filter recipes for dropdown autocomplete
  const dropdownRecipes = initialRecipes.filter(r =>
    r.title.toLowerCase().includes(recipeSearchQuery.toLowerCase())
  )

  // Dynamic Category list prioritizing user preferences
  const visibleCategories = useMemo(() => {
    const allItem = CATEGORIES.find((c) => c.id === "all")!
    if (userPreferences.length === 0) {
      return CATEGORIES
    }
    const preferredItems = CATEGORIES.filter((c) => userPreferences.includes(c.id))
    const otherItems = CATEGORIES.filter((c) => c.id !== "all" && !userPreferences.includes(c.id))
    return [allItem, ...preferredItems, ...otherItems]
  }, [userPreferences])

  // Highlight Recipe of the Day (Spotlight)
  // Deterministic pick based on current user's ID string hash, userPreferences and daily seed (shifting at 06:00 AM).
  const spotlightRecipe = (() => {
    const pool = initialRecipes.filter(r => userPreferences.includes(r.category || ""))
    const finalPool = pool.length > 0 ? pool : initialRecipes
    if (finalPool.length === 0) return null

    const dailySeed = getDailySeed()
    const userIdStr = currentUser?.id || "guest"
    const seedString = `${userIdStr}-${dailySeed}`

    let hash = 0
    for (let i = 0; i < seedString.length; i++) {
      hash = seedString.charCodeAt(i) + ((hash << 5) - hash)
    }
    const index = Math.abs(hash) % finalPool.length
    return finalPool[index]
  })()

  const hasUnread = notifications.some(n => !n.read)
  const unreadCount = notifications.filter(n => !n.read).length

  return (
    <main className="flex flex-col h-full overflow-hidden bg-bg-primary w-full pb-28 max-w-5xl mx-auto">
      <div className="flex-1 min-h-0 overflow-y-auto hide-scrollbar flex flex-col pb-6">
        {/* Search Input Field (same style as filter page) */}
        <section className="px-4 md:px-8 mb-5 pt-2 shrink-0 flex flex-col gap-3">
          <div
            onClick={() => {
              playSound("inputFocusOn")
              router.push("/kereses?focus=true")
            }}
            className="relative flex items-center bg-white border-2 border-border-default rounded-2xl px-4 h-12 shadow-[0_3px_0_#E5E2E1] cursor-pointer hover:border-text-tertiary transition-all active:translate-y-[2px] active:shadow-[0_2px_0_#007bff] group"
          >
            <Search className="text-text-tertiary mr-3" size={20} />
            <span className="w-full bg-transparent border-none outline-none font-nunito font-bold text-text-tertiary p-0 text-sm">
              Mit főznél ma?
            </span>
          </div>
        </section>

        {/* Row 1: Értesítések & Napi ajánlat (Desktop/Tablet) */}
        <section className="px-4 md:px-8 mb-6 grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch shrink-0">
          {/* Card 1: Értesítések & Quick Actions */}
          <div className="border-2 border-border-default bg-white rounded-3xl p-5 shadow-[0_4px_0_#E5E2E1] flex flex-col h-[380px]">
            <div className="flex items-center justify-between mb-4 shrink-0">
              <div className="flex items-center gap-2">
                <div>
                  <h3 className="font-nunito font-black text-base text-text-primary">Értesítések</h3>
                  <p className="font-nunito font-semibold text-[11px] text-text-tertiary">Családtagok legutóbbi kérései</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                {hasUnread && (
                  <div data-sound="off">
                    <Button3D
                      type="secondary"
                      rounded="full"
                      containerProps={{
                        style: {
                          height: "28px",
                          "--button-secondary-color": "#FFF8EE",
                          "--button-secondary-color-dark": "#FFE2C5",
                          "--button-secondary-color-hover": "#FFFDF9",
                          "--button-secondary-color-light": "#FF6B35",
                        } as React.CSSProperties
                      }}
                      onPress={handleDismissAll}
                    >
                      <span className="font-nunito font-bold text-[10px] px-2 text-[#FF6B35]">Összes olvasott</span>
                    </Button3D>
                  </div>
                )}
              </div>
            </div>

            {/* List of Notifications */}
            <div className="flex-1 overflow-y-auto pr-1 hide-scrollbar flex flex-col gap-2.5 mb-4">
              {filteredNotifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center text-text-tertiary py-4">
                  <div className="w-12 h-12 rounded-2xl bg-[#FFF8EE] border-2 border-[#FFE2C5] flex items-center justify-center mb-2 shadow-[0_3px_0_#FFE2C5] text-[#FF6B35]">
                    <Bell size={20} />
                  </div>
                  <p className="text-xs font-bold font-nunito text-text-secondary">Nincsenek friss hírek</p>
                  <p className="text-[10px] font-nunito max-w-[200px] mt-0.5">
                    Itt jelennek meg az új kérések és jelzések.
                  </p>
                </div>
              ) : (
                filteredNotifications.map((notif) => {
                  const isUnread = !notif.read
                  return (
                    <SwipeableNotification
                      key={notif.id}
                      notif={notif}
                      isUnread={isUnread}
                      unreadCount={unreadCount}
                      onDelete={handleDeleteNotification}
                      onMarkAsRead={handleMarkAsRead}
                      router={router}
                    />
                  )
                })
              )}
            </div>

            {/* Quick Actions Panel at the Bottom */}
            <div className="grid grid-cols-2 gap-3 pt-3 border-t border-border-subtle shrink-0">
              <div data-sound="off">
                <Button3D
                  type="primary"
                  rounded="full"
                  fullWidth
                  containerProps={{
                    style: {
                      height: "42px",
                      "--button-primary-color": "#FF6B35",
                      "--button-primary-color-dark": "#E85A28",
                      "--button-primary-color-hover": "#FF7B48",
                      "--button-primary-color-light": "#FFFFFF",
                    } as React.CSSProperties
                  }}
                  onPress={() => {
                    setShowRequestModal(true)
                  }}
                >
                  <span className="font-nunito font-bold text-xs text-white flex items-center justify-center gap-1">
                    <Plus size={13} />
                    Időzítés
                  </span>
                </Button3D>
              </div>

              <div data-sound="off">
                <Button3D
                  type="primary"
                  rounded="full"
                  fullWidth
                  containerProps={{
                    style: {
                      height: "42px",
                      "--button-primary-color": "#10B981",
                      "--button-primary-color-dark": "#059669",
                      "--button-primary-color-hover": "#34D399",
                      "--button-primary-color-light": "#FFFFFF",
                    } as React.CSSProperties
                  }}
                  onPress={() => {
                    setSelectedRecipesForShopping(activeShoppingRecipes)
                    setShowShoppingModal(true)
                  }}
                >
                  <span className="font-nunito font-bold text-xs text-white flex items-center justify-center gap-1">
                    <ClipboardList size={13} className="text-white" />
                    Kosár
                  </span>
                </Button3D>
              </div>
            </div>
          </div>

          {/* Spotlight Recipe (Napi ajánlat) - Desktop/Tablet Only */}
          {spotlightRecipe && (
            <div className="hidden md:block w-full">
              <div
                onClick={() => router.push(`/recept/${spotlightRecipe.id}`)}
                className="border-2 border-[#FF6B35] rounded-3xl bg-white shadow-[0_4px_0_#FFB347] cursor-pointer overflow-hidden flex flex-col h-auto group hover:border-[#FF5414] transition-all duration-200 active:translate-y-[2px] active:shadow-[0_2px_0_#FFB347]"
              >
                {/* Recipe Image Header */}
                <div className="relative h-48 w-full bg-bg-subtle overflow-hidden shrink-0">
                  <div
                    className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-105"
                    style={{ backgroundImage: `url('${spotlightRecipe.imageUrl}')` }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />

                  {/* Badge on top of image */}
                  <div className="absolute top-3 left-3 z-10" onClick={(e) => e.stopPropagation()}>
                    <span className="inline-block font-nunito text-[10px] font-black px-2.5 py-1 border-2 border-[#FF6B35] bg-[#FFF8EE] text-[#FF6B35] rounded-full shadow-[0_2px_0_#FFE2C5]">
                      Napi ajánlat
                    </span>
                  </div>
                </div>

                {/* Content Area */}
                <div className="p-5 flex flex-col gap-3 min-h-0">
                  <div className="flex flex-col gap-1.5 min-h-0">
                    <h3 className="font-nunito font-black text-base md:text-lg text-text-primary group-hover:text-[#FF6B35] transition-colors leading-tight line-clamp-1">
                      {spotlightRecipe.title}
                    </h3>

                    <p className="font-nunito text-xs text-text-secondary font-semibold line-clamp-2 md:line-clamp-3 leading-relaxed overflow-hidden">
                      {spotlightRecipe.description || "Egy különleges, ízletes és tápláló étel a mai napra, a család kedvenc hozzávalóiból."}
                    </p>
                  </div>

                  <div className="flex items-center pt-2 border-t border-[#E5E2E1] shrink-0">
                    {/* Tactile Metadata Badges Row */}
                    <div className="flex flex-nowrap items-center gap-1 overflow-x-auto hide-scrollbar select-none w-full pb-1.5 pt-0.5">
                      {/* Time Badge */}
                      <div className="flex items-center gap-1 px-1.5 py-0.5 text-[9px] font-extrabold bg-[#F5F3FF] text-[#7C3AED] border border-[#DDD6FE] shadow-[0_1px_0_#DDD6FE] rounded-lg font-nunito flex-shrink-0">
                        <Clock size={11} className="text-[#7C3AED] flex-shrink-0" />
                        <span>{spotlightRecipe.time}</span>
                      </div>

                      {/* Difficulty Badge */}
                      <div className={`flex items-center gap-1 px-1.5 py-0.5 text-[9px] font-extrabold border rounded-lg font-nunito flex-shrink-0 ${spotlightRecipe.difficulty === "Könnyű"
                        ? "bg-[#E8F8F0] border-[#A7E6C5] text-[#15803D] shadow-[0_1px_0_#A7E6C5]"
                        : spotlightRecipe.difficulty === "Közepes"
                          ? "bg-[#FFF4E5] border-[#FFD39B] text-[#B25E00] shadow-[0_1px_0_#FFD39B]"
                          : "bg-[#FEECEE] border-[#FCA5A5] text-[#B91C1C] shadow-[0_1px_0_#FCA5A5]"
                        }`}>
                        <Signal size={11} className="flex-shrink-0" />
                        <span>{spotlightRecipe.difficulty}</span>
                      </div>

                      {/* Servings Badge */}
                      <div className="flex items-center gap-0.5 px-1.5 py-0.5 text-[9px] font-extrabold bg-[#FFF9F5] border border-[#FFE2C5] text-[#FF9F43] shadow-[0_1px_0_#FFE2C5] rounded-lg font-nunito flex-shrink-0">
                        <span>🍽️ {spotlightRecipe.servings || 4} adag</span>
                      </div>

                      {/* Ingredients Badge */}
                      {spotlightRecipe.ingredients && spotlightRecipe.ingredients.length > 0 && (
                        <div className="flex items-center gap-0.5 px-1.5 py-0.5 text-[9px] font-extrabold bg-[#F0FDF4] border border-[#BBF7D0] text-[#16A34A] shadow-[0_1px_0_#BBF7D0] rounded-lg font-nunito flex-shrink-0">
                          <span>🥕 {spotlightRecipe.ingredients.length} db</span>
                        </div>
                      )}

                      {/* Author Badge */}
                      {spotlightRecipe.authorName && (
                        <div className="flex items-center gap-0.5 px-1.5 py-0.5 text-[9px] font-extrabold bg-[#E9F0FD] border border-[#BDD6FF] text-[#007BFF] shadow-[0_1px_0_#BDD6FF] rounded-lg font-nunito flex-shrink-0">
                          <span>🧑‍🍳 {spotlightRecipe.authorName}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* Row 2: Heti Menü */}
        <section className="px-4 md:px-8 mb-6 shrink-0">
          <div className="border-2 border-border-default bg-white rounded-3xl p-5 shadow-[0_4px_0_#E5E2E1] flex flex-col h-[380px]">
            <div className="flex items-center justify-between mb-4 shrink-0">
              <div>
                <h3 className="font-nunito font-black text-base text-text-primary">Heti menü</h3>
                <p className="font-nunito font-semibold text-[11px] text-text-tertiary">A hét tervezett családi étkezései</p>
              </div>
              <div data-sound="off">
                <Button3D
                  type="primary"
                  rounded="full"
                  containerProps={{
                    style: {
                      height: "28px",
                      "--button-primary-color": "#8B5CF6",
                      "--button-primary-color-dark": "#6D28D9",
                      "--button-primary-color-hover": "#9F75FF",
                      "--button-primary-color-light": "#FFFFFF",
                    } as React.CSSProperties
                  }}
                  onPress={() => {
                    setShowEditMealPlanModal(true)
                  }}
                >
                  <span className="font-nunito font-bold text-[10px] px-2 text-white">Szerkesztés</span>
                </Button3D>
              </div>
            </div>

            {/* Vertical Days List */}
            <div className="flex-1 overflow-y-auto pr-1 hide-scrollbar flex flex-col gap-2.5">
              {weekDays.map((date, idx) => {
                const dateStr = formatDateStr(date)
                const isToday = idx === 0
                const meals = mealPlans.filter((mp: any) => mp.date === dateStr)

                // Apply member filtering if selected
                const filteredMeals = meals.filter((m: any) => !selectedMemberFilter || m.creatorId === selectedMemberFilter || m.userId === selectedMemberFilter)
                const hasMeals = filteredMeals.length > 0

                return (
                  <div
                    key={dateStr}
                    className={`flex items-center gap-3 p-3 rounded-2xl border-2 transition-all
                    ${isToday
                        ? "border-[#FF6B35] bg-[#FFF8EE] shadow-[0_3px_0_#FFE2C5]"
                        : "border-border-default bg-white shadow-[0_3px_0_#E5E2E1]"
                      }`}
                  >
                    {/* Left Column: Date Badge */}
                    <div className={`flex flex-col items-center justify-center w-[54px] h-[54px] rounded-2xl border-2 flex-shrink-0 text-center shadow-[0_3px_0_#E5E2E1]
                    ${isToday
                        ? "bg-[#FF6B35] border-[#FF6B35] text-white shadow-[0_2px_0_#D45624]"
                        : "bg-[#FAF7F6] border-border-default text-text-primary"
                      }`}
                    >
                      <span className={`font-nunito text-[10px] font-bold leading-none mb-0.5
                      ${isToday ? "text-[#FFF8EE]" : "text-text-tertiary"}`}
                      >
                        {getDayName(date).slice(0, 3)}
                      </span>
                      <span className={`font-nunito text-lg font-black leading-none
                      ${isToday ? "text-white" : "text-text-primary"}`}
                      >
                        {date.getDate()}
                      </span>
                    </div>

                    {/* Middle Column: Meal info */}
                    <div className="flex-1 min-w-0">
                      {hasMeals ? (
                        <div className="flex flex-col gap-1">
                          {filteredMeals.map((meal: any) => {
                            const recipe = initialRecipes.find(r => r.id === meal.recipeId)
                            return (
                              <div
                                key={meal.id}
                                onClick={() => {
                                  if (meal.recipeId) {
                                    playSound("inputFocusOn")
                                    router.push(`/recept/${meal.recipeId}`)
                                  }
                                }}
                                className="cursor-pointer hover:underline font-nunito font-bold text-xs text-text-primary truncate"
                              >
                                {recipe?.title || meal.message}
                              </div>
                            )
                          })}
                        </div>
                      ) : (
                        <span className="font-nunito text-xs text-text-tertiary font-bold">
                          Nincs időzített étel
                        </span>
                      )}
                    </div>

                    {/* Right Column: Avatar/Actions */}
                    <div className="flex-shrink-0">
                      {hasMeals ? (
                        <div className="flex -space-x-2">
                          {filteredMeals.map((meal: any) => (
                            <div
                              key={meal.id}
                              className="w-7 h-7 rounded-full overflow-hidden border border-white bg-bg-card p-0.5 shadow-sm"
                              title={meal.creator?.name || "Családtag"}
                            >
                              <img
                                src={`/Avatar/Faces/${meal.creator?.image || "Face1"}.svg`}
                                alt={meal.creator?.name || "Kérő"}
                                className="w-full h-full object-contain"
                              />
                            </div>
                          ))}
                        </div>
                      ) : (
                        <button
                          data-sound="off"
                          onClick={() => {
                            setRequestDate(dateStr)
                            setShowRequestModal(true)
                          }}
                          className="w-8 h-8 rounded-full border-2 border-dashed border-border-default hover:border-[#FF6B35] hover:bg-[#FFF8EE] flex items-center justify-center text-text-tertiary hover:text-[#FF6B35] cursor-pointer"
                        >
                          <Plus size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>


          </div>
        </section>

        {/* Row 3: Bevásárlólista */}
        {activeShoppingRecipes.length > 0 && (
          <section className="px-4 md:px-8 mb-6 shrink-0">
            <div className="border-2 border-border-default bg-white rounded-3xl p-5 shadow-[0_4px_0_#E5E2E1] flex flex-col h-[380px]">
              <div className="flex items-center justify-between mb-4 shrink-0">
                <div>
                  <h3 className="font-nunito font-black text-base text-text-primary flex items-center gap-2">
                    Bevásárlólista
                    {isShoppingListShared && (
                      <span className="text-[9px] font-black px-2 py-0.5 border border-[#10B981] bg-[#E6FDF4] text-[#10B981] rounded-full shadow-[0_1px_0_#B2F5DA] whitespace-nowrap animate-pulse">
                        Megosztott
                      </span>
                    )}
                  </h3>
                  <p className="font-nunito font-semibold text-[11px] text-text-tertiary">
                    {shoppingListOwnerName
                      ? `${shoppingListOwnerName} által megosztott lista`
                      : "Scoop alapján összesített hozzávalók"
                    }
                  </p>
                </div>

                {/* Share Button (Vibrant and Dynamic) */}
                {!shoppingListOwnerName && currentUser?.familyName && (
                  <div data-sound="off">
                    <Button3D
                      type="primary"
                      rounded="full"
                      containerProps={{
                        style: {
                          height: "28px",
                          ...(isShoppingListShared ? {
                            "--button-primary-color": "#10B981",
                            "--button-primary-color-dark": "#059669",
                            "--button-primary-color-hover": "#34D399",
                            "--button-primary-color-light": "#ffffff",
                          } : {
                            "--button-primary-color": "#FF6B35",
                            "--button-primary-color-dark": "#E85A28",
                            "--button-primary-color-hover": "#FF7B48",
                            "--button-primary-color-light": "#ffffff",
                          })
                        } as React.CSSProperties
                      }}
                      onPress={() => {
                        playSound("inputFocusOn")
                        setShowShareModal(true)
                      }}
                    >
                      <span className="font-nunito font-bold text-[9px] px-1.5 flex items-center gap-1">
                        {isShoppingListShared ? "Megosztva" : "Megosztás"}
                      </span>
                    </Button3D>
                  </div>
                )}
              </div>

              {/* List divided by recipe */}
              <div className="flex-1 overflow-y-auto pr-1 hide-scrollbar flex flex-col gap-4 mb-4">
                {activeShoppingRecipes.map(recipeId => {
                  const recipe = initialRecipes.find(r => r.id === recipeId)
                  if (!recipe) return null
                  return (
                    <div key={recipeId} className="border-b border-border-subtle last:border-b-0 pb-3 last:pb-0">
                      <h4 className="font-nunito font-bold text-xs text-text-primary mb-2 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#10B981]" />
                        {recipe.title}
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                        {recipe.rawIngredients && recipe.rawIngredients.length > 0 ? (
                          recipe.rawIngredients.map((ing: any) => {
                            const isChecked = checkedIngredients[`${recipeId}-${ing.name}`]
                            return (
                              <div
                                key={ing.name}
                                onClick={() => toggleIngredientCheck(recipeId, ing.name)}
                                className={`flex items-center justify-between p-3 rounded-2xl border-2 transition-all cursor-pointer select-none
                                  ${isChecked
                                    ? "border-border-default bg-bg-card text-text-tertiary shadow-[0_1px_0_#E5E2E1] translate-y-[2px]"
                                    : "border-border-default bg-white text-text-primary shadow-[0_3px_0_#E5E2E1] translate-y-0 active:translate-y-[1px] active:shadow-none"
                                  }`}
                              >
                                <div className="flex items-center gap-3 min-w-0 flex-1">
                                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all
                                    ${isChecked
                                      ? "border-[#10B981] bg-[#10B981] text-white"
                                      : "border-border-default bg-white"
                                    }`}
                                  >
                                    {isChecked && <Check size={11} strokeWidth={4} />}
                                  </div>

                                  <span className={`font-nunito font-bold text-xs capitalize break-words ${isChecked ? "line-through text-text-tertiary" : "text-text-primary"}`}>
                                    {ing.name}
                                  </span>
                                </div>

                                {ing.quantity && (
                                  <span className={`text-[10px] font-extrabold flex-shrink-0 ml-2 py-0.5 px-2.5 rounded-lg border transition-all
                                    ${isChecked
                                      ? "bg-bg-elevated border-border-subtle text-text-tertiary"
                                      : "bg-[#10B981]/10 border-[#10B981]/20 text-[#059669]"
                                    }`}
                                  >
                                    {ing.quantity} {ing.unit || ""}
                                  </span>
                                )}
                              </div>
                            )
                          })
                        ) : (
                          <span className="text-[10px] text-text-tertiary">Nincsenek hozzávalók megadva.</span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Action Buttons for Shopping List (3D Buttons) at the Bottom */}
              <div className="grid grid-cols-2 gap-3 pt-3 border-t border-border-subtle shrink-0" data-sound="off">
                {/* Export Button */}
                <Button3D
                  type="secondary"
                  rounded="full"
                  fullWidth
                  containerProps={{
                    style: {
                      height: "42px",
                      "--button-secondary-color": "#D1FAE5",
                      "--button-secondary-color-dark": "#A7F3D0",
                      "--button-secondary-color-hover": "#ECFDF5",
                      "--button-secondary-color-light": "#059669",
                    } as React.CSSProperties
                  }}
                  onPress={async () => {
                    let exportText = "Családi Bevásárlólista:\n"
                    activeShoppingRecipes.forEach(id => {
                      const recipe = initialRecipes.find(r => r.id === id)
                      if (recipe) {
                        exportText += `\n🍳 ${recipe.title}:\n`
                        if (recipe.rawIngredients) {
                          recipe.rawIngredients.forEach((ing: any) => {
                            const isChecked = checkedIngredients[`${id}-${ing.name}`]
                            const quantityStr = ing.quantity ? ` (${ing.quantity} ${ing.unit || ""})` : ""
                            exportText += `  ${isChecked ? "[x]" : "[ ]"} ${ing.name}${quantityStr}\n`
                          })
                        }
                      }
                    })
                    exportText += "\nImportálva a Scoop appból."

                    if (navigator.share) {
                      try {
                        await navigator.share({
                          title: "Családi Bevásárlólista",
                          text: exportText,
                        })
                      } catch (err: any) {
                        if (err.name !== "AbortError") {
                          console.error("Megosztás hiba:", err)
                        }
                      }
                    } else {
                      try {
                        await navigator.clipboard.writeText(exportText)
                        playSound("registrationSuccess")
                        toast.success("Bevásárlólista a vágólapra másolva!", { id: "shopping-list-copied" })
                      } catch (err) {
                        console.error("Vágólap másolás hiba:", err)
                        toast.error("Nem sikerült a vágólapra másolni!")
                      }
                    }
                  }}
                >
                  <span className="font-nunito font-bold text-xs text-[#059669] flex items-center justify-center">
                    Exportálás
                  </span>
                </Button3D>

                {/* Clear Button */}
                <Button3D
                  type="secondary"
                  rounded="full"
                  fullWidth
                  containerProps={{
                    style: {
                      height: "42px",
                      "--button-secondary-color": "#FEE2E2",
                      "--button-secondary-color-dark": "#FCA5A5",
                      "--button-secondary-color-hover": "#FEF2F2",
                      "--button-secondary-color-light": "#EF4444",
                    } as React.CSSProperties
                  }}
                  onPress={async () => {
                    playSound("delete")
                    isSavingListRef.current = true
                    setActiveShoppingRecipes([])
                    setCheckedIngredients({})
                    setIsShoppingListShared(false)
                    setSharedWithIds([])
                    setShoppingListOwnerName(null)
                    try {
                      await clearShoppingList()
                      toast.success("Bevásárlólista törölve.", { id: "shopping-list-deleted" })
                    } catch (err) {
                      console.error(err)
                    } finally {
                      isSavingListRef.current = false
                    }
                  }}
                >
                  <span className="font-nunito font-bold text-xs text-[#EF4444] flex items-center justify-center">
                    Törlés
                  </span>
                </Button3D>
              </div>
            </div>
          </section>
        )}

        {/* Spotlight Recipe (Napi ajánlat) - Mobile Only */}
        {spotlightRecipe && (
          <section className="block md:hidden px-4 mb-6 shrink-0">
            <div
              onClick={() => router.push(`/recept/${spotlightRecipe.id}`)}
              className="border-2 border-[#FF6B35] rounded-3xl bg-white shadow-[0_4px_0_#FFB347] cursor-pointer overflow-hidden flex flex-col h-auto group hover:border-[#FF5414] transition-all duration-200 active:translate-y-[2px] active:shadow-[0_2px_0_#FFB347]"
            >
              {/* Recipe Image Header */}
              <div className="relative h-48 w-full bg-bg-subtle overflow-hidden shrink-0">
                <div
                  className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-105"
                  style={{ backgroundImage: `url('${spotlightRecipe.imageUrl}')` }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />

                {/* Badge on top of image */}
                <div className="absolute top-3 left-3 z-10" onClick={(e) => e.stopPropagation()}>
                  <span className="inline-block font-nunito text-[10px] font-black px-2.5 py-1 border-2 border-[#FF6B35] bg-[#FFF8EE] text-[#FF6B35] rounded-full shadow-[0_2px_0_#FFE2C5]">
                    Napi ajánlat
                  </span>
                </div>
              </div>

              {/* Content Area */}
              <div className="p-5 flex flex-col gap-3 min-h-0">
                <div className="flex flex-col gap-1.5 min-h-0">
                  <h3 className="font-nunito font-black text-base text-text-primary group-hover:text-[#FF6B35] transition-colors leading-tight line-clamp-1">
                    {spotlightRecipe.title}
                  </h3>

                  <p className="font-nunito text-xs text-text-secondary font-semibold line-clamp-2 leading-relaxed overflow-hidden">
                    {spotlightRecipe.description || "Egy különleges, ízletes és tápláló étel a mai napra, a család kedvenc hozzávalóiból."}
                  </p>
                </div>

                <div className="flex items-center pt-2 border-t border-[#E5E2E1] shrink-0">
                  {/* Tactile Metadata Badges Row */}
                  <div className="flex flex-nowrap items-center gap-1 overflow-x-auto hide-scrollbar select-none w-full pb-1.5 pt-0.5">
                    {/* Time Badge */}
                    <div className="flex items-center gap-1 px-1.5 py-0.5 text-[9px] font-extrabold bg-[#F5F3FF] text-[#7C3AED] border border-[#DDD6FE] shadow-[0_1px_0_#DDD6FE] rounded-lg font-nunito flex-shrink-0">
                      <Clock size={11} className="text-[#7C3AED] flex-shrink-0" />
                      <span>{spotlightRecipe.time}</span>
                    </div>

                    {/* Difficulty Badge */}
                    <div className={`flex items-center gap-1 px-1.5 py-0.5 text-[9px] font-extrabold border rounded-lg font-nunito flex-shrink-0 ${spotlightRecipe.difficulty === "Könnyű"
                      ? "bg-[#E8F8F0] border-[#A7E6C5] text-[#15803D] shadow-[0_1px_0_#A7E6C5]"
                      : spotlightRecipe.difficulty === "Közepes"
                        ? "bg-[#FFF4E5] border-[#FFD39B] text-[#B25E00] shadow-[0_1px_0_#FFD39B]"
                        : "bg-[#FEECEE] border-[#FCA5A5] text-[#B91C1C] shadow-[0_1px_0_#FCA5A5]"
                      }`}>
                      <Signal size={11} className="flex-shrink-0" />
                      <span>{spotlightRecipe.difficulty}</span>
                    </div>

                    {/* Servings Badge */}
                    <div className="flex items-center gap-0.5 px-1.5 py-0.5 text-[9px] font-extrabold bg-[#FFF9F5] border border-[#FFE2C5] text-[#FF9F43] shadow-[0_1px_0_#FFE2C5] rounded-lg font-nunito flex-shrink-0">
                      <span>🍽️ {spotlightRecipe.servings || 4} adag</span>
                    </div>

                    {/* Ingredients Badge */}
                    {spotlightRecipe.ingredients && spotlightRecipe.ingredients.length > 0 && (
                      <div className="flex items-center gap-0.5 px-1.5 py-0.5 text-[9px] font-extrabold bg-[#F0FDF4] border border-[#BBF7D0] text-[#16A34A] shadow-[0_1px_0_#BBF7D0] rounded-lg font-nunito flex-shrink-0">
                        <span>🥕 {spotlightRecipe.ingredients.length} db</span>
                      </div>
                    )}

                    {/* Author Badge */}
                    {spotlightRecipe.authorName && (
                      <div className="flex items-center gap-0.5 px-1.5 py-0.5 text-[9px] font-extrabold bg-[#E9F0FD] border border-[#BDD6FF] text-[#007BFF] shadow-[0_1px_0_#BDD6FF] rounded-lg font-nunito flex-shrink-0">
                        <span>🧑‍🍳 {spotlightRecipe.authorName}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Categories Row styled matching search page */}
        <section className="mb-6 shrink-0">
          <div className="flex overflow-x-auto pb-3 gap-3 hide-scrollbar px-4 md:px-8 snap-x snap-mandatory">
            <div className="w-1 flex-shrink-0 snap-start" aria-hidden="true" />
            {visibleCategories.map((cat) => {
              const isSelected = selectedCategory === cat.id
              const isPreferred = userPreferences.includes(cat.id)

              return (
                <button
                  key={cat.id}
                  onClick={() => {
                    playSound("toggleOn")
                    setSelectedCategory(cat.id)
                  }}
                  className={`flex-shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-full border-2 font-bold text-[13px] select-none snap-start cursor-pointer transition-all duration-200 active:translate-y-[1px] active:shadow-none
                    ${isSelected
                      ? "border-[#007BFF] shadow-[0_2px_0_#0056b3] bg-[#007BFF] text-white translate-y-[1px] active:translate-y-[2px]"
                      : isPreferred
                        ? "border-[#FFB347] shadow-[0_2px_0_#E89C33] bg-[#FFF8EE] text-[#D47E1F] hover:bg-[#FFF2DF] hover:translate-y-[-1px] hover:shadow-[0_3px_0_#E89C33]"
                        : "border-[#E5E2E1] shadow-[0_2px_0_#E5E2E1] bg-white text-text-secondary hover:translate-y-[-1px] hover:shadow-[0_3px_0_#D5D2D1] hover:text-text-primary"
                    }`}
                >
                  {cat.icon}
                  <span>{cat.label}</span>
                  {isPreferred && <span className="text-[9px] font-black uppercase text-[#FFB347] ml-0.5">★</span>}
                </button>
              )
            })}
          </div>
        </section>

        {/* Recommended Recipes Grid */}
        <section className="px-4 md:px-8 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="font-nunito font-black text-base text-text-primary">Ajánlott scoop</h2>
          </div>

          {filteredRecipes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center gap-3 border-2 border-dashed border-border-default rounded-3xl bg-white p-6">
              <p className="font-bold text-sm text-text-secondary">Nincs találat ebben a kategóriában</p>
              <p className="text-xs text-text-tertiary">Válassz egy másik kategóriát fent.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredRecipes.map(recipe => (
                <RecipeCard key={recipe.id} {...recipe} />
              ))}
            </div>
          )}
        </section>

      </div>

      {/* Global Request Food Modal */}
      <Modal
        open={showRequestModal}
        onClose={() => setShowRequestModal(false)}
        title="Étel Időzítése"
      >
        <div className="flex flex-col min-h-0 h-full">
          {/* Scrollable Content Container */}
          <div className="flex-1 min-h-0 overflow-y-auto pr-1 flex flex-col gap-4 py-2 hide-scrollbar">
            {/* Step 1: Select Date */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-text-secondary flex items-center gap-1.5 font-nunito">
                <Calendar size={13} />
                Időzített dátum
              </label>
              <div className="relative flex items-center bg-white border-2 border-border-default rounded-2xl px-4 h-11 shadow-[0_2.5px_0_#E5E2E1] transition-all focus-within:border-accent-primary w-full min-w-0">
                <input
                  type="date"
                  value={requestDate}
                  onChange={(e) => setRequestDate(e.target.value)}
                  className="w-full min-w-0 bg-transparent border-none outline-none text-text-primary text-sm font-bold cursor-pointer"
                />
              </div>
            </div>

            {/* Step 2: Select Recipe */}
            <div className="flex flex-col gap-1.5 relative">
              <label className="text-xs font-semibold text-text-secondary flex items-center gap-1.5 font-nunito">
                <ChefHat size={13} />
                Válassz receptet
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={recipeSearchQuery}
                  placeholder="Keress a receptek között..."
                  onFocus={() => setShowRecipeDropdown(true)}
                  onChange={(e) => {
                    setRecipeSearchQuery(e.target.value)
                    setShowRecipeDropdown(true)
                  }}
                  className="w-full h-11 pl-4 pr-10 border-2 border-border-default rounded-2xl font-bold text-sm text-text-primary focus:outline-none focus:border-accent-primary shadow-[0_2.5px_0_#E5E2E1] transition-all bg-white"
                />
                {recipeSearchQuery && (
                  <button
                    onClick={() => {
                      setRecipeSearchQuery("")
                      setSelectedRecipeId("")
                      setShowRecipeDropdown(true)
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-text-primary p-0.5 cursor-pointer"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              {/* Custom Auto-suggest Dropdown */}
              {showRecipeDropdown && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setShowRecipeDropdown(false)}
                  />
                  <div className="absolute left-0 right-0 top-[64px] max-h-48 overflow-y-auto bg-white border-2 border-border-default rounded-2xl shadow-[0_4px_0_#E5E2E1] z-50 p-1 flex flex-col gap-1 hide-scrollbar">
                    {dropdownRecipes.length === 0 ? (
                      <div className="text-xs text-text-tertiary font-bold p-3 text-center">
                        Nincs találat erre a keresésre.
                      </div>
                    ) : (
                      dropdownRecipes.map((r) => (
                        <button
                          key={r.id}
                          onClick={() => {
                            setSelectedRecipeId(r.id)
                            setRecipeSearchQuery(r.title)
                            setShowRecipeDropdown(false)
                          }}
                          className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer
                            ${selectedRecipeId === r.id
                              ? "bg-[#E9F0FD] text-[#FF6B35]"
                              : "hover:bg-bg-card text-text-secondary hover:text-text-primary"
                            }`}
                        >
                          {r.title}
                        </button>
                      ))
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Step 3: Select Recipient */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-text-secondary flex items-center gap-1.5 font-nunito">
                <Utensils size={13} />
                Megosztás mással
              </label>
              <div className="flex flex-wrap py-2 gap-3">
                {[{ id: currentUser?.id, name: `${currentUser?.name || ""} (én)`, image: currentUser?.image || "Face1" }, ...familyMembers].map((member) => {
                  const isSelected = selectedRecipientId === member.id
                  return (
                    <div
                      key={member.id}
                      onClick={() => {
                        playSound("toggleOn")
                        setSelectedRecipientId(member.id)
                      }}
                      className={`flex-shrink-0 w-[76px] p-2.5 rounded-2xl border-2 transition-all cursor-pointer relative flex flex-col items-center gap-1 select-none snap-start
                        ${isSelected
                          ? "border-[#FF9F43] bg-[#FFF8EE] shadow-[0_3px_0_#E89C33] translate-y-[1px]"
                          : "border-border-default bg-white shadow-[0_3px_0_#E5E2E1] hover:bg-bg-card active:translate-y-[1px] active:shadow-none"
                        }`}
                    >
                      {/* Selected badge overlay */}
                      {isSelected && (
                        <span className="absolute top-1 right-1 z-10 bg-[#FF9F43] border border-white text-white rounded-full p-0.5 shadow-[0_1px_0_#E89C33]">
                          <Check size={8} strokeWidth={4} />
                        </span>
                      )}

                      <div className="w-9 h-9 rounded-full overflow-hidden border border-border-default bg-white p-0.5">
                        <img
                          src={`/Avatar/Faces/${member.image || "Face1"}.svg`}
                          alt={member.name}
                          className="w-full h-full object-contain"
                        />
                      </div>
                      <span className={`text-[10px] font-black text-center truncate w-full ${isSelected ? "text-[#D47E1F]" : "text-text-secondary"}`}>
                        {member.name}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Step 4: Custom Message */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-text-secondary flex items-center gap-1.5 font-nunito">
                <ClipboardList size={13} />
                Egyéni üzenet (opcionális)
              </label>
              <textarea
                value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value)}
                placeholder="Pl.: Nagyon megkívántam ezt a levest!"
                className="w-full h-20 p-3 border-2 border-border-default rounded-2xl font-bold text-xs text-text-primary focus:outline-none focus:border-accent-primary shadow-[0_2.5px_0_#E5E2E1] transition-all bg-white resize-none"
              />
            </div>
          </div>

          {/* Submit Button */}
          <div className="mt-4 pb-1 shrink-0 no-print">
            <Button3D
              type="primary"
              rounded="full"
              fullWidth
              loading={isRequestPending}
              loadingText="Időzítés küldése..."
              containerProps={{
                style: {
                  height: "48px",
                  "--button-primary-color": "#FF6B35",
                  "--button-primary-color-dark": "#E85A28",
                  "--button-primary-color-hover": "#FF7B48",
                  "--button-primary-color-light": "#FFFFFF",
                } as React.CSSProperties
              }}
              onPress={handleSendRequest}
            >
              <span className="font-nunito font-bold text-sm text-white flex items-center justify-center gap-2">
                <Check size={18} strokeWidth={2.5} />
                Időzítés
              </span>
            </Button3D>
          </div>
        </div>
      </Modal>

      {/* Create Shopping List Modal */}
      <Modal
        open={showShoppingModal}
        onClose={() => setShowShoppingModal(false)}
        title="Bevásárlólista"
      >
        <div className="flex flex-col gap-4">
          <p className="text-xs text-text-secondary font-medium">
            Válaszd ki azokat az ételeket, amelyeknek a hozzávalóit hozzá szeretnéd adni a bevásárlólistához.
          </p>

          {/* Search & Category Filter */}
          <div className="flex flex-col gap-3 shrink-0">
            {/* Search Input */}
            <div className="relative flex items-center bg-[#FAF7F6] border-2 border-border-default rounded-2xl px-4 h-11 shadow-[0_2.5px_0_#E5E2E1] transition-all focus-within:translate-y-[1px] focus-within:shadow-[0_1.5px_0_#007bff] focus-within:border-[#007bff] group">
              <Search className="text-text-tertiary mr-2.5 flex-shrink-0" size={16} />
              <input
                type="text"
                value={shoppingModalSearchQuery}
                onChange={(e) => setShoppingModalSearchQuery(e.target.value)}
                placeholder="Keress recept neve vagy hozzávaló alapján..."
                className="w-full bg-transparent border-none outline-none font-bold text-text-primary placeholder:text-text-tertiary p-0 text-xs"
              />
              {shoppingModalSearchQuery && (
                <button
                  type="button"
                  onClick={() => setShoppingModalSearchQuery("")}
                  className="text-text-tertiary hover:text-text-primary p-0.5 cursor-pointer ml-1.5"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Category Filter Badges */}
            <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1 hide-scrollbar">
              {CATEGORIES.map((cat) => {
                const isSelected = shoppingModalCategory === cat.id
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => {
                      playSound("toggleOn")
                      setShoppingModalCategory(cat.id)
                    }}
                    className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full border-2 font-bold text-[11px] select-none cursor-pointer transition-all duration-200 active:translate-y-[1px] active:shadow-none
                      ${isSelected
                        ? "border-[#10B981] shadow-[0_2.5px_0_#059669] bg-[#10B981] text-white translate-y-[1px] active:translate-y-[2px]"
                        : "border-[#E5E2E1] shadow-[0_2px_0_#E5E2E1] bg-white text-text-secondary hover:translate-y-[-1px] hover:shadow-[0_2.5px_0_#D5D2D1] hover:text-text-primary"
                      }`}
                  >
                    {cat.icon}
                    <span>{cat.label}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Recipes checklist */}
          <div className="max-h-60 overflow-y-auto hide-scrollbar grid grid-cols-1 sm:grid-cols-2 gap-2 p-1">
            {modalFilteredRecipes.length === 0 ? (
              <div className="col-span-full flex flex-col items-center justify-center py-8 text-center gap-2 border-2 border-dashed border-border-default rounded-2xl bg-[#FAF7F6] p-4">
                <span className="text-xs font-bold text-text-secondary">Nincs találat</span>
                <span className="text-[10px] text-text-tertiary">Nem találtunk receptet a megadott feltételekkel.</span>
              </div>
            ) : (
              modalFilteredRecipes.map((recipe) => {
                const isSelected = selectedRecipesForShopping.includes(recipe.id)
                return (
                  <div
                    key={recipe.id}
                    onClick={() => {
                      playSound("toggleOn")
                      setSelectedRecipesForShopping(prev =>
                        isSelected ? prev.filter(id => id !== recipe.id) : [...prev, recipe.id]
                      )
                    }}
                    className={`flex items-center gap-3 p-2.5 border rounded-2xl cursor-pointer select-none transition-all active:scale-[0.98]
                      ${isSelected
                        ? "border-[#10B981] bg-[#10B981]/5"
                        : "border-border-subtle bg-white hover:bg-bg-card"
                      }`}
                  >
                    <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all
                      ${isSelected ? "bg-[#10B981] border-[#10B981] text-white" : "border-border-default bg-white"}`}
                    >
                      {isSelected && <Check size={12} strokeWidth={4} />}
                    </div>

                    <div className="w-10 h-10 rounded-xl overflow-hidden bg-bg-primary border border-border-subtle flex-shrink-0">
                      <img
                        src={recipe.imageUrl}
                        alt={recipe.title}
                        className="w-full h-full object-cover"
                      />
                    </div>

                    <div className="flex-1 min-w-0">
                      <span className="text-xs font-bold font-nunito text-text-primary block truncate">
                        {recipe.title}
                      </span>
                      <span className="text-[10px] text-text-tertiary font-medium block">
                        {recipe.rawIngredients?.length || 0} hozzávaló
                      </span>
                    </div>
                  </div>
                )
              })
            )}
          </div>

          {/* Submit Button */}
          <div data-sound="off" className="mt-4 pb-1">
            <Button3D
              type="primary"
              rounded="full"
              fullWidth
              containerProps={{
                style: {
                  height: "48px",
                  "--button-primary-color": "#10B981",
                  "--button-primary-color-dark": "#059669",
                  "--button-primary-color-hover": "#34D399",
                  "--button-primary-color-light": "#FFFFFF",
                } as React.CSSProperties
              }}
              onPress={() => {
                saveShoppingList(selectedRecipesForShopping)
                playSound("registrationSuccess")
                toast.success("Bevásárlólista sikeresen létrehozva!", { id: "shopping-list-success" })
                setShowShoppingModal(false)
              }}
            >
              <span className="font-nunito font-bold text-sm text-white flex items-center justify-center gap-1.5">
                <Check size={16} strokeWidth={3} />
                Hozzáadás a bevásárlólistához
              </span>
            </Button3D>
          </div>
        </div>
      </Modal>

      {/* Share Shopping List Modal */}
      <Modal
        open={showShareModal}
        onClose={() => setShowShareModal(false)}
        title="Bevásárlólista megosztása"
      >
        <div className="flex flex-col gap-4">
          <p className="text-xs text-text-secondary font-semibold">
            Válaszd ki, hogy kivel szeretnéd megosztani a bevásárlólistádat. A kiválasztott személyek látni fogják és szerkeszthetik a listát.
          </p>

          <div className="flex flex-wrap gap-3 py-2 max-h-60 overflow-y-auto pr-1 hide-scrollbar justify-center sm:justify-start">
            {familyMembers.map((member) => {
              const isChecked = selectedShareMembers.includes(member.id)
              return (
                <div
                  key={member.id}
                  onClick={() => {
                    playSound("toggleOn")
                    setSelectedShareMembers(prev =>
                      isChecked ? prev.filter(id => id !== member.id) : [...prev, member.id]
                    )
                  }}
                  className={`flex-shrink-0 w-[76px] p-2.5 rounded-2xl border-2 transition-all cursor-pointer relative flex flex-col items-center gap-1 select-none
                    ${isChecked
                      ? "border-[#10B981] bg-[#E6FDF4] shadow-[0_3px_0_#059669] translate-y-[1px]"
                      : "border-border-default bg-white shadow-[0_3px_0_#E5E2E1] hover:bg-bg-card active:translate-y-[1px] active:shadow-none"
                    }`}
                >
                  {/* Selected check badge overlay */}
                  {isChecked && (
                    <span className="absolute top-1 right-1 z-10 bg-[#10B981] border border-white text-white rounded-full p-0.5 shadow-[0_1px_0_#059669]">
                      <Check size={8} strokeWidth={4} />
                    </span>
                  )}

                  <div className="w-9 h-9 rounded-full overflow-hidden border border-border-default bg-white p-0.5">
                    <img
                      src={`/Avatar/Faces/${member.image || "Face1"}.svg`}
                      alt={member.name}
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <span className={`text-[10px] font-black text-center truncate w-full ${isChecked ? "text-[#059669]" : "text-text-secondary"}`}>
                    {member.name}
                  </span>
                </div>
              )
            })}
            {familyMembers.length === 0 && (
              <p className="text-xs text-text-tertiary italic text-center py-4 w-full">
                Nincsenek családtagok.
              </p>
            )}
          </div>

          {/* Submit Button */}
          <div data-sound="off" className="mt-4 pb-1">
            <Button3D
              type="primary"
              rounded="full"
              fullWidth
              loading={isShareSaving}
              loadingText="Mentés..."
              containerProps={{
                style: {
                  height: "48px",
                  "--button-primary-color": "#007BFF",
                  "--button-primary-color-dark": "#0056b3",
                  "--button-primary-color-hover": "#1A8CFF",
                  "--button-primary-color-light": "#FFFFFF",
                } as React.CSSProperties
              }}
              onPress={handleSaveShareSettings}
            >
              <span className="font-nunito font-bold text-sm text-white flex items-center justify-center gap-1.5">
                <Check size={16} strokeWidth={3} />
                Mentés és megosztás
              </span>
            </Button3D>
          </div>
        </div>
      </Modal>

      {/* Edit Weekly Menu Modal */}
      <Modal
        open={showEditMealPlanModal}
        onClose={() => setShowEditMealPlanModal(false)}
        title="Heti menü szerkesztése"
      >
        <div className="flex flex-col gap-4 max-h-[70vh] overflow-y-auto pr-1 hide-scrollbar">
          <div className="flex flex-col gap-4">
            {weekDays.map((date) => {
              const dateStr = formatDateStr(date)
              const meals = mealPlans.filter((mp: any) => mp.date === dateStr)
              const hasMeals = meals.length > 0

              return (
                <div key={dateStr} className="border-2 border-border-default rounded-2xl p-3.5 bg-[#FAF7F6] shadow-[0_3px_0_#E5E2E1] mb-1">
                  {/* Day Header */}
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-nunito font-black text-xs text-[#FF6B35]">
                      {getDayName(date)} ({getMonthName(date)} {date.getDate()})
                    </span>
                    <span className="text-[10px] font-nunito font-bold text-text-tertiary">
                      {meals.length} db tervezett étel
                    </span>
                  </div>

                  {/* Meals List */}
                  {hasMeals ? (
                    <div className="flex flex-col gap-2">
                      {meals.map((meal: any) => {
                        const recipe = initialRecipes.find(r => r.id === meal.recipeId)
                        const isDeleting = isDeletingMeal === meal.id

                        return (
                          <div
                            key={meal.id}
                            className="flex items-center justify-between gap-3 p-2.5 bg-white border-2 border-border-default rounded-xl shadow-[0_2px_0_#E5E2E1]"
                          >
                            <div className="flex items-center gap-2.5 min-w-0 flex-1">
                              {/* Small recipe image preview if available */}
                              {recipe?.imageUrl && (
                                <div className="w-8 h-8 rounded-lg overflow-hidden bg-bg-primary border border-border-subtle flex-shrink-0">
                                  <img
                                    src={recipe.imageUrl}
                                    alt={recipe.title}
                                    className="w-full h-full object-cover"
                                  />
                                </div>
                              )}
                              <div className="min-w-0 flex-1">
                                <span className="font-nunito font-bold text-xs text-text-primary block truncate">
                                  {recipe?.title || meal.message}
                                </span>
                                <span className="font-nunito text-[9px] font-semibold text-text-tertiary flex items-center gap-1 mt-0.5">
                                  <span>🧑‍🍳 Kérte:</span>
                                  <span className="font-bold text-text-secondary">{meal.creator?.name || "Családtag"}</span>
                                </span>
                              </div>
                            </div>

                            {/* Tactile 3D Delete Button */}
                            <div data-sound="off" className="flex-shrink-0">
                              <Button3D
                                type="secondary"
                                iconOnly
                                rounded="lg"
                                containerProps={{
                                  style: {
                                    width: "32px",
                                    height: "32px",
                                    "--button-secondary-color": "#FEF2F2",
                                    "--button-secondary-color-dark": "#FCA5A5",
                                    "--button-secondary-color-hover": "#FEE2E2",
                                    "--button-secondary-color-light": "#EF4444",
                                  } as React.CSSProperties
                                }}
                                className="flex items-center justify-center p-0 cursor-pointer"
                                onPress={() => handleDeleteMealPlan(meal.id)}
                                disabled={isDeleting}
                              >
                                {isDeleting ? (
                                  <div className="w-3.5 h-3.5 border-2 border-[#EF4444] border-t-transparent rounded-full animate-spin" />
                                ) : (
                                  <Trash2 size={13} className="text-[#EF4444]" />
                                )}
                              </Button3D>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    <p className="text-[11px] font-nunito text-text-tertiary font-bold italic py-1 pl-1">
                      Nincs időzített étel erre a napra.
                    </p>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </Modal>
    </main>
  )
}
