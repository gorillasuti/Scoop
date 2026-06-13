"use server"

import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { createNotification } from "./notifications"

export async function createMealPlan(data: {
  userId: string
  recipeId: string
  date: string
  message?: string
}) {
  const session = await auth()
  if (!session?.user?.id) {
    return { error: "Nincs bejelentkezve!" }
  }

  try {
    const creatorId = session.user.id
    let targetUserId = data.userId

    // Get the creator's info for mock user handling
    const creator = await prisma.user.findUnique({
      where: { id: creatorId },
      select: { familyName: true, name: true },
    })

    // If the recipient is a mock user, ensure they exist in the DB
    if (targetUserId.startsWith("mock-")) {
      let familyName = creator?.familyName
      if (!familyName) {
        familyName = `${creator?.name || "Saját"} család`
        await prisma.user.update({
          where: { id: creatorId },
          data: { familyName },
        })
      }

      const mockNames: Record<string, { name: string; image: string }> = {
        "mock-anya": { name: "Anya", image: "Face1-female" },
        "mock-apa": { name: "Apa", image: "Face8" },
        "mock-teso": { name: "Testvér", image: "Face4" },
      }
      const mockInfo = mockNames[targetUserId] || { name: "Családtag", image: "Face1" }

      await prisma.user.upsert({
        where: { id: targetUserId },
        update: { familyName },
        create: {
          id: targetUserId,
          name: mockInfo.name,
          image: mockInfo.image,
          familyName: familyName || "Család",
          email: `${targetUserId}@mock.scoop.hu`,
          onboardingComplete: true,
        },
      })
    }

    const mealPlan = await prisma.mealPlan.create({
      data: {
        userId: targetUserId,
        creatorId: creatorId,
        recipeId: data.recipeId,
        date: data.date,
        message: data.message || null,
      },
    })

    return { success: true, mealPlan }
  } catch (err: any) {
    console.error("CREATE MEAL PLAN ERROR:", err)
    return { error: "Nem sikerült menteni az étkezési tervet!" }
  }
}

export async function getFamilyMealPlans() {
  const session = await auth()
  if (!session?.user?.id) {
    return { error: "Nincs bejelentkezve!" }
  }

  const userId = session.user.id

  try {
    // Get meal plans for the next 7 days
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

    // Format dates to be serializable
    const formattedMealPlans = mealPlans.map(mp => ({
      ...mp,
      createdAt: mp.createdAt.toISOString(),
    }))

    return { success: true, mealPlans: formattedMealPlans }
  } catch (err: any) {
    console.error("GET FAMILY MEAL PLANS ERROR:", err)
    return { error: "Nem sikerült lekérni az étkezési terveket!" }
  }
}

export async function deleteMealPlan(id: string) {
  const session = await auth()
  if (!session?.user?.id) {
    return { error: "Nincs bejelentkezve!" }
  }

  try {
    const mealPlan = await prisma.mealPlan.findUnique({
      where: { id },
    })

    if (!mealPlan) {
      return { error: "Az étkezési terv nem található!" }
    }

    const isOwn = mealPlan.userId === session.user.id || mealPlan.creatorId === session.user.id

    if (!isOwn) {
      return { error: "Nincs jogosultságod törölni ezt az étkezési tervet!" }
    }

    // Determine target recipient for deletion notification
    const currentUserId = session.user.id
    const targetUserId = mealPlan.userId === currentUserId ? mealPlan.creatorId : mealPlan.userId
    const dateFormatted = mealPlan.date

    let recipeTitle = mealPlan.message || "Tervezett étel"
    if (mealPlan.recipeId) {
      const recipe = await prisma.recipe.findUnique({
        where: { id: mealPlan.recipeId },
        select: { title: true }
      })
      if (recipe?.title) {
        recipeTitle = recipe.title
      }
    }

    await prisma.mealPlan.delete({
      where: { id },
    })

    // Notify the other user connected to the meal plan
    if (targetUserId && targetUserId !== currentUserId) {
      const title = "Törölt heti menü"
      const message = mealPlan.userId === currentUserId
        ? `Törölték a(z) "${recipeTitle}" ételt ${dateFormatted} napról.`
        : `Törölték a neked időzített "${recipeTitle}" ételt ${dateFormatted} napról.`

      await createNotification({
        userId: targetUserId,
        title,
        message,
        recipeId: mealPlan.recipeId || undefined,
        date: mealPlan.date || undefined,
      })
    }

    return { success: true }
  } catch (err: any) {
    console.error("DELETE MEAL PLAN ERROR:", err)
    return { error: "Nem sikerült törölni az étkezési tervet!" }
  }
}
