import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";

export function isValidApiKey(request: Request): boolean {
  const apiKey = request.headers.get("X-API-Key")?.trim();
  const expected = process.env.SERVICE_API_KEY?.trim();
  return !!apiKey && !!expected && apiKey === expected;
}

/**
 * Resolve the acting user id for audit attribution.
 * - Interactive (next-auth) callers: the logged-in user.
 * - Service-key callers (e.g. the Hermes CRM bot): the user named by the
 *   `X-Actor-Email` header, so writes are attributed to the real person who
 *   issued the request rather than 500-ing on a missing session.
 * Returns null when no actor can be resolved (caller should reject the write).
 */
export async function resolveActorUserId(
  request: Request,
  session: { user?: { id?: string } } | null
): Promise<string | null> {
  if (session?.user?.id) return session.user.id;
  if (isValidApiKey(request)) {
    const email = request.headers.get("X-Actor-Email");
    if (email) {
      const user = await prisma.user.findUnique({ where: { email } });
      if (user) return user.id;
    }
  }
  return null;
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
          if (!credentials?.email || !credentials?.password) {
            return null;
          }

          const user = await prisma.user.findUnique({
            where: { email: credentials.email },
          });

          if (!user) {
            return null;
          }

          const isPasswordValid = await bcrypt.compare(
            credentials.password,
            user.passwordHash
          );

          if (!isPasswordValid) {
            return null;
          }

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            isAdmin: user.isAdmin,
          };
        } catch {
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
