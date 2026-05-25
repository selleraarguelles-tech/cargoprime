import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  if (session.user?.role !== 'admin') return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })

  try {
    const { nombre, email, telefono } = await req.json()
    if (!nombre || !email) {
      return NextResponse.json({ error: 'Nombre y email son obligatorios' }, { status: 400 })
    }
    const cliente = await prisma.cliente.create({
      data: { nombre, email, telefono: telefono || null },
    })
    return NextResponse.json(cliente, { status: 201 })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error interno'
    if (message.includes('Unique constraint')) {
      return NextResponse.json({ error: 'Ya existe un cliente con ese email' }, { status: 409 })
    }
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
