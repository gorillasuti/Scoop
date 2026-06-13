import type { NextAuthConfig } from "next-auth"

export const authConfig = {
  trustHost: true,
  providers: [], // Added in auth.ts
  session: {
    strategy: "jwt",
    maxAge: 10 * 365 * 24 * 60 * 60, // 10 years ("remember forever")
  },
  cookies: {
    sessionToken: {
      name: "next-auth.session-token",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
    },
    csrfToken: {
      name: "next-auth.csrf-token",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  callbacks: {
    signIn: async ({ user }) => {
      // Block locked accounts
      if ((user as any)?.lockedAt) {
        return false;
      }
      return true;
    },
    jwt: async ({ token, user, trigger, session }) => {
      if (user) {
        token.user = user;
      }

      // Refresh user data if they update their profile
      if (trigger === "update" && session) {
        // Optimistic update from client
        token.user = { ...(token.user as any), ...session };
      }

      return token;
    },
    session: async ({ session, token }) => {
      session.user = {
        id: token.sub!,
        ...(token as any).user,
      } as any;
      return session;
    },
  },
} satisfies NextAuthConfig
