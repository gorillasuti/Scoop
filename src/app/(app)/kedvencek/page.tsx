"use client"

import { useState, useEffect, useRef } from "react"
import { getLikedRecipes } from "@/app/actions/recipes"
import { RecipeCard } from "@/components/recipe/recipe-card"
import { Button3D } from "react-3d-button"
import "react-3d-button/styles"
import { toast } from "sonner"
import Link from "next/link"

export default function FavoritesPage() {
  const [recipes, setRecipes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const initialFetchRef = useRef(false)

  useEffect(() => {
    if (initialFetchRef.current) return
    initialFetchRef.current = true

    async function loadData() {
      try {
        const res = await getLikedRecipes()
        if (res.error) {
          toast.error(res.error)
        } else if (res.recipes) {
          setRecipes(res.recipes)
        }
      } catch {
        toast.error("Hiba történt a kedvencek betöltésekor!")
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  const handleUnlike = (recipeId: string) => {
    setRecipes((prev) => prev.filter((r) => r.id !== recipeId))
  }

  return (
    <main className="flex flex-col h-full overflow-hidden bg-bg-primary w-full pb-24 max-w-5xl mx-auto">
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 flex-1">
          <div className="w-10 h-10 border-4 border-[#007BFF] border-t-transparent rounded-full animate-spin" />
          <span className="font-bold text-sm text-text-tertiary">Kedvencek betöltése... ❤️</span>
        </div>
      ) : recipes.length > 0 ? (
        <div className="flex-1 min-h-0 overflow-y-auto px-4 md:px-8 pt-2 hide-scrollbar">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pb-6">
            {recipes.map((recipe) => (
              <RecipeCard
                key={recipe.id}
                {...recipe}
                onToggleLike={(liked) => {
                  if (!liked) handleUnlike(recipe.id)
                }}
              />
            ))}
          </div>
        </div>
      ) : (
        /* Premium Playful Empty State */
        <div className="flex-1 min-h-0 overflow-y-auto px-4 md:px-8 pt-2 hide-scrollbar">
          <div className="flex flex-col items-center justify-center text-center py-12 px-6 bg-white border-2 border-border-default rounded-3xl shadow-[0_4px_0_#E5E2E1] max-w-sm mx-auto mt-8 mb-6">

            {/* 3D emoji container */}
            <div className="w-18 h-18 rounded-3xl border-2 border-border-default bg-white shadow-[0_6px_0_#E5E2E1] flex items-center justify-center text-4xl mb-6 transform hover:rotate-12 hover:-translate-y-1 transition-all duration-200 select-none">
              ❤️
            </div>

            <h3 className="font-nunito font-black text-2xl tracking-tight text-text-primary mb-3">Még nincsenek kedvenceid!</h3>
            <p className="text-text-secondary text-sm font-bold leading-relaxed max-w-[280px] mb-6">
              Ha megtetszik egy recept a keresőben vagy a főoldalon, mentsd el a szivecskével!
            </p>
            <Link href="/kereses">
              <Button3D
                type="primary"
                rounded="xl"
                containerProps={{ style: { height: "40px" } }}
                className="cursor-pointer font-bold text-xs px-6"
              >
                Receptek böngészése 🔎
              </Button3D>
            </Link>
          </div>
        </div>
      )}
    </main>
  )
}
