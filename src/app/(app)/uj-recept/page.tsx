import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { CreateRecipeClient } from "./create-client"

export default async function CreateRecipePage() {
  const session = await auth()

  if (!session?.user?.id) {
    redirect("/login")
  }

  return <CreateRecipeClient />
}
