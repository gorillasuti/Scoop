"use server"

import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { createNotification } from "./notifications"

// Get the active shopping list (either family shared or personal)
export async function getActiveShoppingList() {
  const session = await auth()
  if (!session?.user?.id) {
    return { error: "Nincs bejelentkezve!" }
  }

  const userId = session.user.id

  try {
    // 1. Get the user's familyName
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { familyName: true }
    })

    const familyName = user?.familyName

    // 2. Look for a shared family shopping list
    if (familyName) {
      const sharedList = await prisma.shoppingList.findFirst({
        where: {
          familyName,
          isShared: true,
          sharedWithIds: { has: userId }
        },
        include: {
          user: {
            select: {
              name: true
            }
          }
        }
      })

      if (sharedList) {
        return {
          success: true,
          shoppingList: {
            id: sharedList.id,
            userId: sharedList.userId,
            recipeIds: sharedList.recipeIds,
            checkedKeys: sharedList.checkedKeys,
            isShared: sharedList.isShared,
            familyName: sharedList.familyName,
            ownerName: sharedList.user.name || "Családtag",
            sharedWithIds: sharedList.sharedWithIds || []
          }
        }
      }
    }

    // 3. Fallback to user's personal shopping list
    let personalList = await prisma.shoppingList.findUnique({
      where: { userId }
    })

    // If no list exists at all, create an empty one for the user so it exists
    if (!personalList) {
      personalList = await prisma.shoppingList.create({
        data: {
          userId,
          recipeIds: [],
          checkedKeys: [],
          isShared: false,
          sharedWithIds: [],
          familyName: null
        }
      })
    }

    return {
      success: true,
      shoppingList: {
        id: personalList.id,
        userId: personalList.userId,
        recipeIds: personalList.recipeIds,
        checkedKeys: personalList.checkedKeys,
        isShared: personalList.isShared,
        familyName: personalList.familyName,
        ownerName: null,
        sharedWithIds: personalList.sharedWithIds || []
      }
    }
  } catch (err: any) {
    console.error("GET SHOPPING LIST ERROR:", err)
    return { error: "Nem sikerült lekérni a bevásárlólistát!" }
  }
}

// Update the recipe list for the active shopping list (either family shared or personal)
export async function saveShoppingListRecipes(recipeIds: string[]) {
  const session = await auth()
  if (!session?.user?.id) {
    return { error: "Nincs bejelentkezve!" }
  }

  const userId = session.user.id

  try {
    // 1. Get user info
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { familyName: true }
    })

    const familyName = user?.familyName

    // 2. Check if a shared family list exists
    if (familyName) {
      const sharedList = await prisma.shoppingList.findFirst({
        where: {
          familyName,
          isShared: true,
          sharedWithIds: { has: userId }
        }
      })

      if (sharedList) {
        // Update the existing shared list
        const updated = await prisma.shoppingList.update({
          where: { id: sharedList.id },
          data: {
            recipeIds
          },
          include: {
            user: {
              select: {
                name: true
              }
            }
          }
        })
        revalidatePath("/")
        return {
          success: true,
          shoppingList: {
            id: updated.id,
            userId: updated.userId,
            recipeIds: updated.recipeIds,
            checkedKeys: updated.checkedKeys,
            isShared: updated.isShared,
            familyName: updated.familyName,
            ownerName: updated.user.name || "Családtag",
            sharedWithIds: updated.sharedWithIds || []
          }
        }
      }
    }

    // 3. Update or create the user's personal list
    const updated = await prisma.shoppingList.upsert({
      where: { userId },
      create: {
        userId,
        recipeIds,
        checkedKeys: [],
        isShared: false,
        sharedWithIds: [],
        familyName: null
      },
      update: {
        recipeIds
      }
    })

    revalidatePath("/")
    return {
      success: true,
      shoppingList: {
        id: updated.id,
        userId: updated.userId,
        recipeIds: updated.recipeIds,
        checkedKeys: updated.checkedKeys,
        isShared: updated.isShared,
        familyName: updated.familyName,
        ownerName: null,
        sharedWithIds: updated.sharedWithIds || []
      }
    }
  } catch (err: any) {
    console.error("SAVE SHOPPING LIST RECIPES ERROR:", err)
    return { error: "Nem sikerült menteni a bevásárlólistát!" }
  }
}

// Toggle an item's checked/ticked status
export async function toggleShoppingListItemKey(key: string, isChecked: boolean) {
  const session = await auth()
  if (!session?.user?.id) {
    return { error: "Nincs bejelentkezve!" }
  }

  const userId = session.user.id

  try {
    // 1. Find active list (shared family list first, then personal)
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { familyName: true }
    })

    let activeList = null
    const familyName = user?.familyName

    if (familyName) {
      activeList = await prisma.shoppingList.findFirst({
        where: {
          familyName,
          isShared: true,
          sharedWithIds: { has: userId }
        }
      })
    }

    if (!activeList) {
      activeList = await prisma.shoppingList.findUnique({
        where: { userId }
      })
    }

    if (!activeList) {
      return { error: "Nincs aktív bevásárlólista!" }
    }

    let checkedKeys = [...activeList.checkedKeys]
    if (isChecked) {
      if (!checkedKeys.includes(key)) {
        checkedKeys.push(key)
      }
    } else {
      checkedKeys = checkedKeys.filter(k => k !== key)
    }

    const updated = await prisma.shoppingList.update({
      where: { id: activeList.id },
      data: { checkedKeys }
    })

    revalidatePath("/")
    return { success: true, checkedKeys: updated.checkedKeys }
  } catch (err: any) {
    console.error("TOGGLE SHOPPING LIST ITEM ERROR:", err)
    return { error: "Nem sikerült frissíteni a tétel állapotát!" }
  }
}

// Share or unshare the user's shopping list
export async function setShoppingListShared(sharedWithIds: string[]) {
  const session = await auth()
  if (!session?.user?.id) {
    return { error: "Nincs bejelentkezve!" }
  }

  const userId = session.user.id
  const isShared = sharedWithIds.length > 0

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { familyName: true }
    })

    const familyName = user?.familyName

    if (isShared && !familyName) {
      return { error: "Csak családhoz csatlakozva tudod megosztani a bevásárlólistádat!" }
    }

    // Get previous sharedWithIds to determine removed members
    const existingList = await prisma.shoppingList.findUnique({
      where: { userId },
      select: { sharedWithIds: true }
    })
    const prevSharedWithIds = existingList?.sharedWithIds || []

    if (isShared && familyName) {
      // Share the current user's list
      await prisma.shoppingList.upsert({
        where: { userId },
        create: {
          userId,
          recipeIds: [],
          checkedKeys: [],
          isShared: true,
          familyName,
          sharedWithIds
        },
        update: {
          isShared: true,
          familyName,
          sharedWithIds
        }
      })

      // Send notification to all shared members
      for (const targetUserId of sharedWithIds) {
        await createNotification({
          userId: targetUserId,
          title: "Megosztott bevásárlólista",
          message: "Megosztott veled egy bevásárlólistát!"
        })
      }

      // Send "Megosztás visszavonva" to members who were removed from sharing
      const removed = prevSharedWithIds.filter(id => !sharedWithIds.includes(id))
      for (const targetUserId of removed) {
        await createNotification({
          userId: targetUserId,
          title: "Megosztás visszavonva",
          message: "Visszavonta a bevásárlólista megosztását veled."
        })
      }

      revalidatePath("/")
      return { success: true, isShared: true, sharedWithIds }
    } else {
      // Unshare current user's list
      await prisma.shoppingList.upsert({
        where: { userId },
        create: {
          userId,
          recipeIds: [],
          checkedKeys: [],
          isShared: false,
          familyName: null,
          sharedWithIds: []
        },
        update: {
          isShared: false,
          familyName: null,
          sharedWithIds: []
        }
      })

      // Notify all members who were previously shared with that the list is no longer shared
      for (const targetUserId of prevSharedWithIds) {
        await createNotification({
          userId: targetUserId,
          title: "Megosztás visszavonva",
          message: "Visszavonta a bevásárlólista megosztását veled."
        })
      }

      revalidatePath("/")
      return { success: true, isShared: false, sharedWithIds: [] }
    }
  } catch (err: any) {
    console.error("SHARE SHOPPING LIST ERROR:", err)
    return { error: "Nem sikerült megváltoztatni a megosztási beállításokat!" }
  }
}

// Clear active list recipes and ticked items
export async function clearShoppingList() {
  const session = await auth()
  if (!session?.user?.id) {
    return { error: "Nincs bejelentkezve!" }
  }

  const userId = session.user.id

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { familyName: true }
    })

    const familyName = user?.familyName

    let activeList = null
    if (familyName) {
      activeList = await prisma.shoppingList.findFirst({
        where: {
          familyName,
          isShared: true,
          sharedWithIds: { has: userId }
        }
      })
    }

    if (!activeList) {
      activeList = await prisma.shoppingList.findUnique({
        where: { userId }
      })
    }

    if (activeList) {
      const prevSharedWithIds = activeList.sharedWithIds || []
      const ownerId = activeList.userId
      const isOwner = ownerId === userId

      await prisma.shoppingList.update({
        where: { id: activeList.id },
        data: {
          recipeIds: [],
          checkedKeys: [],
          ...(isOwner ? {
            isShared: false,
            sharedWithIds: [],
            familyName: null
          } : {})
        }
      })

      // If it is a shared list, notify other users
      if (activeList.isShared) {
        const recipients = prevSharedWithIds.filter(id => id !== userId)
        if (ownerId !== userId && !recipients.includes(ownerId)) {
          recipients.push(ownerId)
        }

        for (const targetUserId of recipients) {
          await createNotification({
            userId: targetUserId,
            title: "Bevásárlólista törölve",
            message: "Törölte a megosztott bevásárlólista tartalmát."
          })
        }
      }
    }

    revalidatePath("/")
    return { success: true }
  } catch (err: any) {
    console.error("CLEAR SHOPPING LIST ERROR:", err)
    return { error: "Nem sikerült törölni a bevásárlólistát!" }
  }
}
