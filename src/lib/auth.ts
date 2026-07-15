import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";

export function isValidApiKey(request: Request): boolean {
  const apiKey = request.headers.get("X-API-Key");
  return !!apiKey && apiKey === process.env.SERVICE_API_KEY;
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        try {
          const rawEmail = credentials?.email?.trim();
          const email = rawEmail?.toLowerCase();
          const password = credentials?.password;

          if (!email || !password) {
            return null;
          }

          const user = await prisma.user.findFirst({
            where: { email: { equals: email, mode: "insensitive" } },
          });

          if (!user) {
            return null;
          }

          const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

          if (!isPasswordValid) {
            return null;
          }

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            isAdmin: user.isAdmin,
          };
        } catch (error) {
          if (process.env.VERCEL_ENV === "preview") {
            const err = error as { code?: string; message?: string; meta?: unknown };
            console.error("[auth][authorize] database/auth error", {
              code: err?.code || null,
              reason: err?.message || "unknown_error",
              meta: err?.meta || null,
            });
          }
          return null;
        }
      },
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60,
  },
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.isAdmin = (user as { isAdmin?: boolean }).isAdmin ?? false;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.isAdmin = token.isAdmin as boolean;
      }
      return session;
    },
  },
};

declare module "next-auth" {
  interface User {
    id: string;
    isAdmin?: boolean;
  }
  interface Session {
    user: {
      id: string;
      email?: string | null;
      name?: string | null;
      isAdmin: boolean;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    isAdmin: boolean;
  }
}
