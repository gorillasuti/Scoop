// Lock account logic - replicated from Dub.co's apps/web/lib/auth/lock-account.ts

import { prisma } from "@/lib/prisma";
import { MAX_LOGIN_ATTEMPTS } from "./constants";

export const incrementLoginAttempts = async (
  user: { id: string; email: string | null },
) => {
  const updated = await prisma.user.update({
    where: { id: user.id },
    data: {
      invalidLoginAttempts: {
        increment: 1,
      },
    },
    select: {
      lockedAt: true,
      invalidLoginAttempts: true,
    },
  });

  if (!updated.lockedAt && updated.invalidLoginAttempts >= MAX_LOGIN_ATTEMPTS) {
    await prisma.user.update({
      where: { id: user.id },
      data: {
        lockedAt: new Date(),
      },
    });
  }

  return {
    invalidLoginAttempts: updated.invalidLoginAttempts,
    lockedAt: updated.lockedAt,
  };
};

export const exceededLoginAttemptsThreshold = (
  user: { invalidLoginAttempts: number },
) => {
  return user.invalidLoginAttempts >= MAX_LOGIN_ATTEMPTS;
};
