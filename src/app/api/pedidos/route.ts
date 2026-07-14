import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'

// Referencia autogenerada para envíos manuales/externos (sin pedido de Amazon)
function generarReferenciaManual(): string {
  const d = new Date()
  const fecha = new Intl.DateTimeFormat('sv', { timeZone: 'Europe/Madrid' }).format(d).replace(/-/g, '')
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase()
  return `MAN-${fecha}-${rand}`
}

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

    if (!clienteId || !destinatarioNombre || !destinatarioDireccion || !destinatarioCP || !destinatarioCiudad) {
      return NextResponse.json({ error: 'Faltan campos obligatorios' }, { status: 400 })
    }

    // Sin nº de pedido = envío manual/externo: referencia autogenerada y canal propio
    const esManual = !amazonOrderId
    const referencia = amazonOrderId || generarReferenciaManual()

    // Sin producto del catálogo: se usa un producto genérico "Envío externo" del cliente
    // (no toca stock)
    let prodId: number
    let descontarStock = false
    if (productoId) {
      prodId = parseInt(productoId)
      descontarStock = true
    } else {
      const generico = await prisma.producto.upsert({
        where: { sku: `EXT-${clienteId}` },
        update: {},
        create: {
          sku: `EXT-${clienteId}`,
          nombre: 'Envío externo',
          clienteId: parseInt(clienteId),
          stockActual: 0,
          stockMinimo: 0,
        },
      })
      prodId = generico.id
    }

    const pedido = await prisma.pedido.create({
      data: {
        amazonOrderId: referencia,
        canal: esManual ? 'manual' : 'amazon',
        clienteId: parseInt(clienteId),
        productoId: prodId,
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

    if (descontarStock) {
      await prisma.movimientoStock.create({
        data: { productoId: prodId, tipo: 'salida', cantidad: 1, nota: `Pedido ${referencia}` },
      })
      await prisma.producto.update({
        where: { id: prodId },
        data: { stockActual: { decrement: 1 } },
      })
    }

    return NextResponse.json(pedido, { status: 201 })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error interno'
    if (message.includes('Unique constraint')) {
      return NextResponse.json({ error: 'Ya existe un pedido con ese número' }, { status: 409 })
    }
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
