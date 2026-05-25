import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  if (session.user?.role !== 'admin') return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })

  try {
    const body = await req.json()
    const {
      amazonOrderId, clienteId, productoId,
      destinatarioNombre, destinatarioDireccion, destinatarioCP,
      destinatarioCiudad, destinatarioPais, peso, transportista, trackingNumber,
    } = body

    if (!amazonOrderId || !clienteId || !productoId || !destinatarioNombre || !destinatarioDireccion || !destinatarioCP || !destinatarioCiudad) {
      return NextResponse.json({ error: 'Faltan campos obligatorios' }, { status: 400 })
    }

    const pedido = await prisma.pedido.create({
      data: {
        amazonOrderId,
        clienteId: parseInt(clienteId),
        productoId: parseInt(productoId),
        destinatarioNombre,
        destinatarioDireccion,
        destinatarioCP,
        destinatarioCiudad,
        destinatarioPais: destinatarioPais || 'España',
        peso: peso ? parseFloat(peso) : null,
        transportista: transportista || null,
        trackingNumber: trackingNumber || null,
      },
    })

    await prisma.movimientoStock.create({
      data: { productoId: parseInt(productoId), tipo: 'salida', cantidad: 1, nota: `Pedido Amazon ${amazonOrderId}` },
    })
    await prisma.producto.update({
      where: { id: parseInt(productoId) },
      data: { stockActual: { decrement: 1 } },
    })

    return NextResponse.json(pedido, { status: 201 })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error interno'
    if (message.includes('Unique constraint')) {
      return NextResponse.json({ error: 'Ya existe un pedido con ese número de Amazon' }, { status: 409 })
    }
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
