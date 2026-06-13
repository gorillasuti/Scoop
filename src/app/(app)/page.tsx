import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { getSearchRecipes } from "@/app/actions/recipes"
import { getActiveShoppingList } from "@/app/actions/shopping"
import { HomeClient } from "./home-client"
import { redirect } from "next/navigation"

export default async function FeedPage() {
  const session = await auth()
  if (!session?.user?.id) {
    redirect("/login")
  }

  const userId = session.user.id

  // 1. Get logged-in user details
  const currentUser = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      familyName: true,
      preferences: true,
    },
  })

  const familyName = currentUser?.familyName || null
  const userPreferences = currentUser?.preferences || []

  // 2. Get all recipes for the feed & selection
  const res = await getSearchRecipes()
  const recipes = res.recipes || []

  // 3. Get family members (users with same familyName, excluding self)
  let familyMembers: any[] = []
  if (familyName) {
    familyMembers = await prisma.user.findMany({
      where: {
        familyName,
        id: { not: userId },
      },
      select: { id: true, name: true, image: true },
    })
  }

  // Add mock family members fallback if list is empty
  if (familyMembers.length === 0) {
    familyMembers = [
      { id: "mock-anya", name: "Anya", image: "Face1-female" },
      { id: "mock-apa", name: "Apa", image: "Face8" },
      { id: "mock-teso", name: "Testvér", image: "Face4" },
    ]
  }

  // 4. Get notifications scoped to current user only
  const notifications = await prisma.notification.findMany({
    where: {
      userId,
    },
    include: {
      sender: {
        select: {
          name: true,
          image: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 30,
  })

  // Format notifications to make date serializable
  const formattedNotifications = notifications.map(n => ({
    ...n,
    createdAt: n.createdAt.toISOString(),
  }))

  // 5. Get meal plans for the family (shared weekly menu)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`

  const nextWeek = new Date(today)
  nextWeek.setDate(nextWeek.getDate() + 7)
  const nextWeekStr = `${nextWeek.getFullYear()}-${String(nextWeek.getMonth() + 1).padStart(2, "0")}-${String(nextWeek.getDate()).padStart(2, "0")}`

  const mealPlans = await prisma.mealPlan.findMany({
    where: {
      date: {
        gte: todayStr,
        lte: nextWeekStr,
      },
      OR: [
        { userId },
        { creatorId: userId },
      ],
    },
    include: {
      creator: {
        select: {
          name: true,
          image: true,
        },
      },
      user: {
        select: {
          name: true,
          image: true,
        },
      },
    },
    orderBy: {
      date: "asc",
    },
  })

  const formattedMealPlans = mealPlans.map(mp => ({
    ...mp,
    createdAt: mp.createdAt.toISOString(),
  }))

  // 6. Get initial shopping list (scoped to user or shared with family)
  const shoppingListRes = await getActiveShoppingList()
  const initialShoppingList = shoppingListRes.shoppingList || {
    recipeIds: [],
    checkedKeys: [],
    isShared: false,
    ownerName: null
  }

  return (
    <HomeClient
      currentUser={currentUser}
      initialRecipes={recipes}
      initialNotifications={formattedNotifications}
      initialMealPlans={formattedMealPlans}
      familyMembers={familyMembers}
      userPreferences={userPreferences}
      initialShoppingList={initialShoppingList}
    />
  )
}
