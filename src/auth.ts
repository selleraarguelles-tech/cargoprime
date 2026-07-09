import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { verificarCodigo } from '@/lib/twofa'
import { authConfig } from './auth.config'

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Contraseña', type: 'password' },
        code: { label: 'Código 2FA', type: 'text' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null

        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string },
        })

        if (!user || !user.activo) return null

        const valid = await bcrypt.compare(credentials.password as string, user.password)
        if (!valid) return null

        // Si el usuario tiene 2FA activado, exigir un código TOTP válido.
        if (user.twoFactorEnabled && user.twoFactorSecret) {
          const code = (credentials.code as string | undefined)?.trim()
          if (!code || !verificarCodigo(code, user.twoFactorSecret)) return null
        }

        return {
          id: String(user.id),
          name: user.nombre,
          email: user.email,
          role: user.rol,
          username: user.username,
          clienteId: user.clienteId ?? null,
        }
      },
    }),
  ],
})
