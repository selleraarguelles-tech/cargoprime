import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

interface Params { params: Promise<{ id: string }> }

// Añade (o actualiza) una línea SKU esperado al envío entrante.
export async function POST(req: NextRequest, { params }: Params) {
  const session = await auth()
  if (session?.user?.role !== 'admin') return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })

  const { id } = await params
  const envioId = parseInt(id)
  const { productoId, cantidadEsperada } = await req.json().catch(() => ({}))

  const cantidad = parseInt(String(cantidadEsperada))
  if (!productoId || !Number.isFinite(cantidad) || cantidad <= 0) {
    return NextResponse.json({ error: 'Producto y cantidad esperada (>0) obligatorios' }, { status: 400 })
  }

  const envio = await prisma.envio.findUnique({ where: { id: envioId }, select: { clienteId: true, recibidoAt: true } })
  if (!envio) return NextResponse.json({ error: 'Envío no encontrado' }, { status: 404 })
  if (envio.recibidoAt) return NextResponse.json({ error: 'El envío ya está recibido; no se pueden añadir líneas' }, { status: 400 })

  // El producto debe ser del mismo cliente que el envío
  const producto = await prisma.producto.findUnique({ where: { id: parseInt(String(productoId)) }, select: { clienteId: true } })
  if (!producto || producto.clienteId !== envio.clienteId) {
    return NextResponse.json({ error: 'El producto no pertenece al cliente de este envío' }, { status: 400 })
  }

  const linea = await prisma.envioLinea.upsert({
    where: { envioId_productoId: { envioId, productoId: parseInt(String(productoId)) } },
    update: { cantidadEsperada: cantidad },
    create: { envioId, productoId: parseInt(String(productoId)), cantidadEsperada: cantidad },
  })

  return NextResponse.json(linea, { status: 201 })
}

// Elimina una línea (query ?lineaId=)
export async function DELETE(req: NextRequest, { params }: Params) {
  const session = await auth()
  if (session?.user?.role !== 'admin') return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })

  const { id } = await params
  const lineaId = parseInt(req.nextUrl.searchParams.get('lineaId') ?? '')
  if (!lineaId) return NextResponse.json({ error: 'Falta lineaId' }, { status: 400 })

  const linea = await prisma.envioLinea.findUnique({ where: { id: lineaId }, include: { envio: { select: { id: true, recibidoAt: true } } } })
  if (!linea || linea.envio.id !== parseInt(id)) return NextResponse.json({ error: 'Línea no encontrada' }, { status: 404 })
  if (linea.envio.recibidoAt) return NextResponse.json({ error: 'El envío ya está recibido' }, { status: 400 })

  await prisma.envioLinea.delete({ where: { id: lineaId } })
  return NextResponse.json({ ok: true })
}
