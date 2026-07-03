import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })

export const metadata: Metadata = {
  title: 'CargoPrime · Gestión de almacén',
  description: 'Plataforma de fulfillment y gestión logística de CargoPrime',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`h-full ${inter.variable}`}>
      <body className={`${inter.className} h-full antialiased`}>
        {children}
      </body>
    </html>
  )
}
