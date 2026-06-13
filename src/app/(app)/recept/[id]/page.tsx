import { getRecipeById } from "@/app/actions/recipes"
import { RecipeDetailClient } from "./recipe-detail-client"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import { Suspense } from "react"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function RecipePage({ params }: PageProps) {
  const { id } = await params
  const res = await getRecipeById(id)

  if (res.error || !res.recipe) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] p-6 text-center">
        <div className="w-24 h-24 mb-6 flex items-center justify-center bg-white rounded-3xl border-2 border-border-default shadow-[0_6px_0_#E5E2E1] text-4xl select-none ">
          📭
        </div>
        <h2 className="font-nunito font-black text-2xl text-text-primary mb-2">
          Recept nem található!
        </h2>
        <p className="text-text-secondary mb-6 font-semibold max-w-sm">
          {res.error || "A keresett recept nem létezik vagy törölték."}
        </p>
        <Link href="/kereses" className="no-underline">
          <button className="flex items-center gap-2 px-6 py-3 font-nunito font-bold text-sm bg-white border-2 border-border-default text-text-primary rounded-xl shadow-[0_4px_0_#E5E2E1] active:translate-y-[2px] active:shadow-[0_2px_0_#E5E2E1] hover:bg-bg-card transition-all cursor-pointer">
            <ArrowLeft size={16} />
            <span>Vissza a kereséshez</span>
          </button>
        </Link>
      </div>
    )
  }

  // Fetch family members sharing the same familyName (excluding current user)
  const session = await auth()
  let familyMembers: { id: string; name: string; image: string }[] = []
  if (session?.user?.id) {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { familyName: true },
    })
    if (user?.familyName) {
      const members = await prisma.user.findMany({
        where: {
          familyName: user.familyName,
          id: { not: session.user.id },
        },
        select: {
          id: true,
          name: true,
          image: true,
        },
      })
      familyMembers = members.map((m) => ({
        id: m.id,
        name: m.name ?? "Névtelen Tag",
        image: m.image ?? "Face1",
      }))
    }
  }

  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[70vh]">
        <span className="font-nunito font-bold text-text-tertiary">Betöltés...</span>
      </div>
    }>
      <RecipeDetailClient recipe={res.recipe} familyMembers={familyMembers} />
    </Suspense>
  )
}
