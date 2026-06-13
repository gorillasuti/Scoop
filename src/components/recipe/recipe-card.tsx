"use client"

import { useState, useRef } from "react"
import { useRouter, usePathname } from "next/navigation"
import { Heart, Clock, Signal } from "lucide-react"
import { Button3D } from "react-3d-button"
import "react-3d-button/styles"
import { toggleLikeRecipe } from "@/app/actions/recipes"
import { toast } from "sonner"

export interface RecipeCardProps {
  id: string
  title: string
  imageUrl: string
  time: string
  difficulty: "Könnyű" | "Közepes" | "Nehéz"
  isLiked?: boolean
  onToggleLike?: (liked: boolean) => void
  description?: string | null
  category?: string | null
  tags?: string[]
  authorName?: string
  ingredients?: any[]
  servings?: number
}

const CATEGORY_LABELS: Record<string, string> = {
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

export function RecipeCard({
  id,
  title,
  imageUrl,
  time,
  difficulty,
  isLiked = false,
  onToggleLike,
  description,
  category,
  authorName,
  ingredients,
  servings = 4,
}: RecipeCardProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [prevIsLiked, setPrevIsLiked] = useState(isLiked)
  const [isLikedState, setIsLikedState] = useState(isLiked)
  const isPendingRef = useRef(false)

  if (isLiked !== prevIsLiked) {
    setPrevIsLiked(isLiked)
    setIsLikedState(isLiked)
  }

  const handleCardClick = () => {
    router.push(`/recept/${id}?from=${pathname}`)
  }

  const handleLikeToggle = async (e?: { stopPropagation?: () => void }) => {
    if (e?.stopPropagation) e.stopPropagation()

    if (isPendingRef.current) return
    isPendingRef.current = true

    const originalState = isLikedState
    const newState = !originalState
    setIsLikedState(newState)

    try {
      const res = await toggleLikeRecipe(id)
      if (res.error) {
        toast.error(res.error)
        setIsLikedState(originalState)
      } else if (res.success && res.liked !== undefined) {
        setIsLikedState(res.liked)
        if (onToggleLike) onToggleLike(res.liked)
      }
    } catch {
      toast.error("Hiba történt a művelet közben!")
      setIsLikedState(originalState)
    } finally {
      isPendingRef.current = false
    }
  }

  return (
    <div
      onClick={handleCardClick}
      className="group relative w-full bg-white rounded-[24px] border-2 border-border-default shadow-[0_4px_0_#E5E2E1] overflow-hidden transition-all duration-200 hover:shadow-[0_2px_0_#E5E2E1] hover:translate-y-[2px] cursor-pointer flex flex-col"
    >

      {/* Image container */}
      <div className="relative h-48 w-full bg-bg-subtle overflow-hidden flex-shrink-0">
        <div
          className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-105"
          style={{ backgroundImage: `url('${imageUrl}')` }}
        />

        {/* Category Badge */}
        {category && CATEGORY_LABELS[category] && (
          <div className="absolute top-3 left-3 z-10 flex items-center gap-1 px-2.5 py-1 bg-[#E9F0FD] text-[#007BFF] border-2 border-[#BDD6FF] shadow-[0_2px_0_#BDD6FF] rounded-full select-none font-nunito text-[10px] font-black">
            <span>{CATEGORY_LABELS[category]}</span>
          </div>
        )}

        {/* Favorite Button */}
        <div
          className="absolute top-3 right-3 z-10"
          onClick={(e) => e.stopPropagation()}
          data-favorite-button="true"
        >
          <Button3D
            type={isLikedState ? "primary" : "secondary"}
            iconOnly
            rounded="full"
            containerProps={{
              style: {
                width: "36px",
                height: "36px",
                "--button-primary-color": "#FF4B4B",
                "--button-primary-color-dark": "#D43F3F",
                "--button-primary-color-hover": "#FF3333",
                "--button-secondary-color": "#ffffff",
                "--button-secondary-color-dark": "#E5E2E1",
                "--button-secondary-color-hover": "#FCF9F8",
                "--button-secondary-color-light": "#5C5959",
              } as React.CSSProperties
            }}
            className="p-0 flex items-center justify-center cursor-pointer transition-colors group/heart"
            onPress={handleLikeToggle}
          >
            <Heart
              size={16}
              fill={isLikedState ? "currentColor" : "none"}
              className={`transition-colors duration-150 ${isLikedState ? "text-white" : "text-text-secondary group-hover/heart:text-[#FF4B4B]"
                }`}
              strokeWidth={isLikedState ? 2 : 2.5}
            />
          </Button3D>
        </div>
      </div>

      {/* Content */}
      <div className="p-3.5 flex flex-col gap-1.5 flex-grow">
        <h3 className="font-nunito font-black text-sm md:text-base leading-tight text-text-primary line-clamp-1 group-hover:text-[#007BFF] transition-colors">
          {title}
        </h3>

        {/* Description */}
        {description && (
          <p className="text-text-secondary font-nunito text-[11px] font-semibold line-clamp-1 leading-relaxed">
            {description}
          </p>
        )}

        {/* Tactile Metadata Badges Row */}
        <div className="flex flex-nowrap items-center gap-1 mt-auto pt-1.5 pb-1.5 overflow-x-auto hide-scrollbar select-none w-full">
          {/* Time Badge */}
          <div className="flex items-center gap-1 px-1.5 py-0.5 text-[9px] font-extrabold bg-[#F5F3FF] text-[#7C3AED] border border-[#DDD6FE] shadow-[0_1px_0_#DDD6FE] rounded-lg font-nunito flex-shrink-0">
            <Clock size={11} className="text-[#7C3AED] flex-shrink-0" />
            <span>{time}</span>
          </div>

          {/* Difficulty Badge */}
          <div className={`flex items-center gap-1 px-1.5 py-0.5 text-[9px] font-extrabold border rounded-lg font-nunito flex-shrink-0 ${difficulty === "Könnyű"
            ? "bg-[#E8F8F0] border-[#A7E6C5] text-[#15803D] shadow-[0_1px_0_#A7E6C5]"
            : difficulty === "Közepes"
              ? "bg-[#FFF4E5] border-[#FFD39B] text-[#B25E00] shadow-[0_1px_0_#FFD39B]"
              : "bg-[#FEECEE] border-[#FCA5A5] text-[#B91C1C] shadow-[0_1px_0_#FCA5A5]"
            }`}>
            <Signal size={11} className="flex-shrink-0" />
            <span>{difficulty}</span>
          </div>

          {/* Servings Badge */}
          <div className="flex items-center gap-0.5 px-1.5 py-0.5 text-[9px] font-extrabold bg-[#FFF9F5] border border-[#FFE2C5] text-[#FF9F43] shadow-[0_1px_0_#FFE2C5] rounded-lg font-nunito flex-shrink-0">
            <span>🍽️ {servings} adag</span>
          </div>

          {/* Ingredients Badge */}
          {ingredients && ingredients.length > 0 && (
            <div className="flex items-center gap-0.5 px-1.5 py-0.5 text-[9px] font-extrabold bg-[#F0FDF4] border border-[#BBF7D0] text-[#16A34A] shadow-[0_1px_0_#BBF7D0] rounded-lg font-nunito flex-shrink-0">
              <span>🥕 {ingredients.length} db</span>
            </div>
          )}

          {/* Author Badge */}
          {authorName && (
            <div className="flex items-center gap-0.5 px-1.5 py-0.5 text-[9px] font-extrabold bg-[#E9F0FD] border border-[#BDD6FF] text-[#007BFF] shadow-[0_1px_0_#BDD6FF] rounded-lg font-nunito flex-shrink-0">
              <span>🧑‍🍳 {authorName}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
