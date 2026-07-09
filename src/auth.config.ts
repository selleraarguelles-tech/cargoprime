import type { NextAuthConfig } from 'next-auth'

export const authConfig = {
  trustHost: true,
  secret: process.env.AUTH_SECRET,
  session: { strategy: 'jwt' as const },
  pages: { signIn: '/login' },
  providers: [],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.role = (user as { role: string }).role
        token.username = (user as { username: string }).username
        token.id = user.id as string
        token.clienteId = (user as { clienteId: number | null }).clienteId ?? null
      }
      return token
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        session.user.role = token.role as string
        session.user.username = token.username as string
        session.user.clienteId = (token.clienteId as number | null) ?? null
      }
      return session
    },
  },
} satisfies NextAuthConfig
