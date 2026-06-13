// NextAuth configuration - credential auth logic replicated from
// Dub.co's apps/web/lib/auth/options.ts (CredentialsProvider, lines 225-319)

import NextAuth from "next-auth"
import { PrismaAdapter } from "@auth/prisma-adapter"
import CredentialsProvider from "next-auth/providers/credentials"
import { prisma } from "@/lib/prisma"
import { validatePassword } from "@/lib/auth/password"
import {
  exceededLoginAttemptsThreshold,
  incrementLoginAttempts,
} from "@/lib/auth/lock-account"

import { authConfig } from "./auth.config"

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(prisma),
  providers: [
    // Sign in with email and password
    // Replicated from Dub.co options.ts lines 226-319
    CredentialsProvider({
      id: "credentials",
      name: "Scoop",
      type: "credentials",
      credentials: {
        email: { type: "email" },
        password: { type: "password" },
      },
      async authorize(credentials) {
        if (!credentials) {
          throw new Error("no-credentials");
        }

        const { email, password } = credentials as Record<string, string>;

        if (!email || !password) {
          throw new Error("no-credentials");
        }

        const user = await prisma.user.findUnique({
          where: { email },
          select: {
            id: true,
            passwordHash: true,
            name: true,
            email: true,
            image: true,
            role: true,
            onboardingComplete: true,
            invalidLoginAttempts: true,
            lockedAt: true,
          },
        });

        if (!user || !user.passwordHash) {
          throw new Error("invalid-credentials");
        }

        // Check lockedAt - identical to Dub.co signIn callback (line 378)
        if (user.lockedAt) {
          throw new Error("exceeded-login-attempts");
        }

        if (exceededLoginAttemptsThreshold(user)) {
          throw new Error("exceeded-login-attempts");
        }

        const passwordMatch = await validatePassword({
          password,
          passwordHash: user.passwordHash,
        });

        if (!passwordMatch) {
          const exceededLoginAttempts = exceededLoginAttemptsThreshold(
            await incrementLoginAttempts(user),
          );

          if (exceededLoginAttempts) {
            throw new Error("exceeded-login-attempts");
          } else {
            throw new Error("invalid-credentials");
          }
        }

        // Reset invalid login attempts on successful login
        await prisma.user.update({
          where: { id: user.id },
          data: {
            invalidLoginAttempts: 0,
          },
        });

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image,
          role: user.role,
          onboardingComplete: user.onboardingComplete,
        };
      },
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,
    jwt: async (params) => {
      const { token, trigger, session } = params;

      // Run edge-compatible jwt logic first
      const baseToken = await authConfig.callbacks!.jwt!(params) || token;

      // Server-only DB lookup when updating session without optimistic data
      if (trigger === "update" && !session) {
        const refreshedUser = await prisma.user.findUnique({
          where: {
            id: token.sub!,
          },
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            role: true,
            onboardingComplete: true,
          },
        });

        if (refreshedUser) {
          baseToken.user = refreshedUser;
        } else {
          return {};
        }
      }

      return baseToken;
    },
    session: async ({ session, token }) => {
      if (token.sub) {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.sub },
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            role: true,
            onboardingComplete: true,
            familyName: true,
          },
        });

        if (!dbUser) {
          // User was deleted from the DB
          return null as any;
        }

        session.user = {
          id: dbUser.id,
          name: dbUser.name,
          email: dbUser.email,
          image: dbUser.image,
          role: dbUser.role,
          onboardingComplete: dbUser.onboardingComplete,
          familyName: dbUser.familyName,
        } as any;
      }
      return session;
    },
  },
})
