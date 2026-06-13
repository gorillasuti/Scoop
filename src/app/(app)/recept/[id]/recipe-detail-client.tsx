"use client"

import React, { useState, useRef, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useSession } from "next-auth/react"
import {
  ArrowLeft,
  Heart,
  Clock,
  Flame,
  Utensils,
  ChefHat,
  Check,
  Minus,
  Plus,
  Soup,
  Salad,
  Coffee,
  CakeSlice,
  Leaf,
  Drumstick,
  Fish,
  Apple,
  TreePine,
  Egg,
  TrendingUp,
  Printer,
  Pencil,
  ClipboardList,
  Calendar,
  Link2,
  Image as ImageIcon,
  X,
  Trash2
} from "lucide-react"
import { Button3D } from "react-3d-button"
import "react-3d-button/styles"
import { toggleLikeRecipe, updateRecipe, deleteRecipe } from "@/app/actions/recipes"
import { createNotification } from "@/app/actions/notifications"
import { createMealPlan } from "@/app/actions/meals"
import { toast } from "sonner"
import { Modal } from "@/components/ui/modal"
import { playSound } from "@/lib/sounds"


export interface RecipeDetailClientProps {
  recipe: {
    id: string
    title: string
    description: string | null
    imageUrl: string
    time: string
    prepTime: number
    cookTime: number
    difficulty: "Könnyű" | "Közepes" | "Nehéz"
    isLiked: boolean
    category: string | null
    tags?: string[]
    videoUrl?: string | null
    servings: number
    ingredients: {
      name: string
      quantity: number | null
      unit: string
    }[]
    instructions: {
      step: number
      content: string
    }[]
    authorName: string
    authorImage: string
  }
  familyMembers?: {
    id: string
    name: string
    image: string
  }[]
}

const CATEGORY_LABELS: Record<string, string> = {
  all: "Összes",
  breakfast: "Reggeli",
  soups: "Leves",
  mains: "Főétel",
  pasta: "Tészta",
  onepot: "Egytálétel",
  desserts: "Desszert",
  salads: "Saláta",
  baking: "Sütemény",
  poultry: "Szárnyas",
  pork_beef: "Sertés/Marha",
  vegetarian: "Vegetáriánus",
  quick: "Gyors",
  healthy: "Egészséges",
}

const PRESETS = [
  { id: "mains", label: "Főétel", url: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&q=80&w=800" },
  { id: "soups", label: "Leves", url: "https://images.unsplash.com/photo-1476718406336-bb5a9690ee2a?q=80&w=687&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&q=80&w=800" },
  { id: "desserts", label: "Desszert", url: "https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&q=80&w=800" },
  { id: "salads", label: "Saláta", url: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&q=80&w=800" },
  { id: "breakfast", label: "Reggeli", url: "https://images.unsplash.com/photo-1504754524776-8f4f37790ca0?q=80&w=1170&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&fit=crop&q=80&w=800" },
  { id: "generic", label: "Konyha / Sütés", url: "https://images.unsplash.com/photo-1556910103-1c02745aae4d?auto=format&fit=crop&q=80&w=800" },
]

function getCategoryIcon(cat: string, size = 16) {
  switch (cat) {
    case "breakfast": return <Coffee size={size} />
    case "soups": return <Soup size={size} />
    case "mains": return <ChefHat size={size} />
    case "pasta": return <Flame size={size} />
    case "onepot": return <Utensils size={size} />
    case "desserts": return <CakeSlice size={size} />
    case "salads": return <Salad size={size} />
    case "baking": return <Egg size={size} />
    case "poultry": return <Drumstick size={size} />
    case "pork_beef": return <Drumstick size={size} />
    case "vegetarian": return <Leaf size={size} />
    case "quick": return <Clock size={size} />
    case "healthy": return <Apple size={size} />
    default: return <Utensils size={size} />
  }
}

export function RecipeDetailClient({ recipe, familyMembers = [] }: RecipeDetailClientProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const fromPage = searchParams ? (searchParams.get("from") || "/kereses") : "/kereses"

  // Recipe field states (so edits update the page instantly)
  const [recipeTitle, setRecipeTitle] = useState(recipe.title)
  const [recipeDescription, setRecipeDescription] = useState(recipe.description || "")
  const [recipePrepTime, setRecipePrepTime] = useState(recipe.prepTime || 0)
  const [recipeCookTime, setRecipeCookTime] = useState(recipe.cookTime || 0)
  const [recipeServingsDefault, setRecipeServingsDefault] = useState(recipe.servings || 4)
  const [recipeImageUrl, setRecipeImageUrl] = useState(recipe.imageUrl)
  const [recipeDifficulty, setRecipeDifficulty] = useState<"Könnyű" | "Közepes" | "Nehéz">(recipe.difficulty || "Könnyű")
  const [recipeTags, setRecipeTags] = useState<string[]>(recipe.tags || [])
  const [recipeVideoUrl, setRecipeVideoUrl] = useState(recipe.videoUrl || "")

  // Servings and checklists state
  const [servings, setServings] = useState(recipe.servings || 4)
  const [checkedIngredients, setCheckedIngredients] = useState<Set<number>>(new Set())
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set())
  const [isLikedState, setIsLikedState] = useState(recipe.isLiked)

  // Modal controls
  const [showRequestModal, setShowRequestModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)

  // Request Food state
  const [requestDate, setRequestDate] = useState(() => {
    const today = new Date()
    return today.toISOString().split("T")[0] // YYYY-MM-DD
  })

  const { data: session } = useSession()
  const currentUser = session?.user

  // Fallback mock family members if list is empty or contains only mock users
  const realFamilyMembers = familyMembers.filter(m => !m.id.startsWith("mock-"))
  const displayFamilyMembers = realFamilyMembers.length > 0 ? realFamilyMembers : [
    { id: "mock-anya", name: "Anya", image: "Face1-female" },
    { id: "mock-apa", name: "Apa", image: "Face8" },
    { id: "mock-teso", name: "Testvér", image: "Face4" },
  ]

  const allRecipients = currentUser?.id
    ? [{ id: currentUser.id, name: `${currentUser.name || ""} (én)`, image: currentUser.image || "Face1" }, ...displayFamilyMembers]
    : displayFamilyMembers

  const [selectedRequestUser, setSelectedRequestUser] = useState("")

  useEffect(() => {
    if (currentUser?.id) {
      setSelectedRequestUser(currentUser.id)
    } else if (allRecipients[0]?.id) {
      setSelectedRequestUser(allRecipients[0].id)
    }
  }, [currentUser])

  // Edit Recipe state (inside edit modal, temporary fields)
  const [editTitle, setEditTitle] = useState(recipe.title)
  const [editDescription, setEditDescription] = useState(recipe.description || "")
  const [editPrepTime, setEditPrepTime] = useState(recipe.prepTime || 0)
  const [editCookTime, setEditCookTime] = useState(recipe.cookTime || 0)
  const [editServingsDefault, setEditServingsDefault] = useState(recipe.servings || 4)
  const [editImageUrl, setEditImageUrl] = useState(recipe.imageUrl)
  const [editDifficulty, setEditDifficulty] = useState<"Könnyű" | "Közepes" | "Nehéz">(recipe.difficulty || "Könnyű")
  const [editTags, setEditTags] = useState<string[]>(recipe.tags || [])
  const [editVideoUrl, setEditVideoUrl] = useState(recipe.videoUrl || "")
  const [editUploading, setEditUploading] = useState(false)
  const [isSavingRecipe, setIsSavingRecipe] = useState(false)
  const [isDeletingRecipe, setIsDeletingRecipe] = useState(false)

  const [recipeIngredients, setRecipeIngredients] = useState(recipe.ingredients)
  const [recipeInstructions, setRecipeInstructions] = useState(recipe.instructions)

  const [editIngredients, setEditIngredients] = useState<
    { id: string; name: string; quantity: string; unit: string }[]
  >(() => recipe.ingredients.map((i, idx) => ({ id: `ing-${idx}`, name: i.name, quantity: i.quantity?.toString() || "", unit: i.unit || "" })))

  const [editInstructions, setEditInstructions] = useState<{ id: string; content: string }[]>(() =>
    recipe.instructions.map((ins, idx) => ({ id: `ins-${idx}`, content: ins.content }))
  )

  const generateId = () => Math.random().toString(36).substring(2, 9)

  const addEditIngredient = () => {
    playSound("switchOn")
    setEditIngredients((prev) => [
      ...prev,
      { id: `ing-${generateId()}`, name: "", quantity: "", unit: "" },
    ])
  }

  const removeEditIngredient = (id: string) => {
    playSound("delete")
    setEditIngredients((prev) => prev.filter((ing) => ing.id !== id))
  }

  const handleEditIngredientChange = (
    id: string,
    field: "name" | "quantity" | "unit",
    value: string
  ) => {
    setEditIngredients((prev) =>
      prev.map((ing) => (ing.id === id ? { ...ing, [field]: value } : ing))
    )
  }

  const addEditInstruction = () => {
    playSound("switchOn")
    setEditInstructions((prev) => [
      ...prev,
      { id: `ins-${generateId()}`, content: "" },
    ])
  }

  const removeEditInstruction = (id: string) => {
    playSound("delete")
    setEditInstructions((prev) => prev.filter((ins) => ins.id !== id))
  }

  const handleEditInstructionChange = (id: string, value: string) => {
    setEditInstructions((prev) =>
      prev.map((ins) => (ins.id === id ? { ...ins, content: value } : ins))
    )
  }

  const allAvailableTags = React.useMemo(() => {
    const presets = Object.keys(CATEGORY_LABELS).filter(k => k !== "all")
    const combined = new Set([...presets, ...recipeTags])
    return Array.from(combined)
  }, [recipeTags])

  const isPendingRef = useRef(false)
  const servingsPendingRef = useRef(false)
  const isSharingRef = useRef(false)
  const isRequestPendingRef = useRef(false)

  // Sync servings state if default servings changed by editor
  useEffect(() => {
    setServings(recipeServingsDefault)
  }, [recipeServingsDefault])

  // Screen Wake Lock API to keep the display active while cooking
  useEffect(() => {
    if (typeof window === "undefined" || !("wakeLock" in navigator)) return

    let wakeLockSentinel: any = null
    const isWakeLockEnabled = localStorage.getItem("scoop_wake_lock_enabled") === "true"

    const requestWakeLock = async () => {
      const isEnabled = localStorage.getItem("scoop_wake_lock_enabled") === "true"
      if (!isEnabled) return

      if (wakeLockSentinel) return
      try {
        wakeLockSentinel = await (navigator as any).wakeLock.request("screen")

        // Listen for release event to reset sentinel
        wakeLockSentinel.addEventListener("release", () => {
          wakeLockSentinel = null
        })
      } catch (err) {
        // Safe to ignore or log as warning
        console.warn("Wake Lock request failed:", err)
        wakeLockSentinel = null
      }
    }

    if (isWakeLockEnabled) {
      // Try on mount (may fail if user hasn't interacted yet, which is expected on iOS)
      requestWakeLock()

      // Re-request wake lock if tab becomes visible again
      const handleVisibilityChange = () => {
        if (document.visibilityState === "visible") {
          requestWakeLock()
        }
      }
      document.addEventListener("visibilitychange", handleVisibilityChange)

      // Re-request wake lock on any user interaction (to satisfy iOS Safari gesture requirement)
      const handleInteraction = () => {
        requestWakeLock()
      }
      document.addEventListener("click", handleInteraction)
      document.addEventListener("touchstart", handleInteraction)

      return () => {
        document.removeEventListener("visibilitychange", handleVisibilityChange)
        document.removeEventListener("click", handleInteraction)
        document.removeEventListener("touchstart", handleInteraction)
        if (wakeLockSentinel) {
          wakeLockSentinel.release().catch(() => { })
        }
      }
    }
  }, [])

  const openEditModal = () => {
    setEditTitle(recipeTitle)
    setEditDescription(recipeDescription)
    setEditPrepTime(recipePrepTime)
    setEditCookTime(recipeCookTime)
    setEditServingsDefault(recipeServingsDefault)
    setEditImageUrl(recipeImageUrl)
    setEditDifficulty(recipeDifficulty)
    setEditTags(recipeTags)
    setEditVideoUrl(recipeVideoUrl)
    setEditIngredients(recipeIngredients.map((i, idx) => ({ id: `ing-${idx}`, name: i.name, quantity: i.quantity?.toString() || "", unit: i.unit || "" })))
    setEditInstructions(recipeInstructions.map((ins, idx) => ({ id: `ins-${idx}`, content: ins.content })))
    setShowEditModal(true)
  }

  const handleEditFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Check size limit (5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("A feltöltött kép mérete nem lehet nagyobb 5MB-nál!", { id: "upload-size-error" })
      return
    }

    setEditUploading(true)
    const toastId = toast.loading("Kép feltöltése...", { id: "upload-status" })

    try {
      const formData = new FormData()
      formData.append("file", file)

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      })
      const res = await response.json()

      if (res.error) {
        toast.error(res.error, { id: toastId })
      } else if (res.url) {
        setEditImageUrl(res.url)
        playSound("switchOn")
        toast.success("Kép sikeresen feltöltve!", { id: toastId })
      }
    } catch (err) {
      console.error(err)
      toast.error("Hiba történt a feltöltés közben!", { id: toastId })
    } finally {
      setEditUploading(false)
      // Reset input value so same file can be reselected
      e.target.value = ""
    }
  }

  const handleDecrement = () => {
    if (servingsPendingRef.current) return
    servingsPendingRef.current = true
    setServings(s => Math.max(1, s - 1))
    setTimeout(() => {
      servingsPendingRef.current = false
    }, 150)
  }

  const handleIncrement = () => {
    if (servingsPendingRef.current) return
    servingsPendingRef.current = true
    setServings(s => s + 1)
    setTimeout(() => {
      servingsPendingRef.current = false
    }, 150)
  }

  const handleLikeToggle = async () => {
    if (isPendingRef.current) return
    isPendingRef.current = true

    const originalState = isLikedState
    const newState = !originalState
    setIsLikedState(newState)

    try {
      const res = await toggleLikeRecipe(recipe.id)
      if (res.error) {
        toast.error(res.error)
        setIsLikedState(originalState)
      } else if (res.success && res.liked !== undefined) {
        setIsLikedState(res.liked)
        toast.success(res.liked ? "Hozzáadva a kedvencekhez!" : "Eltávolítva a kedvencekből!")
      }
    } catch {
      toast.error("Hiba történt a művelet közben!")
      setIsLikedState(originalState)
    } finally {
      isPendingRef.current = false
    }
  }

  const toggleIngredient = (idx: number) => {
    const next = new Set(checkedIngredients)
    if (next.has(idx)) {
      next.delete(idx)
    } else {
      next.add(idx)
    }
    setCheckedIngredients(next)
  }

  const toggleStep = (stepNum: number) => {
    const next = new Set(completedSteps)
    if (next.has(stepNum)) {
      next.delete(stepNum)
    } else {
      next.add(stepNum)
    }
    setCompletedSteps(next)
  }

  const totalTime = recipePrepTime + recipeCookTime
  let displayTime = "30 perc"
  if (totalTime > 0) {
    if (totalTime >= 60) {
      const hours = Math.floor(totalTime / 60)
      const mins = totalTime % 60
      displayTime = mins > 0 ? `${hours} óra ${mins} perc` : `${hours} óra`
    } else {
      displayTime = `${totalTime} perc`
    }
  }

  const displayDifficulty = recipeDifficulty

  const scaleQuantity = (qty: number | null) => {
    if (!qty) return ""
    const scaled = qty * (servings / recipeServingsDefault)
    return parseFloat(scaled.toFixed(2))
  }

  const handleAddToNotes = async () => {
    if (isSharingRef.current) return
    isSharingRef.current = true

    const listHeader = `📋 BEVÁSÁRLÓLISTA: ${recipeTitle.toUpperCase()}\n(${servings} adaghoz)\n\n`
    const listBody = recipeIngredients.map(ing => {
      const scaledQty = scaleQuantity(ing.quantity)
      const qtyStr = scaledQty ? `${scaledQty} ` : ""
      const unitStr = ing.unit ? `${ing.unit} ` : ""
      return `- [ ] ${qtyStr}${unitStr}${ing.name}`
    }).join("\n")

    const shoppingListText = `${listHeader}${listBody}\n\nImportálva a Scoop appból.`

    if (navigator.share) {
      try {
        await navigator.share({
          title: `${recipeTitle} - Bevásárlólista`,
          text: shoppingListText,
        })
      } catch (err: any) {
        if (err.name !== "AbortError") {
          console.error("Megosztás hiba:", err)
        }
      } finally {
        isSharingRef.current = false
      }
    } else {
      try {
        await navigator.clipboard.writeText(shoppingListText)
        toast.success("Bevásárlólista a vágólapra másolva!")
      } catch (err) {
        console.error("Vágólap másolás hiba:", err)
        toast.error("Nem sikerült a vágólapra másolni!")
      } finally {
        isSharingRef.current = false
      }
    }
  }

  const handleRequestFood = async () => {
    if (isRequestPendingRef.current) return
    isRequestPendingRef.current = true

    try {
      const selectedUserObj = allRecipients.find(m => m.id === selectedRequestUser)
      if (!selectedUserObj) {
        toast.error("Válassz ki egy családtagot!")
        isRequestPendingRef.current = false
        return
      }

      // Request notification permission if not yet decided, during user interaction
      if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "default") {
        try {
          const perm = await Notification.requestPermission()
          if (perm === "granted") {
            window.dispatchEvent(new CustomEvent("trigger-push-subscribe"))
          }
        } catch (err) {
          console.error("Permission request error:", err)
        }
      }

      const isSelf = currentUser && selectedRequestUser === currentUser.id
      const title = isSelf ? "Saját tervezés" : "Új étel Időzítés"
      const message = isSelf
        ? `Saját magamnak terveztem a(z) "${recipeTitle}" elkészítését erre a napra: ${requestDate}.`
        : `Kérte a(z) "${recipeTitle}" elkészítését erre a napra: ${requestDate}.`

      // Create both a MealPlan (for Heti menü) and a Notification (for the bell feed)
      const [mealRes, notifRes] = await Promise.all([
        createMealPlan({
          userId: selectedRequestUser,
          recipeId: recipe.id,
          date: requestDate,
          message,
        }),
        createNotification({
          userId: selectedRequestUser,
          title,
          message,
          recipeId: recipe.id,
          date: requestDate,
        }),
      ])

      if (mealRes.error || notifRes.error) {
        toast.error(mealRes.error || notifRes.error || "Hiba történt a művelet közben!")
        return
      }

      const successMsg = isSelf
        ? `Időzítés sikeresen hozzáadva a saját naptáradhoz ${requestDate} napra!`
        : `Időzítés elküldve ${selectedUserObj.name} részére ${requestDate} napra!`
      toast.success(successMsg)
      setShowRequestModal(false)
    } catch (err) {
      console.error("Hiba az étel kérésekor:", err)
      toast.error("Hiba történt a művelet közben!")
    } finally {
      isRequestPendingRef.current = false
    }
  }

  const handleSaveRecipeEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editTitle.trim()) {
      toast.error("A recept neve nem lehet üres!")
      return
    }

    setIsSavingRecipe(true)
    try {
      const res = await updateRecipe(recipe.id, {
        title: editTitle.trim(),
        description: editDescription.trim(),
        prepTime: Number(editPrepTime),
        cookTime: Number(editCookTime),
        servings: Number(editServingsDefault),
        category: editTags[0] || "mains",
        difficulty: editDifficulty,
        tags: editTags,
        videoUrl: editVideoUrl.trim() || null,
        imageUrl: editImageUrl,
        ingredients: editIngredients.filter(i => i.name.trim() !== "").map(i => ({
          name: i.name.trim(),
          quantity: i.quantity ? parseFloat(i.quantity) : null,
          unit: i.unit.trim() || null,
        })),
        instructions: editInstructions.filter(ins => ins.content.trim() !== "").map((ins, idx) => ({
          step: idx + 1,
          content: ins.content.trim(),
        })),
      })

      if (res.error) {
        toast.error(res.error)
      } else {
        setRecipeTitle(editTitle.trim())
        setRecipeDescription(editDescription.trim())
        setRecipePrepTime(Number(editPrepTime))
        setRecipeCookTime(Number(editCookTime))
        setRecipeServingsDefault(Number(editServingsDefault))
        setRecipeDifficulty(editDifficulty)
        setRecipeTags(editTags)
        setRecipeVideoUrl(editVideoUrl.trim() || "")
        setRecipeImageUrl(editImageUrl)
        setRecipeIngredients(editIngredients.filter(i => i.name.trim() !== "").map((i) => ({
          name: i.name.trim(),
          quantity: i.quantity ? parseFloat(i.quantity) : null,
          unit: i.unit.trim() || ""
        })))
        setRecipeInstructions(editInstructions.filter(ins => ins.content.trim() !== "").map((ins, idx) => ({
          step: idx + 1,
          content: ins.content.trim(),
        })))

        playSound("registrationSuccess")
        toast.success("Recept sikeresen frissítve!")
        setShowEditModal(false)
      }
    } catch (err) {
      console.error("Hiba a recept mentésekor:", err)
      toast.error("Hiba történt a mentés közben!")
    } finally {
      setIsSavingRecipe(false)
    }
  }

  const handleDeleteRecipe = async (e?: any) => {
    if (e && typeof e.preventDefault === "function") {
      e.preventDefault()
    }
    if (!window.confirm("Biztosan törölni szeretnéd ezt a receptet? Ez a művelet nem vonható vissza.")) {
      return
    }

    setIsDeletingRecipe(true)
    try {
      const res = await deleteRecipe(recipe.id)
      if (res.error) {
        toast.error(res.error)
      } else {
        playSound("delete")
        toast.success("Recept sikeresen törölve!")
        setShowEditModal(false)
        router.push(fromPage)
        router.refresh()
      }
    } catch (err) {
      console.error("Hiba a recept törlésekor:", err)
      toast.error("Hiba történt a törlés közben!")
    } finally {
      setIsDeletingRecipe(false)
    }
  }

  return (
    <main className="flex flex-col h-full overflow-hidden bg-bg-primary w-full pb-24 max-w-5xl mx-auto">
      {/* Printable styles */}
      <style>{`
        @media print {
          /* HIDE ALL INTERACTIVE & APP SHELL CONTROLS */
          nav,
          button,
          .no-print,
          .react-3d-button-container,
          [class*="react-3d-button"] {
            display: none !important;
          }

          /* RESET LAYOUT TO A4 PAPER STANDARDS */
          body, html, #__next, [class*="relative h-[100dvh]"], [class*="flex-1 min-h-0"], .bg-bg-primary {
            background: white !important;
            color: black !important;
            height: auto !important;
            min-height: 0 !important;
            overflow: visible !important;
            position: static !important;
            width: 100% !important;
            padding: 0 !important;
            margin: 0 !important;
            font-family: "Georgia", "Times New Roman", serif !important;
          }

          /* REMOVE ALL ROUNDED CORNERS FOR PAPER PRINT */
          * {
            border-radius: 0 !important;
          }

          /* PRINT ONLY CHECKBOX SQUARE */
          .print-only-checkbox {
            display: inline-block !important;
            width: 13px;
            height: 13px;
            border: 1.5px solid black !important;
            background-color: white !important;
            margin-right: 8px;
            vertical-align: middle;
          }

          /* CONTAINER ADJUSTMENT */
          .w-full.h-full.overflow-y-auto {
            height: auto !important;
            overflow: visible !important;
            padding-bottom: 0 !important;
          }
          
          .max-w-md {
            max-width: 100% !important;
            width: 100% !important;
            padding: 0 !important;
            margin: 0 !important;
          }

          /* HERO IMAGE INK OPTIMIZATION */
          .relative.w-full.aspect-video {
            max-height: 200px !important;
            height: 200px !important;
            width: 100% !important;
            border: 1px solid #ddd !important;
            box-shadow: none !important;
            margin-bottom: 15px !important;
            border-radius: 8px !important;
          }

          /* METADATA ROW - REMOVE 3D CARDS, CONVERT TO FLAT ROW */
          .grid.grid-cols-3.gap-3 {
            display: flex !important;
            flex-direction: row !important;
            justify-content: flex-start !important;
            gap: 20px !important;
            border-bottom: 1px solid #eee !important;
            padding-bottom: 10px !important;
            margin-bottom: 15px !important;
          }

          .grid.grid-cols-3.gap-3 > div {
            border: none !important;
            box-shadow: none !important;
            padding: 0 !important;
            background: transparent !important;
            align-items: flex-start !important;
            justify-content: flex-start !important;
          }

          .grid.grid-cols-3.gap-3 svg {
            display: none !important;
          }

          .grid.grid-cols-3.gap-3 span {
            font-size: 11px !important;
          }

          /* TITLE & DESCRIPTION */
          h1 {
            font-size: 26px !important;
            font-weight: bold !important;
            margin-top: 10px !important;
            margin-bottom: 5px !important;
          }

          /* AUTHOR BADGE */
          .flex.items-center.gap-3.bg-white.p-3 {
            border: none !important;
            box-shadow: none !important;
            padding: 0 !important;
            margin-bottom: 15px !important;
          }
          .w-10.h-10.rounded-full {
            display: none !important;
          }

          /* SERVINGS CARD - SIMPLIFY TO TEXT */
          .bg-white.p-5.rounded-\\[24px\\].border-2 {
            border: none !important;
            box-shadow: none !important;
            padding: 0 !important;
            margin-bottom: 15px !important;
          }
          
          .bg-white.p-5.rounded-\\[24px\\].border-2 .flex-col {
            display: inline-block !important;
          }
          .bg-white.p-5.rounded-\\[24px\\].border-2 span {
            font-size: 14px !important;
          }

          /* INGREDIENTS CHECKLIST - RENDER AS BULLETED LIST */
          .flex.flex-col.gap-3 h2 {
            font-size: 18px !important;
            border-bottom: 1px solid #ccc !important;
            padding-bottom: 3px !important;
            margin-bottom: 8px !important;
          }
          
          .flex.flex-col.gap-3 h2 svg {
            display: none !important;
          }

          .flex.flex-col.gap-2 {
            gap: 4px !important;
          }

          .flex.flex-col.gap-2 > div {
            border: none !important;
            box-shadow: none !important;
            background: transparent !important;
            padding: 2px 0 !important;
            font-size: 14px !important;
            color: black !important;
            text-decoration: none !important;
            line-through: none !important;
            opacity: 1 !important;
            display: flex !important;
            align-items: center !important;
          }

          .flex.flex-col.gap-2 > div .w-5.h-5 {
            display: none !important;
          }

          .flex.flex-col.gap-2 > div span {
            text-decoration: none !important;
            color: black !important;
          }

          /* INSTRUCTIONS STEPS - RENDER AS REGULAR PARAGRAPHS */
          .flex.flex-col.gap-4 {
            gap: 12px !important;
          }

          .flex.flex-col.gap-4 > div {
            border: none !important;
            box-shadow: none !important;
            background: transparent !important;
            padding: 0 !important;
            color: black !important;
          }

          .flex.flex-col.gap-4 > div span {
            font-size: 13px !important;
            font-weight: bold !important;
            color: black !important;
            background: transparent !important;
            border: none !important;
            padding: 0 !important;
          }
          
          .flex.flex-col.gap-4 > div p {
            font-size: 14px !important;
            color: black !important;
            margin-top: 2px !important;
            line-through: none !important;
            opacity: 1 !important;
          }
        }
      `}</style>

      <div className="flex-1 overflow-y-auto overscroll-y-contain px-4 md:px-8 pt-2 pb-8 hide-scrollbar flex flex-col gap-6 w-full max-w-5xl mx-auto">

        {/* Navigation Action Header */}
        <div className="flex items-center justify-between gap-2 no-print">
          <Button3D
            type="secondary"
            iconOnly
            rounded="full"
            containerProps={{
              style: {
                width: "44px",
                height: "44px",
                "--button-secondary-color": "#ffffff",
                "--button-secondary-color-dark": "#E5E2E1",
                "--button-secondary-color-hover": "#FCF9F8",
                "--button-secondary-color-light": "#1C1B1B",
              } as React.CSSProperties
            }}
            onPress={() => {
              playSound("swipe")
              router.push(fromPage)
            }}
          >
            <ArrowLeft size={20} className="text-text-primary" />
          </Button3D>

          {/* Action buttons toolbar instead of text */}
          <div className="flex items-center gap-2 ml-auto">
            {/* Edit Recipe Button */}
            <Button3D
              type="primary"
              iconOnly
              rounded="full"
              containerProps={{
                "data-sound": "off",
                style: {
                  width: "44px",
                  height: "44px",
                  "--button-primary-color": "#4F46E5",
                  "--button-primary-color-dark": "#3730A3",
                  "--button-primary-color-hover": "#6366F1",
                  "--button-primary-color-light": "#EEF2F6",
                } as React.CSSProperties
              } as any}
              onPress={openEditModal}
            >
              <Pencil size={20} className="text-white" />
            </Button3D>

            {/* Request Food Button */}
            <Button3D
              type="primary"
              iconOnly
              rounded="full"
              containerProps={{
                "data-sound": "off",
                style: {
                  width: "44px",
                  height: "44px",
                  "--button-primary-color": "#FF9F43",
                  "--button-primary-color-dark": "#E08528",
                  "--button-primary-color-hover": "#FFAA5A",
                  "--button-primary-color-light": "#FFF9F5",
                } as React.CSSProperties
              } as any}
              onPress={() => setShowRequestModal(true)}
            >
              <ChefHat size={20} className="text-white" />
            </Button3D>

            {/* Auto Add to Notes Button */}
            <Button3D
              type="primary"
              iconOnly
              rounded="full"
              containerProps={{
                style: {
                  width: "44px",
                  height: "44px",
                  "--button-primary-color": "#10B981",
                  "--button-primary-color-dark": "#047857",
                  "--button-primary-color-hover": "#34D399",
                  "--button-primary-color-light": "#E6FDF4",
                } as React.CSSProperties
              }}
              onPress={handleAddToNotes}
            >
              <ClipboardList size={20} className="text-white" />
            </Button3D>

            {/* Print Button */}
            <Button3D
              type="secondary"
              iconOnly
              rounded="full"
              containerProps={{
                style: {
                  width: "44px",
                  height: "44px",
                  "--button-secondary-color": "#ffffff",
                  "--button-secondary-color-dark": "#E5E2E1",
                  "--button-secondary-color-hover": "#FCF9F8",
                  "--button-secondary-color-light": "#1C1B1B",
                } as React.CSSProperties
              }}
              onPress={() => window.print()}
            >
              <Printer size={20} className="text-text-primary" />
            </Button3D>

            {/* Favorite Button */}
            <span data-favorite-button="true">
              <Button3D
                type={isLikedState ? "primary" : "secondary"}
                iconOnly
                rounded="full"
                containerProps={{
                  style: {
                    width: "44px",
                    height: "44px",
                    "--button-primary-color": "#FF4B4B",
                    "--button-primary-color-dark": "#D43F3F",
                    "--button-primary-color-hover": "#FF3333",
                    "--button-secondary-color": "#ffffff",
                    "--button-secondary-color-dark": "#E5E2E1",
                    "--button-secondary-color-hover": "#FCF9F8",
                    "--button-secondary-color-light": "#5C5959",
                  } as React.CSSProperties
                }}
                onPress={handleLikeToggle}
              >
                <Heart
                  size={20}
                  fill={isLikedState ? "currentColor" : "none"}
                  className={isLikedState ? "text-white" : "text-text-secondary"}
                />
              </Button3D>
            </span>
          </div>
        </div>

        {/* Responsive 2-Column Grid for Tablet/Desktop */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start w-full">
          {/* Left Column */}
          <div className="flex flex-col gap-6 w-full">

            {/* Cover Photo */}
            <div className="relative w-full aspect-video rounded-[28px] overflow-hidden border-2 border-border-default shadow-[0_6px_0_#E5E2E1] bg-bg-subtle">
              <div
                className="w-full h-full bg-cover bg-center"
                style={{ backgroundImage: `url('${recipeImageUrl}')` }}
              />
            </div>

            {/* Recipe Title & Header Info */}
            <div className="flex flex-col gap-2">
              {/* Category/Tags list */}
              <div className="flex flex-wrap gap-1.5 font-nunito">
                {recipeTags.map((tag) => {
                  const presetLabel = CATEGORY_LABELS[tag]
                  return (
                    <span
                      key={tag}
                      className="flex items-center gap-1 px-3 py-1 font-bold text-xs bg-[#E9F0FD] text-[#007BFF] border-2 border-[#BDD6FF] shadow-[0_2px_0_#BDD6FF] rounded-full"
                    >
                      {getCategoryIcon(tag, 12)}
                      <span>{presetLabel || tag}</span>
                    </span>
                  )
                })}
                {recipeTags.length === 0 && (
                  <span className="flex items-center gap-1 px-3 py-1 font-bold text-xs bg-[#E9F0FD] text-[#007BFF] border-2 border-[#BDD6FF] shadow-[0_2px_0_#BDD6FF] rounded-full">
                    {getCategoryIcon("all", 12)}
                    <span>Egyéb</span>
                  </span>
                )}
              </div>

              <h1 className="font-nunito font-black text-2xl md:text-3xl text-text-primary leading-tight mt-1">
                {recipeTitle}
              </h1>

              <p className="text-text-secondary text-sm font-semibold leading-relaxed">
                {recipeDescription}
              </p>
            </div>

            {/* Video Guide Embed or Link */}
            {recipeVideoUrl && (() => {
              const youtubeEmbedUrl = getYoutubeEmbedUrl(recipeVideoUrl)
              const tiktokEmbedUrl = getTiktokEmbedUrl(recipeVideoUrl)
              const embedUrl = youtubeEmbedUrl || tiktokEmbedUrl
              return (
                <div className="no-print flex flex-col gap-2 bg-white p-4 rounded-[24px] border-2 border-border-default shadow-[0_4px_0_#E5E2E1]">
                  <span className="font-nunito font-black text-xs text-text-primary flex items-center gap-1.5">
                    Videós útmutató megtekintése 🎥
                  </span>
                  {embedUrl ? (
                    <div className="relative w-full aspect-video rounded-2xl overflow-hidden border border-border-subtle bg-black shadow-inner">
                      <iframe
                        src={embedUrl}
                        className="absolute inset-0 w-full h-full border-0"
                        allowFullScreen
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                      />
                    </div>
                  ) : (
                    <Button3D
                      type="secondary"
                      rounded="xl"
                      fullWidth
                      containerProps={{
                        style: {
                          height: "44px",
                          "--button-secondary-color": "#FFF5F5",
                          "--button-secondary-color-dark": "#FED7D7",
                          "--button-secondary-color-hover": "#FFF8F8",
                          "--button-secondary-color-light": "#E53E3E",
                        } as React.CSSProperties
                      }}
                      onPress={() => {
                        playSound("switchOn")
                        window.open(recipeVideoUrl, "_blank", "noopener,noreferrer")
                      }}
                    >
                      <span className="font-nunito font-black text-xs text-[#E53E3E] flex items-center justify-center gap-2">
                        Megnyitás külső oldalon
                      </span>
                    </Button3D>
                  )}
                </div>
              )
            })()}

            {/* Author badge */}
            <div className="flex items-center gap-3 bg-white p-3 rounded-2xl border-2 border-border-default shadow-[0_3px_0_#E5E2E1]">
              <div className="w-10 h-10 rounded-full border border-border-default bg-[#E9F0FD] p-1 flex items-center justify-center overflow-hidden flex-shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/Avatar/Faces/${recipe.authorImage}.svg`}
                  alt={recipe.authorName}
                  className="w-full h-full object-contain object-bottom"
                />
              </div>
              <div className="flex flex-col">
                <span className="text-text-tertiary text-[10px] font-bold uppercase font-nunito">Feltöltötte</span>
                <span className="text-text-primary text-sm font-black font-nunito leading-none mt-0.5">{recipe.authorName}</span>
              </div>
            </div>

            {/* Metadata tactile row */}
            <div className="grid grid-cols-3 gap-3">
              <div className="flex flex-col items-center justify-center p-3 bg-white border-2 border-border-default rounded-2xl shadow-[0_3px_0_#E5E2E1] text-center">
                <Clock size={18} className="text-accent-primary mb-1.5" />
                <span className="text-text-tertiary text-[10px] font-nunito font-bold uppercase">Idő</span>
                <span className="text-text-primary text-xs font-nunito font-black mt-0.5">{displayTime}</span>
              </div>

              <div className="flex flex-col items-center justify-center p-3 bg-white border-2 border-border-default rounded-2xl shadow-[0_3px_0_#E5E2E1] text-center">
                <Flame size={18} className="text-[#EF4444] mb-1.5" />
                <span className="text-text-tertiary text-[10px] font-nunito font-bold uppercase">Sütés/Főzés</span>
                <span className="text-text-primary text-xs font-nunito font-black mt-0.5">{recipeCookTime} perc</span>
              </div>

              <div className="flex flex-col items-center justify-center p-3 bg-white border-2 border-border-default rounded-2xl shadow-[0_3px_0_#E5E2E1] text-center">
                <TrendingUp
                  size={18}
                  className={`mb-1.5 ${displayDifficulty === "Könnyű" ? "text-[#4ADE80]" :
                    displayDifficulty === "Közepes" ? "text-[#FFA726]" : "text-[#EF5350]"
                    }`}
                />
                <span className="text-text-tertiary text-[10px] font-nunito font-bold uppercase">Nehézség</span>
                <span className="text-text-primary text-xs font-nunito font-black mt-0.5">{displayDifficulty}</span>
              </div>
            </div>

          </div>

          {/* Right Column */}
          <div className="flex flex-col gap-6 w-full">

            {/* Servings Adjuster */}
            <div className="bg-white p-5 rounded-[24px] border-2 border-border-default shadow-[0_4px_0_#E5E2E1] flex items-center justify-between">
              <div className="flex flex-col">
                <span className="font-nunito font-black text-lg text-text-primary">Adagok</span>
              </div>

              <div className="flex items-center gap-3.5 bg-bg-primary border-2 border-border-subtle px-3 py-1.5 rounded-full">
                <Button3D
                  type="primary"
                  iconOnly
                  rounded="full"
                  containerProps={{
                    style: {
                      width: "32px",
                      height: "32px",
                      opacity: servings <= 1 ? 0.5 : 1,
                      pointerEvents: servings <= 1 ? "none" : "auto",
                      "--button-primary-color": "#EF4444",
                      "--button-primary-color-dark": "#DC2626",
                      "--button-primary-color-hover": "#EF4444",
                      "--button-primary-color-light": "#FFFFFF",
                    } as React.CSSProperties
                  }}
                  onPress={handleDecrement}
                >
                  <Minus size={14} strokeWidth={3} className="text-white" />
                </Button3D>

                <span className="font-nunito font-black text-xl text-text-primary min-w-[28px] text-center select-none">
                  {servings}
                </span>

                <Button3D
                  type="primary"
                  iconOnly
                  rounded="full"
                  containerProps={{
                    style: {
                      width: "32px",
                      height: "32px",
                      "--button-primary-color": "#22C55E",
                      "--button-primary-color-dark": "#16A34A",
                      "--button-primary-color-hover": "#22C55E",
                      "--button-primary-color-light": "#FFFFFF",
                    } as React.CSSProperties
                  }}
                  onPress={handleIncrement}
                >
                  <Plus size={14} strokeWidth={3} className="text-white" />
                </Button3D>
              </div>
            </div>

            {/* Ingredients Checklist */}
            <div className="flex flex-col gap-3">
              <h2 className="font-nunito font-black text-xl text-text-primary flex items-center gap-2">
                <Utensils size={18} className="text-accent-primary" />
                Hozzávalók
              </h2>

              <div className="flex flex-col gap-2">
                {recipeIngredients.map((ing, idx) => {
                  const isChecked = checkedIngredients.has(idx)
                  const hasQty = !!ing.quantity
                  const displayQty = scaleQuantity(ing.quantity)

                  return (
                    <div
                      key={idx}
                      onClick={() => toggleIngredient(idx)}
                      className={`flex items-center justify-between p-3.5 rounded-2xl border-2 transition-all cursor-pointer select-none
                    ${isChecked
                          ? "border-border-default bg-bg-card text-text-tertiary shadow-[0_1px_0_#E5E2E1] translate-y-[2px] line-through"
                          : "border-border-default bg-white text-text-primary shadow-[0_3px_0_#E5E2E1] translate-y-0 active:translate-y-[1px] active:shadow-none"
                        }`}
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        {/* Print Checkbox */}
                        <div className="hidden print-only-checkbox flex-shrink-0" />

                        {/* Screen Checkbox */}
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all no-print
                      ${isChecked
                            ? "border-success-primary bg-success-primary text-[var(--button-primary-color,#22C55E)]"
                            : "border-border-default bg-white"
                          }`}
                        >
                          {isChecked && <Check size={12} strokeWidth={3} />}
                        </div>

                        <span className="font-semibold font-nunito text-sm capitalize break-words">
                          {ing.name}
                        </span>
                      </div>

                      {
                        hasQty && (
                          <span className={`text-xs font-extrabold flex-shrink-0 ml-2 py-0.5 px-2.5 rounded-lg border transition-all
                      ${isChecked
                              ? "bg-bg-elevated border-border-subtle text-text-tertiary"
                              : "bg-bg-primary border-border-default text-text-secondary"
                            }`}
                          >
                            {displayQty} {ing.unit}
                          </span>
                        )
                      }
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Instructions Steps Progression */}
            <div className="flex flex-col gap-3">
              <h2 className="font-nunito font-black text-xl text-text-primary flex items-center gap-2">
                <ChefHat size={18} className="text-accent-primary" />
                Elkészítés menete
              </h2>

              <div className="flex flex-col gap-4">
                {recipeInstructions.map((ins) => {
                  const isCompleted = completedSteps.has(ins.step)

                  return (
                    <div
                      key={ins.step}
                      onClick={() => toggleStep(ins.step)}
                      className={`flex flex-col gap-2 p-4 rounded-2xl border-2 transition-all cursor-pointer select-none
                    ${isCompleted
                          ? "border-success-primary bg-[#ECFDF5]/35 text-text-tertiary shadow-[0_1.5px_0_#D1FAE5] translate-y-[2.5px]"
                          : "border-border-default bg-white text-text-primary shadow-[0_4px_0_#E5E2E1] translate-y-0 active:translate-y-[2px] active:shadow-[0_2px_0_#E5E2E1]"
                        }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className={`font-nunito font-black text-xs px-2.5 py-1 rounded-full border transition-all
                      ${isCompleted
                            ? "border-success-primary bg-success-primary text-[var(--button-primary-color,#22C55E)]"
                            : "border-[#007BFF] bg-[#E9F0FD] text-[#007BFF]"
                          }`}
                        >
                          {ins.step}. Lépés
                        </span>

                        {isCompleted && (
                          <span className="flex items-center gap-1 text-xs font-black text-[var(--button-primary-color,#22C55E)]">
                            <Check size={14} strokeWidth={3} />
                            Kész
                          </span>
                        )}
                      </div>

                      <p className={`text-sm font-semibold font-nunito leading-relaxed transition-all
                    ${isCompleted ? "line-through opacity-80" : ""}`}
                      >
                        {ins.content}
                      </p>
                    </div>
                  )
                })}
              </div>

            </div>
          </div>
        </div>
      </div>

      {/* Request Food Modal */}
      <Modal
        open={showRequestModal}
        onClose={() => setShowRequestModal(false)}
        title="Étel kérése"
      >
        <div className="flex flex-col min-h-0 h-full">
          {/* Scrollable Content Container */}
          <div className="flex-1 min-h-0 overflow-y-auto pr-1 flex flex-col gap-4 py-2 hide-scrollbar">
            <p className="text-sm font-semibold text-text-secondary leading-relaxed">
              Állítsd be a dátumot és válaszd ki, hogy melyik családtagod szeretnéd értesíteni a kérésről!
            </p>

            {/* Date Picker Input */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold uppercase text-text-tertiary">Dátum</label>
              <div className="relative flex items-center bg-white border-2 border-border-default rounded-2xl px-4 h-12 shadow-[0_3px_0_#E5E2E1] transition-all duration-200 ease-out focus-within:translate-y-[2px] focus-within:shadow-[0_2px_0_#FF9F43] focus-within:border-[#FF9F43]">
                <Calendar size={18} className="text-text-tertiary mr-2.5 flex-shrink-0" />
                <input
                  type="date"
                  value={requestDate}
                  onChange={(e) => setRequestDate(e.target.value)}
                  className="w-full bg-transparent border-none outline-none text-text-primary text-sm font-semibold cursor-pointer"
                />
              </div>
            </div>

            {/* User Selection list */}
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-bold uppercase text-text-tertiary">Családtag kiválasztása</label>
              <div className="flex gap-4 overflow-x-auto pb-4 pt-1 -mx-1 px-1 hide-scrollbar">
                {allRecipients.map((member) => {
                  const isSelected = selectedRequestUser === member.id
                  return (
                    <div
                      key={member.id}
                      onClick={() => {
                        playSound("toggleOn")
                        setSelectedRequestUser(member.id)
                      }}
                      className={`flex flex-col items-center gap-2 p-3 min-w-[84px] rounded-2xl border-2 transition-all cursor-pointer select-none
                        ${isSelected
                          ? "border-[#FF9F43] bg-[#FFF9F5] text-text-primary shadow-[0_3px_0_#FF9F43] translate-y-[1px]"
                          : "border-border-default bg-white text-text-secondary shadow-[0_4px_0_#E5E2E1] hover:bg-bg-card active:translate-y-[1px]"
                        }`}
                    >
                      <div className={`relative w-12 h-12 rounded-full border-2 p-1 flex items-center justify-center overflow-hidden flex-shrink-0 transition-all duration-200
                        ${isSelected ? "border-[#FF9F43] bg-[#FFE0B2]" : "border-border-default bg-[#E9F0FD]"}`}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={`/Avatar/Faces/${member.image}.svg`}
                          alt={member.name}
                          className="w-full h-full object-contain object-bottom"
                        />
                        {isSelected && (
                          <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#FF9F43] text-white flex items-center justify-center border border-white">
                            <Check size={9} strokeWidth={4} />
                          </div>
                        )}
                      </div>
                      <span className="font-extrabold text-[11px] truncate max-w-full">{member.name}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="mt-4 pt-3 pb-1 border-t border-[#E5E2E1] shrink-0 no-print">
            <Button3D
              type="primary"
              rounded="full"
              containerProps={{
                style: {
                  width: "100%",
                  height: "48px",
                  "--button-primary-color": "#FF9F43",
                  "--button-primary-color-dark": "#E08528",
                  "--button-primary-color-hover": "#FFAA5A",
                  "--button-primary-color-light": "#FFFFFF",
                } as React.CSSProperties
              }}
              onPress={handleRequestFood}
            >
              <span className="font-nunito font-black text-sm text-white">Időzítés Elküldése</span>
            </Button3D>
          </div>
        </div>
      </Modal>

      {/* Edit Recipe Modal */}
      <Modal
        open={showEditModal}
        onClose={() => setShowEditModal(false)}
        title="Recept szerkesztése"
      >
        <form onSubmit={handleSaveRecipeEdit} className="flex flex-col min-h-0 h-full">
          {/* Scrollable Content Container */}
          <div className="flex-1 min-h-0 overflow-y-auto pr-1 flex flex-col gap-4 py-2 hide-scrollbar">
            {/* Title */}
            <div className="flex flex-col gap-2">
              <label className="font-nunito font-black text-xs text-text-secondary">Recept neve</label>
              <div className="relative flex items-center bg-[#FAF7F6] border-2 border-border-default rounded-2xl px-4 h-12 shadow-[0_3px_0_#E5E2E1] transition-all duration-200 ease-out focus-within:translate-y-[2px] focus-within:shadow-[0_2px_0_#007bff] focus-within:border-[#007bff] group">
                <ChefHat size={18} className="text-text-tertiary mr-2.5 transition-colors group-focus-within:text-[#007bff] flex-shrink-0" />
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full bg-transparent border-none outline-none font-bold text-text-primary placeholder:text-text-tertiary p-0 text-sm"
                  placeholder="Pl. Gulyásleves"
                  required
                />
              </div>
            </div>

            {/* Description */}
            <div className="flex flex-col gap-2">
              <label className="font-nunito font-black text-xs text-text-secondary">Rövid leírás</label>
              <div className="relative flex bg-[#FAF7F6] border-2 border-border-default rounded-2xl p-3 shadow-[0_3px_0_#E5E2E1] transition-all duration-200 focus-within:translate-y-[2px] focus-within:shadow-[0_2px_0_#007bff] focus-within:border-[#007bff] group">
                <ClipboardList size={18} className="text-text-tertiary mr-2.5 mt-0.5 transition-colors group-focus-within:text-[#007bff] flex-shrink-0" />
                <textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="w-full bg-transparent border-none outline-none font-semibold text-text-primary placeholder:text-text-tertiary p-0 text-sm resize-none"
                  placeholder="Pl. Hagyományos magyar gulyásleves marhahúsból..."
                  rows={3}
                />
              </div>
            </div>

            {/* Numeric Fields (3-column layout) */}
            <div className="grid grid-cols-3 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="font-nunito font-black text-xs text-text-secondary truncate text-center">Előkészület (p)</label>
                <div className="relative flex items-center bg-[#FAF7F6] border-2 border-border-default rounded-2xl px-3 h-11 shadow-[0_3px_0_#E5E2E1] transition-all duration-200 focus-within:translate-y-[2px] focus-within:shadow-[0_2px_0_#007bff] focus-within:border-[#007bff] group">
                  <Clock size={14} className="text-text-tertiary mr-1.5 flex-shrink-0 group-focus-within:text-[#007bff]" />
                  <input
                    type="number"
                    value={editPrepTime || ""}
                    onChange={(e) => setEditPrepTime(Math.max(0, parseInt(e.target.value) || 0))}
                    inputMode="numeric"
                    pattern="[0-9]*"
                    className="w-full font-nunito bg-transparent border-none outline-none font-bold text-text-primary text-center text-xs p-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    min="0"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="font-nunito font-black text-xs text-text-secondary truncate text-center">Sütés/Főzés (p)</label>
                <div className="relative flex items-center bg-[#FAF7F6] border-2 border-border-default rounded-2xl px-3 h-11 shadow-[0_3px_0_#E5E2E1] transition-all duration-200 focus-within:translate-y-[2px] focus-within:shadow-[0_2px_0_#007bff] focus-within:border-[#007bff] group">
                  <Flame size={14} className="text-text-tertiary mr-1.5 flex-shrink-0 group-focus-within:text-[#007bff]" />
                  <input
                    type="number"
                    value={editCookTime || ""}
                    onChange={(e) => setEditCookTime(Math.max(0, parseInt(e.target.value) || 0))}
                    inputMode="numeric"
                    pattern="[0-9]*"
                    className="w-full font-nunito bg-transparent border-none outline-none font-bold text-text-primary text-center text-xs p-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    min="0"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="font-nunito font-black text-xs text-text-secondary truncate text-center">Adagok (fő)</label>
                <div className="relative flex items-center bg-[#FAF7F6] border-2 border-border-default rounded-2xl px-3 h-11 shadow-[0_3px_0_#E5E2E1] transition-all duration-200 focus-within:translate-y-[2px] focus-within:shadow-[0_2px_0_#007bff] focus-within:border-[#007bff] group">
                  <Utensils size={14} className="text-text-tertiary mr-1.5 flex-shrink-0 group-focus-within:text-[#007bff]" />
                  <input
                    type="number"
                    value={editServingsDefault || ""}
                    onChange={(e) => setEditServingsDefault(Math.max(1, parseInt(e.target.value) || 4))}
                    inputMode="numeric"
                    pattern="[0-9]*"
                    className="w-full font-nunito bg-transparent border-none outline-none font-bold text-text-primary text-center text-xs p-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    min="1"
                  />
                </div>
              </div>
            </div>

            {/* Kategóriák és Címkék */}
            <div className="flex flex-col gap-3">
              <label className="font-nunito font-black text-xs text-text-secondary">
                Kategóriák és Címkék
              </label>
              <div className="flex gap-2 overflow-x-auto pb-2 pt-1 -mx-1 px-1 hide-scrollbar scroll-smooth">
                {allAvailableTags.map((tag) => {
                  const isSelected = editTags.includes(tag)
                  const label = CATEGORY_LABELS[tag] || tag
                  const icon = getCategoryIcon(tag, 14)
                  return (
                    <Button3D
                      key={tag}
                      element="div"
                      type={isSelected ? "primary" : "secondary"}
                      active={isSelected}
                      toggle
                      rounded="full"
                      onPress={(e) => {
                        e.preventDefault()
                        playSound("radio")
                        setEditTags(prev =>
                          isSelected ? prev.filter(t => t !== tag) : [...prev, tag]
                        )
                      }}
                      containerProps={{
                        "data-sound": "off",
                        style: {
                          flexShrink: 0,
                          height: "36px",
                          ...(isSelected ? {
                            "--button-primary-color": "#007BFF",
                            "--button-primary-color-dark": "#0056b3",
                            "--button-primary-color-hover": "#0069d9",
                            "--button-primary-color-light": "#ffffff",
                          } : {
                            "--button-secondary-color": "#8C8989",
                            "--button-secondary-color-dark": "#5C5959",
                            "--button-secondary-color-hover": "#A29F9F",
                            "--button-secondary-color-light": "#ffffff",
                          })
                        } as React.CSSProperties
                      } as any}
                    >
                      <span className="font-nunito font-bold text-xs flex items-center gap-1.5 whitespace-nowrap">
                        {icon}
                        {label}
                      </span>
                    </Button3D>
                  )
                })}
              </div>

              {/* Selected Tags list */}
              {editTags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-1">
                  {editTags.map((tag) => {
                    const displayLabel = CATEGORY_LABELS[tag] || tag
                    return (
                      <span
                        key={tag}
                        onClick={() => {
                          playSound("delete")
                          setEditTags(prev => prev.filter(t => t !== tag))
                        }}
                        className="font-nunito text-xs font-bold px-3 py-1 bg-[#FFF8EE] border-2 border-[#FFB347] text-[#D47E1F] rounded-full shadow-[0_2px_0_#FFE2C5] cursor-pointer hover:bg-[#FF6B35]/10 flex items-center gap-1.5 animate-in fade-in zoom-in duration-100"
                      >
                        {displayLabel}
                        <X size={12} strokeWidth={3} className="text-[#FF6B35]" />
                      </span>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Difficulty Selector */}
            <div className="flex flex-col gap-2">
              <label className="font-nunito font-black text-xs text-text-secondary">
                Nehézség
              </label>
              <div className="flex gap-2">
                {["Könnyű", "Közepes", "Nehéz"].map((level) => {
                  const isSelected = editDifficulty === level
                  return (
                    <Button3D
                      key={level}
                      element="div"
                      type={isSelected ? "primary" : "secondary"}
                      active={isSelected}
                      toggle={!isSelected}
                      rounded="full"
                      className={isSelected ? "aws-btn--active" : ""}
                      onPress={(e) => {
                        e.preventDefault()
                        playSound("radio")
                        setEditDifficulty(level as "Könnyű" | "Közepes" | "Nehéz")
                      }}
                      containerProps={{
                        "data-sound": "off",
                        style: {
                          flex: 1,
                          height: "36px",
                          ...(isSelected ? {
                            "--button-primary-color": level === "Könnyű" ? "#4ADE80" : level === "Közepes" ? "#FFA726" : "#EF5350",
                            "--button-primary-color-dark": level === "Könnyű" ? "#22C55E" : level === "Közepes" ? "#FB8C00" : "#D32F2F",
                            "--button-primary-color-hover": level === "Könnyű" ? "#66BB6A" : level === "Közepes" ? "#FFB74D" : "#E57373",
                            "--button-primary-color-light": "#ffffff",
                          } : {
                            "--button-secondary-color": "#8C8989",
                            "--button-secondary-color-dark": "#5C5959",
                            "--button-secondary-color-hover": "#A29F9F",
                            "--button-secondary-color-light": "#ffffff",
                          })
                        } as React.CSSProperties
                      } as any}
                    >
                      <span className="font-nunito font-bold text-xs flex items-center justify-center gap-1.5 whitespace-nowrap">
                        {level}
                      </span>
                    </Button3D>
                  )
                })}
              </div>
            </div>

            {/* Cover Image Upload */}
            <div className="flex flex-col gap-2">
              <label className="font-nunito font-black text-xs text-text-secondary">Borítókép módosítása</label>

              {/* Preset options */}
              <div className="grid grid-cols-3 gap-2">
                {PRESETS.map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      playSound("switchOn")
                      setEditImageUrl(preset.url)
                    }}
                    className={`relative h-12 rounded-2xl border-2 overflow-hidden cursor-pointer transition-all duration-200 active:scale-95 group
                      ${editImageUrl === preset.url ? "border-[#007BFF] scale-[0.98] shadow-[0_2px_4px_rgba(0,123,255,0.25)]" : "border-[#E5E2E1] hover:border-text-secondary"}`}
                  >
                    <img
                      src={preset.url}
                      alt={preset.label}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center p-1">
                      <span className="text-[9px] font-black text-white text-center leading-tight font-nunito">
                        {preset.label}
                      </span>
                    </div>
                  </button>
                ))}
              </div>

              {/* Native File Upload */}
              <div className="flex flex-col gap-2 mt-1">
                <span className="font-nunito font-black text-xs text-text-secondary">
                  Kép feltöltése eszközről
                </span>
                <input
                  type="file"
                  id="recipe-edit-image-upload"
                  accept="image/*"
                  className="absolute w-0 h-0 opacity-0 pointer-events-none font-nunito"
                  onChange={handleEditFileChange}
                />
                <label
                  htmlFor="recipe-edit-image-upload"
                  onClick={() => playSound("switchOn")}
                  className="flex items-center justify-center gap-2 w-full h-12 bg-[#8C8989] hover:bg-[#A29F9F] active:translate-y-[2px] active:shadow-none border-2 border-[#5C5959] shadow-[0_3px_0_#5c5959] text-white rounded-xl transition-all duration-100 cursor-pointer select-none font-nunito font-bold text-xs font-nunito"
                >
                  <ImageIcon size={16} />
                  {editUploading ? "Feltöltés..." : "Fénykép vagy fájl kiválasztása"}
                </label>
              </div>

              {/* Custom URL Input */}
              <div className="flex flex-col gap-2 mt-1">
                <label className="font-nunito font-black text-xs text-text-secondary">Vagy adj meg egyedi kép linket (URL)</label>
                <div className="relative flex items-center bg-[#FAF7F6] border-2 border-border-default rounded-2xl px-4 h-12 shadow-[0_3px_0_#E5E2E1] transition-all duration-200 ease-out focus-within:translate-y-[2px] focus-within:shadow-[0_2px_0_#007bff] focus-within:border-[#007bff] group">
                  <Link2 size={16} className="text-text-tertiary mr-2.5 transition-colors group-focus-within:text-[#007bff] flex-shrink-0" />
                  <input
                    type="text"
                    placeholder="https://example.com/image.jpg"
                    className="w-full bg-transparent border-none outline-none font-bold text-text-primary placeholder:text-text-tertiary p-0 text-sm"
                    value={editImageUrl}
                    onChange={(e) => setEditImageUrl(e.target.value)}
                  />
                </div>
              </div>

              {/* Preview */}
              {editImageUrl.trim() && (
                <div className="relative aspect-video w-full rounded-2xl border-2 border-border-default overflow-hidden shadow-[0_3px_0_#E5E2E1] mt-1">
                  <img
                    src={editImageUrl}
                    alt="Előnézet"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.currentTarget.style.display = "none"
                    }}
                  />
                </div>
              )}
            </div>

            {/* Video Link */}
            <div className="flex flex-col gap-2">
              <label className="font-nunito font-black text-xs text-text-secondary">Videó útmutató linkje (TikTok, YouTube)</label>
              <div className="relative flex items-center bg-[#FAF7F6] border-2 border-border-default rounded-2xl px-4 h-12 shadow-[0_3px_0_#E5E2E1] transition-all duration-200 ease-out focus-within:translate-y-[2px] focus-within:shadow-[0_2px_0_#007bff] focus-within:border-[#007bff] group">
                <Link2 size={16} className="text-text-tertiary mr-2.5 transition-colors group-focus-within:text-[#007bff] flex-shrink-0" />
                <input
                  type="text"
                  placeholder="https://www.tiktok.com/@user/video/..."
                  className="w-full bg-transparent border-none outline-none font-bold text-text-primary placeholder:text-text-tertiary p-0 text-sm"
                  value={editVideoUrl}
                  onChange={(e) => setEditVideoUrl(e.target.value)}
                />
              </div>
            </div>

            {/* Hozzávalók szerkesztése */}
            <div className="flex flex-col gap-3">
              <label className="font-nunito font-black text-xs text-text-secondary flex items-center gap-1.5">
                <Utensils size={14} className="text-text-tertiary" />
                Hozzávalók
              </label>
              <div className="flex flex-col gap-3">
                {editIngredients.map((ing) => (
                  <div key={ing.id} className="flex flex-col gap-2 p-3 bg-[#FAF7F6] border-2 border-border-default rounded-2xl shadow-[0_2px_0_#E5E2E1]">
                    {/* Hozzávaló neve & törlés */}
                    <div className="flex gap-2 items-center w-full">
                      <div className="flex-1 relative flex items-center bg-white border-2 border-border-default rounded-2xl px-3 h-10 shadow-[0_3px_0_#E5E2E1] transition-all duration-200 ease-out focus-within:translate-y-[2px] focus-within:shadow-[0_1px_0_#007bff] focus-within:border-[#007bff]">
                        <input
                          type="text"
                          placeholder="Hozzávaló neve (pl. liszt)"
                          className="w-full bg-transparent border-none outline-none font-bold text-text-primary text-sm p-0 placeholder:text-text-tertiary placeholder:font-semibold"
                          value={ing.name}
                          onChange={(e) => handleEditIngredientChange(ing.id, "name", e.target.value)}
                        />
                      </div>
                      <div className={editIngredients.length === 1 ? "opacity-0 pointer-events-none" : ""}>
                        <button
                          type="button"
                          tabIndex={editIngredients.length === 1 ? -1 : 0}
                          onClick={() => removeEditIngredient(ing.id)}
                          className="w-10 h-10 bg-[#EF4444] border-2 border-[#DC2626] shadow-[0_3px_0_#b91c1c] text-white rounded-xl active:translate-y-[2px] active:shadow-none flex items-center justify-center transition-all duration-100 cursor-pointer select-none shrink-0 outline-none"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>

                    {/* Mennyiség & Egység */}
                    <div className="flex gap-2 w-full">
                      <div className="flex-1 relative flex items-center bg-white border-2 border-border-default rounded-2xl px-3 h-10 shadow-[0_3px_0_#E5E2E1] transition-all duration-200 ease-out focus-within:translate-y-[2px] focus-within:shadow-[0_1px_0_#007bff] focus-within:border-[#007bff]">
                        <input
                          type="text"
                          placeholder="Mennyiség (pl. 200)"
                          className="w-full bg-transparent border-none outline-none font-bold text-text-primary text-sm p-0 placeholder:text-text-tertiary placeholder:font-semibold"
                          value={ing.quantity}
                          onChange={(e) => handleEditIngredientChange(ing.id, "quantity", e.target.value)}
                        />
                      </div>
                      <div className="flex-1 relative flex items-center bg-white border-2 border-border-default rounded-2xl px-3 h-10 shadow-[0_3px_0_#E5E2E1] transition-all duration-200 ease-out focus-within:translate-y-[2px] focus-within:shadow-[0_1px_0_#007bff] focus-within:border-[#007bff]">
                        <input
                          type="text"
                          placeholder="Egység (pl. g)"
                          className="w-full bg-transparent border-none outline-none font-bold text-text-primary text-sm p-0 placeholder:text-text-tertiary placeholder:font-semibold"
                          value={ing.unit}
                          onChange={(e) => handleEditIngredientChange(ing.id, "unit", e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={addEditIngredient}
                className="w-full h-[38px] bg-[#8C8989] hover:bg-[#A29F9F] active:translate-y-[2px] active:shadow-none border-2 border-[#5C5959] shadow-[0_3px_0_#5c5959] text-white rounded-xl flex items-center justify-center transition-all duration-100 cursor-pointer select-none font-nunito font-bold text-xs outline-none"
              >
                <span className="flex items-center justify-center gap-1.5">
                  <Plus size={14} strokeWidth={3} />
                  Új hozzávaló
                </span>
              </button>
            </div>

            {/* Elkészítés menete szerkesztése */}
            <div className="flex flex-col gap-3">
              <label className="font-nunito font-black text-xs text-text-secondary flex items-center gap-1.5">
                <ClipboardList size={14} className="text-text-tertiary" />
                Elkészítés menete
              </label>
              <div className="flex flex-col gap-3">
                {editInstructions.map((ins, index) => (
                  <div key={ins.id} className="flex flex-col gap-2.5 p-3 bg-[#FAF7F6] border-2 border-border-default rounded-2xl shadow-[0_2px_0_#E5E2E1]">
                    <div className="flex gap-2 items-center justify-between w-full">
                      <span className="font-nunito font-black text-sm text-[#007BFF] pl-1">
                        {index + 1}. Lépés
                      </span>
                      <div className={editInstructions.length === 1 ? "opacity-0 pointer-events-none" : ""}>
                        <button
                          type="button"
                          tabIndex={editInstructions.length === 1 ? -1 : 0}
                          onClick={() => removeEditInstruction(ins.id)}
                          className="w-9 h-9 bg-[#EF4444] border-2 border-[#DC2626] shadow-[0_3px_0_#b91c1c] text-white rounded-xl active:translate-y-[2px] active:shadow-none flex items-center justify-center transition-all duration-100 cursor-pointer select-none shrink-0 outline-none"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>

                    <div className="relative flex items-center bg-white border-2 border-border-default rounded-2xl p-3 shadow-[0_3px_0_#E5E2E1] transition-all duration-200 ease-out focus-within:translate-y-[2px] focus-within:shadow-[0_1px_0_#007bff] focus-within:border-[#007bff]">
                      <textarea
                        rows={3}
                        placeholder="Írd le ezt a lépést részletesen..."
                        className="w-full bg-transparent border-none outline-none font-semibold text-text-primary placeholder:text-text-tertiary p-0 text-sm resize-none"
                        value={ins.content}
                        onChange={(e) => handleEditInstructionChange(ins.id, e.target.value)}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={addEditInstruction}
                className="w-full h-[38px] bg-[#8C8989] hover:bg-[#A29F9F] active:translate-y-[2px] active:shadow-none border-2 border-[#5C5959] shadow-[0_3px_0_#5c5959] text-white rounded-xl flex items-center justify-center transition-all duration-100 cursor-pointer select-none font-nunito font-bold text-xs outline-none"
              >
                <span className="flex items-center justify-center gap-1.5">
                  <Plus size={14} strokeWidth={3} />
                  Új lépés
                </span>
              </button>
            </div>
          </div>

          {/* Submit/Save Button Pinned Footer */}
          <div className="mt-4 pt-3 pb-1 border-t border-[#E5E2E1] shrink-0 no-print flex gap-3">
            <Button3D
              type="primary"
              rounded="full"
              disabled={isSavingRecipe || isDeletingRecipe}
              onPress={handleDeleteRecipe}
              containerProps={{
                style: {
                  flex: 1,
                  height: "48px",
                  "--button-primary-color": "#EF4444",
                  "--button-primary-color-dark": "#DC2626",
                  "--button-primary-color-hover": "#E53E3E",
                  "--button-primary-color-light": "#FFFFFF",
                } as React.CSSProperties
              }}
            >
              <span className="font-nunito font-black text-sm text-white">
                {isDeletingRecipe ? "Törlés..." : "Recept Törlése"}
              </span>
            </Button3D>

            <Button3D
              type="primary"
              rounded="full"
              disabled={isSavingRecipe || isDeletingRecipe}
              containerProps={{
                style: {
                  flex: 1.5,
                  height: "48px",
                  opacity: isSavingRecipe ? 0.7 : 1,
                  "--button-primary-color": "#007BFF",
                  "--button-primary-color-dark": "#0056b3",
                  "--button-primary-color-hover": "#0069d9",
                  "--button-primary-color-light": "#FFFFFF",
                } as React.CSSProperties
              }}
            >
              <span className="font-nunito font-black text-sm text-white">
                {isSavingRecipe ? "Mentés..." : "Mentés"}
              </span>
            </Button3D>
          </div>
        </form>
      </Modal>
    </main>
  )
}

function getYoutubeEmbedUrl(url: string): string | null {
  if (!url) return null
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=|shorts\/)([^#\&\?]*).*/
  const match = url.match(regExp)
  if (match && match[2].length === 11) {
    return `https://www.youtube.com/embed/${match[2]}`
  }
  return null
}

function getTiktokEmbedUrl(url: string): string | null {
  if (!url) return null
  const match = url.match(/tiktok\.com\/@[^\/]+\/video\/(\d+)/)
  if (match && match[1]) {
    return `https://www.tiktok.com/embed/v2/${match[1]}`
  }
  return null
}
