"use server";

import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth/password";
import { Role } from "@prisma/client";
import { auth } from "@/auth";
import crypto from "crypto";

const MIN_PASSWORD_LENGTH = 8;
const MAX_PASSWORD_LENGTH = 72; // bcrypt max
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const VALID_AVATAR_IDS = new Set([
  "Face1", "Face2", "Face4", "Face5", "Face8",
  "Face1-female", "Face2-female", "Face3-female", "Face4-female",
]);

const MAX_NAME_LENGTH = 100;

const VALID_PREFERENCE_IDS = new Set([
  "breakfast", "soups", "mains", "pasta", "onepot",
  "desserts", "salads", "baking", "poultry", "pork_beef",
  "vegetarian", "quick", "healthy"
]);

/**
 * Első admin regisztrálása - ez a funkció csak egyetlen egyszer működik,
 * amíg az adatbázis teljesen üres.
 */
export async function setupAdmin(formData: FormData) {
  const name = (formData.get("name") as string)?.trim();
  const email = (formData.get("email") as string)?.trim().toLowerCase();
  const password = formData.get("password") as string;

  if (!email || !password || !name) {
    return { error: "Minden mező kitöltése kötelező!" };
  }

  if (!EMAIL_REGEX.test(email)) {
    return { error: "Kérlek adj meg egy érvényes email címet!" };
  }

  if (name.length > MAX_NAME_LENGTH) {
    return { error: `A név maximum ${MAX_NAME_LENGTH} karakter lehet!` };
  }

  if (password.length < MIN_PASSWORD_LENGTH) {
    return { error: `A jelszónak legalább ${MIN_PASSWORD_LENGTH} karakternek kell lennie.` };
  }

  if (password.length > MAX_PASSWORD_LENGTH) {
    return { error: `A jelszó nem lehet hosszabb, mint ${MAX_PASSWORD_LENGTH} karakter.` };
  }

  // Atomikus ellenőrzés: a tranzakción belül nézzük, van-e már felhasználó.
  try {
    await prisma.$transaction(async (tx) => {
      const userCount = await tx.user.count();
      if (userCount > 0) {
        throw new Error("SETUP_ALREADY_COMPLETED");
      }

      const passwordHash = await hashPassword(password);

      await tx.user.create({
        data: {
          name,
          email,
          passwordHash,
          role: Role.ADMIN,
        },
      });
    });
  } catch (e: any) {
    if (e.message === "SETUP_ALREADY_COMPLETED") {
      return { error: "A setup már lezárult. Kérjük, használja a bejelentkezést." };
    }
    throw e;
  }

  return { success: true };
}

/**
 * Normál felhasználó regisztrálása meghívóval.
 * Replicated from Dub.co's credential flow:
 */
export async function registerUser(formData: FormData) {
  const name = (formData.get("name") as string)?.trim();
  const email = (formData.get("email") as string)?.trim().toLowerCase();
  const password = formData.get("password") as string;
  const token = (formData.get("token") as string)?.trim();

  if (!email || !password || !name || !token) {
    return { error: "Minden mező, beleértve a meghívó kódját is, kötelező!" };
  }

  if (!EMAIL_REGEX.test(email)) {
    return { error: "Kérlek adj meg egy érvényes email címet!" };
  }

  if (name.length > MAX_NAME_LENGTH) {
    return { error: `A név maximum ${MAX_NAME_LENGTH} karakter lehet!` };
  }

  if (password.length < MIN_PASSWORD_LENGTH) {
    return { error: `A jelszónak legalább ${MIN_PASSWORD_LENGTH} karakternek kell lennie.` };
  }

  if (password.length > MAX_PASSWORD_LENGTH) {
    return { error: `A jelszó nem lehet hosszabb, mint ${MAX_PASSWORD_LENGTH} karakter.` };
  }

  // Meghívó ellenőrzése
  const invite = await prisma.invite.findUnique({
    where: { token },
    include: { creator: true },
  });

  if (!invite) {
    return { error: "Érvénytelen meghívó!" };
  }

  if (invite.uses >= invite.maxUses) {
    return { error: "Ezt a meghívót már maximálisan felhasználták!" };
  }

  if (invite.expiresAt && invite.expiresAt < new Date()) {
    return { error: "A meghívó lejárt!" };
  }

  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    return { error: "Ezzel az email címmel nem sikerült fiókot létrehozni." };
  }

  const passwordHash = await hashPassword(password);

  await prisma.$transaction([
    prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        role: Role.USER,
        familyName: invite.creator.familyName, // Családnév másolása a meghívó készítőjétől
      },
    }),
    prisma.invite.update({
      where: { id: invite.id },
      data: { uses: { increment: 1 } },
    }),
  ]);

  return { success: true };
}

export async function createInvite(data: { maxUses?: number, expiresInDays?: number, familyName?: string } = {}) {
  const { maxUses = 1, expiresInDays = 7, familyName } = data;
  const session = await auth();

  if (!session?.user?.id) {
    return { error: "Nincs bejelentkezve!" };
  }

  if (familyName) {
    await prisma.user.update({
      where: { id: session.user.id },
      data: { familyName: familyName.trim() }
    });
  }

  // Kriptográfiailag biztonságos token generálása (48 byte = 64 char hex)
  const token = crypto.randomBytes(32).toString("hex");

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + expiresInDays);

  const invite = await prisma.invite.create({
    data: {
      token,
      maxUses,
      expiresAt,
      creatorId: session.user.id,
    }
  });

  return { success: true, inviteToken: invite.token };
}

/**
 * Onboarding befejezése - elmenti a család nevét, avatart, preferenciákat,
 * és beállítja az onboardingComplete flaget.
 */
export async function completeOnboarding(data: {
  familyName?: string;
  avatar: string;
  preferences: string[];
}) {
  const session = await auth();

  if (!session?.user?.id) {
    return { error: "Nincs bejelentkezve!" };
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { onboardingComplete: true },
  });

  if (user?.onboardingComplete) {
    // Ha az adatbázisban már befejeződött (de a kliens cookie még elavult),
    // ne dobjunk hibát, hanem adjunk vissza sikert, hogy a kliens tovább tudjon lépni.
    return { success: true };
  }

  // Validate avatar
  if (!VALID_AVATAR_IDS.has(data.avatar)) {
    return { error: "Érvénytelen avatar!" };
  }

  // Validate preferences
  if (!Array.isArray(data.preferences) || data.preferences.length > VALID_PREFERENCE_IDS.size) {
    return { error: "Érvénytelen preferenciák!" };
  }
  const invalidPrefs = data.preferences.filter((p) => !VALID_PREFERENCE_IDS.has(p));
  if (invalidPrefs.length > 0) {
    return { error: "Érvénytelen preferencia azonosító!" };
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      onboardingComplete: true,
      image: data.avatar,
      preferences: data.preferences,
      ...(data.familyName ? { familyName: data.familyName } : {}),
    },
  });

  return { success: true };
}
