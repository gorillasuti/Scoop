"use server"

import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { sendPushToUser } from "@/lib/push-sender"

export async function createNotification(data: {
  userId: string
  title: string
  message: string
  recipeId?: string
  date?: string
}) {
  const session = await auth()
  if (!session?.user?.id) {
    return { error: "Nincs bejelentkezve!" }
  }

  try {
    const senderId = session.user.id
    let targetUserId = data.userId

    // Get the sender's info (name and familyName) from DB
    const sender = await prisma.user.findUnique({
      where: { id: senderId },
      select: { familyName: true, name: true },
    })

    const senderName = sender?.name || session.user.name || "Családtag"
    const finalTitle = `${data.title} - ${senderName}`

    // If the recipient is a mock user, ensure they exist in the DB so PostgreSQL FK constraint doesn't fail
    if (targetUserId.startsWith("mock-")) {
      let familyName = sender?.familyName
      if (!familyName) {
        familyName = `${sender?.name || "Saját"} család`
        // Update sender's familyName
        await prisma.user.update({
          where: { id: senderId },
          data: { familyName },
        })
      }

      const mockNames: Record<string, { name: string; image: string }> = {
        "mock-anya": { name: "Anya", image: "Face1-female" },
        "mock-apa": { name: "Apa", image: "Face8" },
        "mock-teso": { name: "Testvér", image: "Face4" },
      }
      const mockInfo = mockNames[targetUserId] || { name: "Családtag", image: "Face1" }

      // Upsert mock user
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

    const notif = await prisma.notification.create({
      data: {
        userId: targetUserId,
        senderId: senderId,
        title: finalTitle,
        message: data.message,
        recipeId: data.recipeId || null,
        date: data.date || null,
      },
    })

    // Send Web Push to recipient
    await sendPushToUser(targetUserId, {
      title: finalTitle,
      body: data.message,
      icon: "/icon-512.png",
      badge: "/icon-192.png",
      url: data.recipeId ? `/recept/${data.recipeId}` : "/",
    })

    return { success: true, notification: notif }
  } catch (err: any) {
    console.error("CREATE NOTIFICATION ERROR:", err)
    return { error: "Nem sikerült menteni az értesítést!" }
  }
}

export async function getUnreadNotifications() {
  const session = await auth()
  if (!session?.user?.id) {
    return { error: "Nincs bejelentkezve!" }
  }

  const userId = session.user.id

  try {
    // Scoped to current user only - only notifications sent TO me or BY me
    const notifications = await prisma.notification.findMany({
      where: {
        read: false,
        userId,
      },
      orderBy: {
        createdAt: "desc",
      },
    })
    return { success: true, notifications }
  } catch (err: any) {
    console.error("GET UNREAD NOTIFICATIONS ERROR:", err)
    return { error: "Nem sikerült lekérni az értesítéseket!" }
  }
}

export async function markNotificationAsRead(id: string) {
  const session = await auth()
  if (!session?.user?.id) {
    return { error: "Nincs bejelentkezve!" }
  }

  try {
    await prisma.notification.update({
      where: { id },
      data: { read: true },
    })
    return { success: true }
  } catch (err: any) {
    console.error("MARK NOTIFICATION AS READ ERROR:", err)
    return { error: "Nem sikerült frissíteni az értesítést!" }
  }
}

export async function getRecentNotifications() {
  const session = await auth()
  if (!session?.user?.id) {
    return { error: "Nincs bejelentkezve!" }
  }

  const userId = session.user.id

  try {
    // Scoped to current user only
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
    return { success: true, notifications }
  } catch (err: any) {
    console.error("GET RECENT NOTIFICATIONS ERROR:", err)
    return { error: "Nem sikerült lekérni az értesítéseket!" }
  }
}

export async function markAllNotificationsAsRead() {
  const session = await auth()
  if (!session?.user?.id) {
    return { error: "Nincs bejelentkezve!" }
  }

  const userId = session.user.id

  try {
    // Scoped to current user only
    await prisma.notification.updateMany({
      where: {
        read: false,
        userId,
      },
      data: {
        read: true,
      },
    })
    return { success: true }
  } catch (err: any) {
    console.error("MARK ALL NOTIFICATIONS AS READ ERROR:", err)
    return { error: "Nem sikerült frissíteni az értesítéseket!" }
  }
}

export async function deleteNotification(id: string) {
  const session = await auth()
  if (!session?.user?.id) {
    return { error: "Nincs bejelentkezve!" }
  }

  try {
    const notif = await prisma.notification.findUnique({
      where: { id },
    })

    if (!notif) {
      return { error: "Az értesítés nem található!" }
    }

    // Only the recipient or sender can delete
    const isOwn = notif.userId === session.user.id || notif.senderId === session.user.id
    if (!isOwn) {
      return { error: "Nincs jogosultságod törölni ezt az értesítést!" }
    }

    await prisma.notification.delete({
      where: { id },
    })
    return { success: true }
  } catch (err: any) {
    console.error("DELETE NOTIFICATION ERROR:", err)
    return { error: "Nem sikerült törölni az értesítést!" }
  }
}

export async function clearAllNotifications() {
  const session = await auth()
  if (!session?.user?.id) {
    return { error: "Nincs bejelentkezve!" }
  }

  const userId = session.user.id

  try {
    // Scoped to current user only
    await prisma.notification.deleteMany({
      where: {
        userId,
      },
    })
    return { success: true }
  } catch (err: any) {
    console.error("CLEAR ALL NOTIFICATIONS ERROR:", err)
    return { error: "Nem sikerült törölni az értesítéseket!" }
  }
}
