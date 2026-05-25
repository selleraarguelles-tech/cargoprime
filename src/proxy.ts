import NextAuth from 'next-auth'
import { authConfig } from './auth.config'

const { auth } = NextAuth(authConfig)

export default auth((req) => {
  const { pathname } = req.nextUrl
  const isAuth = !!req.auth

  const publicPaths = ['/login', '/recuperar-password']
  const isPublic = publicPaths.some(p => pathname.startsWith(p))

  if (!isAuth && !isPublic) {
    return Response.redirect(new URL('/login', req.url))
  }

  if (isAuth && isPublic) {
    return Response.redirect(new URL('/', req.url))
  }
})

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}
