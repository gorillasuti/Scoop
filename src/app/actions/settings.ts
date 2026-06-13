"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { hashPassword, validatePassword } from "@/lib/auth/password";

const MIN_PASSWORD_LENGTH = 8;
const MAX_PASSWORD_LENGTH = 72;
const MAX_NAME_LENGTH = 100;

const VALID_AVATAR_IDS = new Set([
  "Face1", "Face2", "Face4", "Face5", "Face8",
  "Face1-female", "Face2-female", "Face3-female", "Face4-female",
]);

const VALID_PREFERENCE_IDS = new Set([
  "breakfast", "soups", "mains", "pasta", "onepot",
  "desserts", "salads", "baking", "poultry", "pork_beef",
  "vegetarian", "quick", "healthy"
]);

/**
 * Felhasználói profil frissítése (név, avatar, preferenciák).
 */
export async function updateProfile(data: {
  name?: string;
  avatar?: string;
  preferences?: string[];
  email?: string;
}) {
  const session = await auth();

  if (!session?.user?.id) {
    return { error: "Nincs bejelentkezve!" };
  }

  const updateData: Record<string, any> = {};

  if (data.name !== undefined) {
    const trimmedName = data.name.trim();
    if (!trimmedName) {
      return { error: "A név nem lehet üres!" };
    }
    if (trimmedName.length > MAX_NAME_LENGTH) {
      return { error: `A név maximum ${MAX_NAME_LENGTH} karakter lehet!` };
    }
    updateData.name = trimmedName;
  }

  if (data.email !== undefined) {
    const trimmedEmail = data.email.trim().toLowerCase();
    if (!trimmedEmail) {
      return { error: "Az email cím nem lehet üres!" };
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      return { error: "Érvénytelen email formátum!" };
    }
    const existing = await prisma.user.findUnique({
      where: { email: trimmedEmail },
      select: { id: true },
    });
    if (existing && existing.id !== session.user.id) {
      return { error: "Ez az email cím már használatban van!" };
    }
    updateData.email = trimmedEmail;
  }

  if (data.avatar !== undefined) {
    if (!VALID_AVATAR_IDS.has(data.avatar)) {
      return { error: "Érvénytelen avatar!" };
    }
    updateData.image = data.avatar;
  }

  if (data.preferences !== undefined) {
    if (!Array.isArray(data.preferences) || data.preferences.length > VALID_PREFERENCE_IDS.size) {
      return { error: "Érvénytelen preferenciák!" };
    }
    const invalid = data.preferences.filter((p) => !VALID_PREFERENCE_IDS.has(p));
    if (invalid.length > 0) {
      return { error: "Érvénytelen preferencia azonosító!" };
    }
    updateData.preferences = data.preferences;
  }

  if (Object.keys(updateData).length === 0) {
    return { error: "Nincs mit frissíteni!" };
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: updateData,
  });

  return { success: true };
}

/**
 * Jelszó megváltoztatása.
 */
export async function changePassword(data: {
  currentPassword: string;
  newPassword: string;
}) {
  const session = await auth();

  if (!session?.user?.id) {
    return { error: "Nincs bejelentkezve!" };
  }

  if (!data.currentPassword || !data.newPassword) {
    return { error: "Mindkét jelszómező kitöltése kötelező!" };
  }

  if (data.newPassword.length < MIN_PASSWORD_LENGTH) {
    return { error: `Az új jelszónak legalább ${MIN_PASSWORD_LENGTH} karakternek kell lennie.` };
  }

  if (data.newPassword.length > MAX_PASSWORD_LENGTH) {
    return { error: `Az új jelszó nem lehet hosszabb, mint ${MAX_PASSWORD_LENGTH} karakter.` };
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { passwordHash: true },
  });

  if (!user?.passwordHash) {
    return { error: "Nem található jelszó ehhez a fiókhoz!" };
  }

  const isValid = await validatePassword({
    password: data.currentPassword,
    passwordHash: user.passwordHash,
  });

  if (!isValid) {
    return { error: "A jelenlegi jelszó helytelen!" };
  }

  const newHash = await hashPassword(data.newPassword);

  await prisma.user.update({
    where: { id: session.user.id },
    data: { passwordHash: newHash },
  });

  return { success: true };
}

/**
 * Felhasználó adatainak lekérése a beállítások oldalhoz.
 */
export async function getUserSettings() {
  const session = await auth();

  if (!session?.user?.id) {
    return { error: "Nincs bejelentkezve!" };
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
  });

  if (!user) {
    return { error: "Felhasználó nem található!" };
  }

  return {
    success: true,
    user: {
      ...user,
      createdAt: user.createdAt.toISOString(),
    },
  };
}

/**
 * Családnév megváltoztatása az admin által (a család összes tagjára érvényesítve).
 */
export async function updateFamilyName(newFamilyName: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Nincs bejelentkezve!" };

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true, familyName: true }
  });

  if (!user || user.role !== "ADMIN") {
    return { error: "Nincs jogosultságod a családnév módosításához!" };
  }

  const trimmed = newFamilyName.trim();
  if (!trimmed) return { error: "A családnév nem lehet üres!" };

  const currentFamilyName = user.familyName;

  if (currentFamilyName) {
    await prisma.user.updateMany({
      where: { familyName: currentFamilyName },
      data: { familyName: trimmed }
    });
  } else {
    await prisma.user.update({
      where: { id: session.user.id },
      data: { familyName: trimmed }
    });
  }

  return { success: true };
}

/**
 * Családtag szerepkörének módosítása vagy eltávolítása a családból.
 */
export async function updateUserRoleOrRemove(
  targetUserId: string,
  action: "MAKE_ADMIN" | "MAKE_USER" | "REMOVE"
) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Nincs bejelentkezve!" };

  const currentUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true, familyName: true }
  });

  if (!currentUser || currentUser.role !== "ADMIN") {
    return { error: "Nincs jogosultságod tagok szerkesztéséhez!" };
  }

  const targetUser = await prisma.user.findUnique({
    where: { id: targetUserId },
    select: { id: true, familyName: true }
  });

  if (!targetUser || (targetUser.familyName !== null && targetUser.familyName !== currentUser.familyName)) {
    return { error: "A célfelhasználó nem a családod tagja!" };
  }

  if (action === "MAKE_ADMIN") {
    await prisma.user.update({
      where: { id: targetUserId },
      data: { role: "ADMIN" }
    });
  } else if (action === "MAKE_USER") {
    await prisma.user.update({
      where: { id: targetUserId },
      data: { role: "USER" }
    });
  } else if (action === "REMOVE") {
    await prisma.user.delete({
      where: { id: targetUserId }
    });
  }

  return { success: true };
}
