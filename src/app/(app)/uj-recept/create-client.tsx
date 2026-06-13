"use client"

import React, { useState } from "react"
import { useRouter } from "next/navigation"
import {
  Plus,
  Trash2,
  Clock,
  Utensils,
  Soup,
  Salad,
  ChefHat,
  Coffee,
  CakeSlice,
  Leaf,
  Drumstick,
  Fish,
  Apple,
  TreePine,
  Egg,
  Flame,
  ClipboardList,
  Link2,
  Image as ImageIcon,
  X,
} from "lucide-react"
import { Button3D } from "react-3d-button"
import "react-3d-button/styles"
import { createRecipe } from "@/app/actions/recipes"
import { toast } from "sonner"
import { playSound } from "@/lib/sounds"

const CATEGORIES = [
  { id: 'breakfast', label: 'Reggeli', icon: <Coffee size={14} /> },
  { id: 'soups', label: 'Levesek', icon: <Soup size={14} /> },
  { id: 'mains', label: 'Főételek', icon: <ChefHat size={14} /> },
  { id: 'pasta', label: 'Tészták', icon: <Flame size={14} /> },
  { id: 'onepot', label: 'Egytálételek', icon: <Utensils size={14} /> },
  { id: 'desserts', label: 'Desszertek', icon: <CakeSlice size={14} /> },
  { id: 'salads', label: 'Saláták', icon: <Salad size={14} /> },
  { id: 'baking', label: 'Sütés', icon: <Egg size={14} /> },
  { id: 'poultry', label: 'Szárnyasok', icon: <Drumstick size={14} /> },
  { id: 'pork_beef', label: 'Sertés & Marha', icon: <Drumstick size={14} /> },
  { id: 'vegetarian', label: 'Vegetáriánus', icon: <Leaf size={14} /> },
  { id: 'quick', label: 'Gyors', icon: <Clock size={14} /> },
  { id: 'healthy', label: 'Egészséges', icon: <Apple size={14} /> },
]

const PRESETS = [
  { id: "mains", label: "Főétel", url: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&q=80&w=800" },
  { id: "soups", label: "Leves", url: "https://images.unsplash.com/photo-1476718406336-bb5a9690ee2a?q=80&w=687&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&q=80&w=800" },
  { id: "desserts", label: "Desszert", url: "https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&q=80&w=800" },
  { id: "salads", label: "Saláta", url: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&q=80&w=800" },
  { id: "breakfast", label: "Reggeli", url: "https://images.unsplash.com/photo-1504754524776-8f4f37790ca0?q=80&w=1170&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&fit=crop&q=80&w=800" },
  { id: "generic", label: "Konyha / Sütés", url: "https://images.unsplash.com/photo-1556910103-1c02745aae4d?auto=format&fit=crop&q=80&w=800" },
]


export function CreateRecipeClient() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)

  // Form States
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [selectedTags, setSelectedTags] = useState<string[]>(["mains"])
  const [prepTime, setPrepTime] = useState<number>(20)
  const [cookTime, setCookTime] = useState<number>(30)
  const [servings, setServings] = useState<number>(4)
  const [imageUrl, setImageUrl] = useState("")
  const [difficulty, setDifficulty] = useState<string>("Könnyű")
  const [videoUrl, setVideoUrl] = useState("")

  const generateId = () => Math.random().toString(36).substring(2, 9)

  // Ingredients State (initially start with one empty row)
  const [ingredients, setIngredients] = useState<
    { id: string; name: string; quantity: string; unit: string }[]
  >(() => [{ id: `ing-${generateId()}`, name: "", quantity: "", unit: "" }])

  // Instructions/Steps State (initially start with one empty row)
  const [instructions, setInstructions] = useState<{ id: string; content: string }[]>(() => [
    { id: `ins-${generateId()}`, content: "" },
  ])

  const addIngredient = () => {
    playSound("switchOn")
    setIngredients((prev) => [
      ...prev,
      { id: `ing-${generateId()}`, name: "", quantity: "", unit: "" },
    ])
  }

  const removeIngredient = (id: string) => {
    playSound("delete")
    setIngredients((prev) => prev.filter((ing) => ing.id !== id))
  }

  const handleIngredientChange = (
    id: string,
    field: "name" | "quantity" | "unit",
    value: string
  ) => {
    setIngredients((prev) =>
      prev.map((ing) => (ing.id === id ? { ...ing, [field]: value } : ing))
    )
  }

  const addInstruction = () => {
    playSound("switchOn")
    setInstructions((prev) => [
      ...prev,
      { id: `ins-${generateId()}`, content: "" },
    ])
  }

  const removeInstruction = (id: string) => {
    playSound("delete")
    setInstructions((prev) => prev.filter((ins) => ins.id !== id))
  }

  const handleInstructionChange = (id: string, value: string) => {
    setInstructions((prev) =>
      prev.map((ins) => (ins.id === id ? { ...ins, content: value } : ins))
    )
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Check size limit (5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("A feltöltött kép mérete nem lehet nagyobb 5MB-nál!", { id: "upload-size-error" })
      return
    }

    setUploading(true)
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
        setImageUrl(res.url)
        playSound("switchOn")
        toast.success("Kép sikeresen feltöltve!", { id: toastId })
      }
    } catch (err) {
      console.error(err)
      toast.error("Hiba történt a feltöltés közben!", { id: toastId })
    } finally {
      setUploading(false)
      // Reset the input so the same file can be re-selected
      e.target.value = ""
    }
  }

  const handleCreate = async () => {
    if (!title.trim()) {
      toast.error("Kérlek add meg a recept nevét!", { id: "validation-error" })
      return
    }

    const filledIngredients = ingredients.filter((i) => i.name.trim() !== "")
    if (filledIngredients.length === 0) {
      toast.error("Kérlek adj meg legalább egy hozzávalót!", { id: "validation-error" })
      return
    }

    const filledInstructions = instructions.filter((ins) => ins.content.trim() !== "")
    if (filledInstructions.length === 0) {
      toast.error("Kérlek adj meg legalább egy elkészítési lépést!", { id: "validation-error" })
      return
    }

    setLoading(true)

    try {
      const res = await createRecipe({
        title,
        description,
        prepTime,
        cookTime,
        servings,
        category: selectedTags[0] || "mains",
        difficulty,
        tags: selectedTags,
        videoUrl: videoUrl.trim() || undefined,
        imageUrl: imageUrl || undefined,
        ingredients: filledIngredients.map((i) => ({
          name: i.name.trim(),
          quantity: i.quantity ? parseFloat(i.quantity) : undefined,
          unit: i.unit.trim() || undefined,
        })),
        instructions: filledInstructions.map((ins, idx) => ({
          step: idx + 1,
          content: ins.content.trim(),
        })),
      })

      if (res.error) {
        toast.error(res.error)
        setLoading(false)
        return
      }

      playSound("registrationSuccess")
      toast.success("A recept sikeresen létrehozva! 🎉")
      router.push(`/recept/${res.recipeId}`)
      router.refresh()
    } catch (err) {
      console.error(err)
      toast.error("Hiba történt a mentés során!")
      setLoading(false)
    }
  }

  return (
    <main className="flex flex-col h-full overflow-hidden bg-bg-primary pb-24 w-full max-w-5xl mx-auto">
      {/* Main Form Area */}
      <div className="flex-1 overflow-y-auto overscroll-y-contain px-4 md:px-8 pt-2 pb-8 hide-scrollbar flex flex-col gap-6 w-full max-w-5xl mx-auto">

        {/* Responsive 2-Column Grid for Tablet/Desktop */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start w-full">
          {/* Card 1: Alapadatok (General Info) - Mobile: 1st, Desktop: Left col 1st */}
          <section className="bg-white border-2 border-border-default rounded-3xl p-5 shadow-[0_4px_0_#E5E2E1] flex flex-col gap-5 order-1 md:order-1">
            <div className="flex items-center gap-2 border-b border-border-subtle pb-3">
              <div className="w-8 h-8 rounded-xl bg-[#E9F0FD] border-2 border-[#C5DDFF] flex items-center justify-center text-[#007BFF] shadow-[0_2px_0_#C5DDFF] shrink-0">
                <ChefHat size={18} />
              </div>
              <h2 className="font-nunito font-black text-base text-text-primary">Recept adatai</h2>
            </div>

            {/* Recept Címe */}
            <div className="flex flex-col gap-2">
              <label htmlFor="recipe-title" className="font-nunito font-black text-xs text-text-secondary">
                Recept neve
              </label>
              <div className="relative flex items-center bg-[#FAF7F6] border-2 border-border-default rounded-2xl px-4 h-12 shadow-[0_3px_0_#E5E2E1] transition-all duration-200 ease-out focus-within:translate-y-[2px] focus-within:shadow-[0_2px_0_#007bff] focus-within:border-[#007bff] group">
                <ChefHat size={18} className="text-text-tertiary mr-2.5 transition-colors group-focus-within:text-[#007bff]" />
                <input
                  id="recipe-title"
                  type="text"
                  placeholder="Pl. Paprikás Csirke"
                  className="w-full bg-transparent border-none outline-none font-bold text-text-primary placeholder:text-text-tertiary p-0 text-sm"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>
            </div>

            {/* Kategóriák és Címkék */}
            <div className="flex flex-col gap-3">
              <label className="font-nunito font-black text-xs text-text-secondary">
                Kategóriák és Címkék (adj hozzá többet is!)
              </label>
              <div className="flex gap-2 overflow-x-auto pb-2 pt-1 -mx-1 px-1 hide-scrollbar scroll-smooth">
                {CATEGORIES.map((cat) => {
                  const isSelected = selectedTags.includes(cat.id)
                  return (
                    <Button3D
                      key={cat.id}
                      type={isSelected ? "primary" : "secondary"}
                      active={isSelected}
                      toggle
                      rounded="full"
                      onPress={() => {
                        playSound("radio")
                        setSelectedTags(prev =>
                          isSelected ? prev.filter(t => t !== cat.id) : [...prev, cat.id]
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
                        {cat.icon}
                        {cat.label}
                      </span>
                    </Button3D>
                  )
                })}
              </div>


              {/* Selected Tags Pills */}
              {selectedTags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-1">
                  {selectedTags.map((tag) => {
                    const preset = CATEGORIES.find(c => c.id === tag)
                    const displayLabel = preset ? preset.label : tag
                    return (
                      <span
                        key={tag}
                        onClick={() => {
                          playSound("delete")
                          setSelectedTags(prev => prev.filter(t => t !== tag))
                        }}
                        className="font-nunito text-xs font-bold px-3 py-1 bg-[#FFF8EE] border-2 border-[#FFB347] text-[#D47E1F] rounded-full shadow-[0_2px_0_#FFE2C5] cursor-pointer hover:bg-[#FF6B35]/10 flex items-center gap-1.5"
                      >
                        {displayLabel}
                        <X size={12} strokeWidth={3} className="text-[#FF6B35]" />
                      </span>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Nehézség */}
            <div className="flex flex-col gap-2">
              <label className="font-nunito font-black text-xs text-text-secondary">
                Nehézség
              </label>
              <div className="flex gap-2">
                {["Könnyű", "Közepes", "Nehéz"].map((level) => {
                  const isSelected = difficulty === level
                  return (
                    <Button3D
                      key={level}
                      type={isSelected ? "primary" : "secondary"}
                      active={isSelected}
                      toggle={!isSelected}
                      rounded="full"
                      className={isSelected ? "aws-btn--active" : ""}
                      onPress={() => {
                        playSound("radio")
                        setDifficulty(level)
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

            {/* Idők és Adagok - Native number inputs */}
            <div className="grid grid-cols-3 gap-3">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="prep-time" className="font-nunito font-black text-xs text-text-secondary truncate text-center">
                  Előkészület (p)
                </label>
                <div className="relative flex items-center bg-[#FAF7F6] border-2 border-border-default rounded-2xl px-3 h-11 shadow-[0_3px_0_#E5E2E1] transition-all duration-200 focus-within:translate-y-[2px] focus-within:shadow-[0_2px_0_#007bff] focus-within:border-[#007bff] group">
                  <Clock size={14} className="text-text-tertiary mr-1.5 flex-shrink-0 group-focus-within:text-[#007bff]" />
                  <input
                    id="prep-time"
                    type="number"
                    min={0}
                    inputMode="numeric"
                    pattern="[0-9]*"
                    className="w-full font-nunito bg-transparent border-none outline-none font-bold text-text-primary text-center text-xs p-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    value={prepTime || ""}
                    onChange={(e) => setPrepTime(e.target.value ? parseInt(e.target.value) : 0)}
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="cook-time" className="font-nunito font-black text-xs text-text-secondary truncate text-center">
                  Sütés/Főzés (p)
                </label>
                <div className="relative font-nunito flex items-center bg-[#FAF7F6] border-2 border-border-default rounded-2xl px-3 h-11 shadow-[0_3px_0_#E5E2E1] transition-all duration-200 focus-within:translate-y-[2px] focus-within:shadow-[0_2px_0_#007bff] focus-within:border-[#007bff] group">
                  <Flame size={14} className="text-text-tertiary mr-1.5 flex-shrink-0 group-focus-within:text-[#007bff]" />
                  <input
                    id="cook-time"
                    type="number"
                    min={0}
                    inputMode="numeric"
                    pattern="[0-9]*"
                    className="w-full font-nunito bg-transparent border-none outline-none font-bold text-text-primary text-center text-xs p-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    value={cookTime || ""}
                    onChange={(e) => setCookTime(e.target.value ? parseInt(e.target.value) : 0)}
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="servings" className="font-nunito font-black text-xs text-text-secondary truncate text-center">
                  Adagok (fő)
                </label>
                <div className="relative font-nunito flex items-center bg-[#FAF7F6] border-2 border-border-default rounded-2xl px-3 h-11 shadow-[0_3px_0_#E5E2E1] transition-all duration-200 focus-within:translate-y-[2px] focus-within:shadow-[0_2px_0_#007bff] focus-within:border-[#007bff] group">
                  <Utensils size={14} className="text-text-tertiary mr-1.5 flex-shrink-0 group-focus-within:text-[#007bff]" />
                  <input
                    id="servings"
                    type="number"
                    min={1}
                    inputMode="numeric"
                    pattern="[0-9]*"
                    className="w-full font-nunito bg-transparent border-none outline-none font-bold text-text-primary text-center text-xs p-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    value={servings || ""}
                    onChange={(e) => setServings(e.target.value ? parseInt(e.target.value) : 1)}
                  />
                </div>
              </div>
            </div>

            {/* Leírás */}
            <div className="flex flex-col gap-2">
              <label htmlFor="recipe-description" className="font-nunito font-black text-xs text-text-secondary">
                Rövid leírás
              </label>
              <div className="relative flex bg-[#FAF7F6] border-2 border-border-default rounded-2xl p-3 shadow-[0_3px_0_#E5E2E1] transition-all duration-200 focus-within:translate-y-[2px] focus-within:shadow-[0_2px_0_#007bff] focus-within:border-[#007bff] group">
                <ClipboardList size={16} className="text-text-tertiary mr-2.5 mt-0.5 flex-shrink-0 group-focus-within:text-[#007bff]" />
                <textarea
                  id="recipe-description"
                  rows={2}
                  placeholder="Meséld el pár mondatban, mitől különleges ez a recept!"
                  className="w-full bg-transparent border-none outline-none font-semibold text-text-primary placeholder:text-text-tertiary p-0 text-sm resize-none"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
            </div>
          </section>

          {/* Card 4: Recept Képe (Cover Image) - Mobile: 4th, Desktop: Left col 2nd */}
          <section className="bg-white border-2 border-border-default rounded-3xl p-5 shadow-[0_4px_0_#E5E2E1] flex flex-col gap-4 order-4 md:order-2">
            <div className="flex items-center gap-2 border-b border-border-subtle pb-3">
              <div className="w-8 h-8 rounded-xl bg-[#E9F0FD] border-2 border-[#C5DDFF] flex items-center justify-center text-[#007BFF] shadow-[0_2px_0_#C5DDFF] shrink-0">
                <ImageIcon size={18} />
              </div>
              <h2 className="font-nunito font-black text-base text-text-primary">Borítókép kiválasztása</h2>
            </div>

            {/* Preset options */}
            <div className="grid grid-cols-3 gap-2">
              {PRESETS.map((preset, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    playSound("switchOn")
                    setImageUrl(preset.url)
                  }}
                  className={`relative h-16 rounded-2xl border-2 overflow-hidden cursor-pointer transition-all duration-200 active:scale-95 group
                      ${imageUrl === preset.url ? "border-[#007BFF] scale-[0.98] shadow-[0_2px_4px_rgba(0,123,255,0.25)]" : "border-[#E5E2E1] hover:border-text-secondary"}`}
                >
                  <img
                    src={preset.url}
                    alt={preset.label}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center p-1">
                    <span className="text-[10px] font-black text-white text-center leading-tight">
                      {preset.label}
                    </span>
                  </div>
                </button>
              ))}
            </div>

            {/* Native File Upload Area - uses visual hiding with label for iOS Safari compatibility */}
            <div className="flex flex-col gap-2">
              <span className="font-nunito font-black text-xs text-text-secondary">
                Kép feltöltése eszközről
              </span>
              <input
                type="file"
                id="recipe-image-upload"
                accept="image/*"
                className="absolute w-0 h-0 opacity-0 pointer-events-none font-nunito"
                onChange={handleFileChange}
              />
              <label
                htmlFor="recipe-image-upload"
                onClick={() => playSound("switchOn")}
                className="flex items-center justify-center gap-2 w-full h-12 bg-[#8C8989] hover:bg-[#A29F9F] active:translate-y-[2px] active:shadow-none border-2 border-[#5C5959] shadow-[0_3px_0_#5c5959] text-white rounded-xl transition-all duration-100 cursor-pointer select-none font-nunito font-bold text-xs font-nunito"
              >
                <ImageIcon size={16} />
                {uploading ? "Feltöltés..." : "Fénykép vagy fájl kiválasztása"}
              </label>
            </div>

            {/* Custom URL Input */}
            <div className="flex flex-col gap-2">
              <label htmlFor="recipe-image-url" className="font-nunito font-black text-xs text-text-secondary">
                Vagy adj meg egyedi kép linket (URL)
              </label>
              <div className="relative flex items-center bg-[#FAF7F6] border-2 border-border-default rounded-2xl px-4 h-12 shadow-[0_3px_0_#E5E2E1] transition-all duration-200 ease-out focus-within:translate-y-[2px] focus-within:shadow-[0_2px_0_#007bff] focus-within:border-[#007bff] group">
                <Link2 size={16} className="text-text-tertiary mr-2.5 transition-colors group-focus-within:text-[#007bff]" />
                <input
                  id="recipe-image-url"
                  type="text"
                  placeholder="https://example.com/image.jpg"
                  className="w-full bg-transparent border-none outline-none font-bold text-text-primary placeholder:text-text-tertiary p-0 text-sm"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                />
              </div>
            </div>

            {/* Video Link Input */}
            <div className="flex flex-col gap-2">
              <label htmlFor="recipe-video-url" className="font-nunito font-black text-xs text-text-secondary">
                Videó útmutató linkje (TikTok, YouTube, Instagram)
              </label>
              <div className="relative flex items-center bg-[#FAF7F6] border-2 border-border-default rounded-2xl px-4 h-12 shadow-[0_3px_0_#E5E2E1] transition-all duration-200 ease-out focus-within:translate-y-[2px] focus-within:shadow-[0_2px_0_#007bff] focus-within:border-[#007bff] group">
                <Link2 size={16} className="text-text-tertiary mr-2.5 transition-colors group-focus-within:text-[#007bff]" />
                <input
                  id="recipe-video-url"
                  type="text"
                  placeholder="Pl. https://www.tiktok.com/@user/video/..."
                  className="w-full bg-transparent border-none outline-none font-bold text-text-primary placeholder:text-text-tertiary p-0 text-sm"
                  value={videoUrl}
                  onChange={(e) => setVideoUrl(e.target.value)}
                />
              </div>
            </div>

            {/* Live Preview */}
            {imageUrl.trim() && (
              <div className="relative aspect-video w-full rounded-2xl border-2 border-border-default overflow-hidden shadow-[0_3px_0_#E5E2E1]">
                <img
                  src={imageUrl}
                  alt="Előnézet"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.currentTarget.style.display = "none"
                  }}
                />
              </div>
            )}
          </section>

          {/* Card 2: Hozzávalók (Ingredients) - Mobile: 2nd, Desktop: Right col 1st */}
          <section className="bg-white border-2 border-border-default rounded-3xl p-5 shadow-[0_4px_0_#E5E2E1] flex flex-col gap-4 order-2 md:order-3">
            <div className="flex items-center gap-2 border-b border-border-subtle pb-3">
              <div className="w-8 h-8 rounded-xl bg-[#E6FDF4] border-2 border-[#B2F5DA] flex items-center justify-center text-[#10B981] shadow-[0_2px_0_#B2F5DA] shrink-0">
                <Utensils size={18} />
              </div>
              <h2 className="font-nunito font-black text-base text-text-primary">Hozzávalók</h2>
            </div>

            <div className="flex flex-col gap-4">
              {ingredients.map((ing) => (
                <div key={ing.id} className="flex flex-col gap-2 p-3 bg-[#FAF7F6] border-2 border-border-default rounded-2xl shadow-[0_2px_0_#E5E2E1]">
                  {/* Row 1: Name & Delete button */}
                  <div className="flex gap-2 items-center w-full">
                    <div className="flex-1 relative flex items-center bg-white border-2 border-border-default rounded-2xl px-3 h-10 shadow-[0_3px_0_#E5E2E1] transition-all duration-200 ease-out focus-within:translate-y-[2px] focus-within:shadow-[0_1px_0_#007bff] focus-within:border-[#007bff]">
                      <input
                        type="text"
                        placeholder="Hozzávaló neve (pl. liszt)"
                        className="w-full bg-transparent border-none outline-none font-bold text-text-primary text-sm p-0 placeholder:text-text-tertiary placeholder:font-semibold"
                        value={ing.name}
                        onChange={(e) => handleIngredientChange(ing.id, "name", e.target.value)}
                      />
                    </div>
                    <div className={ingredients.length === 1 ? "opacity-0 pointer-events-none" : ""}>
                      <button
                        type="button"
                        tabIndex={ingredients.length === 1 ? -1 : 0}
                        onClick={() => removeIngredient(ing.id)}
                        className="w-10 h-10 bg-[#EF4444] border-2 border-[#DC2626] shadow-[0_3px_0_#b91c1c] text-white rounded-xl active:translate-y-[2px] active:shadow-none flex items-center justify-center transition-all duration-100 cursor-pointer select-none shrink-0 outline-none"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>

                  {/* Row 2: Quantity & Unit */}
                  <div className="flex gap-2 w-full">
                    <div className="flex-1 relative flex items-center bg-white border-2 border-border-default rounded-2xl px-3 h-10 shadow-[0_3px_0_#E5E2E1] transition-all duration-200 ease-out focus-within:translate-y-[2px] focus-within:shadow-[0_1px_0_#007bff] focus-within:border-[#007bff]">
                      <input
                        type="text"
                        placeholder="Mennyiség (pl. 200)"
                        className="w-full bg-transparent border-none outline-none font-bold text-text-primary text-sm p-0 placeholder:text-text-tertiary placeholder:font-semibold"
                        value={ing.quantity}
                        onChange={(e) => handleIngredientChange(ing.id, "quantity", e.target.value)}
                      />
                    </div>
                    <div className="flex-1 relative flex items-center bg-white border-2 border-border-default rounded-2xl px-3 h-10 shadow-[0_3px_0_#E5E2E1] transition-all duration-200 ease-out focus-within:translate-y-[2px] focus-within:shadow-[0_1px_0_#007bff] focus-within:border-[#007bff]">
                      <input
                        type="text"
                        placeholder="Egység (pl. g)"
                        className="w-full bg-transparent border-none outline-none font-bold text-text-primary text-sm p-0 placeholder:text-text-tertiary placeholder:font-semibold"
                        value={ing.unit}
                        onChange={(e) => handleIngredientChange(ing.id, "unit", e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={addIngredient}
              className="w-full h-[38px] bg-[#8C8989] hover:bg-[#A29F9F] active:translate-y-[2px] active:shadow-none border-2 border-[#5C5959] shadow-[0_3px_0_#5c5959] text-white rounded-xl flex items-center justify-center transition-all duration-100 cursor-pointer select-none font-nunito font-bold text-xs outline-none"
            >
              <span className="flex items-center justify-center gap-1.5">
                <Plus size={14} strokeWidth={3} />
                Új hozzávaló
              </span>
            </button>
          </section>

          {/* Card 3: Elkészítés Lépései (Instructions) - Mobile: 3rd, Desktop: Right col 2nd */}
          <section className="bg-white border-2 border-border-default rounded-3xl p-5 shadow-[0_4px_0_#E5E2E1] flex flex-col gap-4 order-3 md:order-4">
            <div className="flex items-center gap-2 border-b border-border-subtle pb-3">
              <div className="w-8 h-8 rounded-xl bg-[#FFF9F5] border-2 border-[#FFE2C5] flex items-center justify-center text-[#FF9F43] shadow-[0_2px_0_#FFE2C5] shrink-0">
                <ClipboardList size={18} />
              </div>
              <h2 className="font-nunito font-black text-base text-text-primary">Elkészítés menete</h2>
            </div>
            <div className="flex flex-col gap-4">
              {instructions.map((ins, index) => (
                <div key={ins.id} className="flex flex-col gap-2.5 p-3 bg-[#FAF7F6] border-2 border-border-default rounded-2xl shadow-[0_2px_0_#E5E2E1]">
                  {/* Row 1: Step Number & Delete button */}
                  <div className="flex gap-2 items-center justify-between w-full">
                    <span className="font-nunito font-black text-sm text-[#007BFF] pl-1">
                      {index + 1}. Lépés
                    </span>
                    <div className={instructions.length === 1 ? "opacity-0 pointer-events-none" : ""}>
                      <button
                        type="button"
                        tabIndex={instructions.length === 1 ? -1 : 0}
                        onClick={() => removeInstruction(ins.id)}
                        className="w-9 h-9 bg-[#EF4444] border-2 border-[#DC2626] shadow-[0_3px_0_#b91c1c] text-white rounded-xl active:translate-y-[2px] active:shadow-none flex items-center justify-center transition-all duration-100 cursor-pointer select-none shrink-0 outline-none"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>

                  {/* Row 2: Textarea */}
                  <div className="relative flex items-center bg-white border-2 border-border-default rounded-2xl p-3 shadow-[0_3px_0_#E5E2E1] transition-all duration-200 ease-out focus-within:translate-y-[2px] focus-within:shadow-[0_1px_0_#007bff] focus-within:border-[#007bff]">
                    <textarea
                      rows={3}
                      placeholder="Írd le ezt a lépést részletesen..."
                      className="w-full bg-transparent border-none outline-none font-semibold text-text-primary placeholder:text-text-tertiary p-0 text-sm resize-none"
                      value={ins.content}
                      onChange={(e) => handleInstructionChange(ins.id, e.target.value)}
                    />
                  </div>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={addInstruction}
              className="w-full h-[38px] bg-[#8C8989] hover:bg-[#A29F9F] active:translate-y-[2px] active:shadow-none border-2 border-[#5C5959] shadow-[0_3px_0_#5c5959] text-white rounded-xl flex items-center justify-center transition-all duration-100 cursor-pointer select-none font-nunito font-bold text-xs outline-none"
            >
              <span className="flex items-center justify-center gap-1.5">
                <Plus size={14} strokeWidth={3} />
                Új lépés
              </span>
            </button>
          </section>

          {/* Létrehozás Gomb (Big Blue 3D Button) - Mobile: 5th, Desktop: spans both cols */}
          <div className="w-full mt-4 mb-10 order-5 md:order-5 md:col-span-2">
            <Button3D
              type="primary"
              fullWidth
              rounded="full"
              size="xl"
              disabled={loading}
              onPress={handleCreate}
              className="w-full"
              containerProps={{
                style: {
                  height: "54px",
                  "--button-primary-color": "#007BFF",
                  "--button-primary-color-dark": "#0056b3",
                  "--button-primary-color-hover": "#0047a8",
                  "--button-primary-color-light": "#FFFFFF",
                } as React.CSSProperties
              }}
            >
              <span className="font-nunito font-black text-base text-white flex items-center justify-center gap-2">
                <ChefHat size={18} strokeWidth={2.5} />
                {loading ? "Recept mentése..." : "Recept létrehozása"}
              </span>
            </Button3D>
          </div>
        </div>

      </div>
    </main>
  )
}
