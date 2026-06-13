import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import { SettingsClient } from "./settings-client"

export default async function SettingsPage() {
  const session = await auth()

  if (!session?.user?.id) {
    redirect("/login")
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      role: true,
      familyName: true,
      preferences: true,
      createdAt: true,
    },
  })

  if (!user) {
    redirect("/login")
  }

  // Fetch family members sharing the same familyName (excluding current user)
  const familyMembersRaw = user.familyName
    ? await prisma.user.findMany({
        where: {
          familyName: user.familyName,
          id: { not: user.id },
        },
        select: {
          id: true,
          name: true,
          image: true,
          role: true,
        },
      })
    : []

  const familyMembers = familyMembersRaw.map((member) => ({
    id: member.id,
    name: member.name ?? "Névtelen Tag",
    image: member.image ?? "Face1",
    role: member.role ?? "MEMBER",
  }))

  return (
    <SettingsClient
      user={{
        ...user,
        name: user.name ?? "",
        email: user.email ?? "",
        image: user.image ?? "Face1",
        familyName: user.familyName ?? "",
        createdAt: user.createdAt.toISOString(),
      }}
      familyMembers={familyMembers}
    />
  )
}

