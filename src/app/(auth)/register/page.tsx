import { Suspense } from "react"
import { prisma } from "@/lib/prisma"
import RegisterForm from "./register-form"

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>
}) {
  const resolvedParams = await searchParams;
  const token = resolvedParams.token || null;

  let isFirstUser = false;
  let inviteValid = false;
  let dbUnavailable = false;

  try {
    const userCount = await prisma.user.count();
    isFirstUser = userCount === 0;

    if (!isFirstUser && token) {
      const invite = await prisma.invite.findUnique({
        where: { token },
      });
      if (invite) {
        const isNotExpired = !invite.expiresAt || invite.expiresAt > new Date();
        const hasUses = invite.uses < invite.maxUses;
        if (isNotExpired && hasUses) {
          inviteValid = true;
        }
      }
    }
  } catch {
    dbUnavailable = true;
  }

  if (dbUnavailable) {
    return (
      <div className="min-h-[100dvh] bg-bg-primary flex flex-col items-center justify-center px-6 text-center gap-4">
        <p className="text-4xl">🍳</p>
        <h1 className="font-nunito font-black text-2xl text-text-primary">A szerver épp indul</h1>
        <p className="text-text-secondary font-semibold max-w-sm">
          Az adatbázis még nem elérhető. Próbáld újra pár másodperc múlva, vagy jelentkezz be a meglévő fiókoddal.
        </p>
        <a
          href="/login"
          className="font-bold text-accent-primary underline underline-offset-4"
        >
          Tovább a bejelentkezéshez
        </a>
      </div>
    );
  }

  return (
    <Suspense fallback={<div className="min-h-[100dvh] bg-bg-primary flex items-center justify-center text-text-secondary font-bold">Töltés...</div>}>
      <RegisterForm isFirstUser={isFirstUser} inviteValid={inviteValid} token={token} />
    </Suspense>
  )
}
