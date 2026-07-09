import { DefaultSession } from 'next-auth'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      role: string
      username: string
      clienteId: number | null
    } & DefaultSession['user']
  }
  interface User {
    role: string
    username: string
    clienteId: number | null
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    role: string
    username: string
    id: string
    clienteId: number | null
  }
}
