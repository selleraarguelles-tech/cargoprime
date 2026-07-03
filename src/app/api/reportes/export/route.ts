import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { CANALES, ESTADOS_PEDIDO } from '@/lib/utils'

// Celda CSV segura (separador ; para Excel en español)
function celda(v: unknown): string {
  const s = v == null ? '' : String(v)
  if (/[;"\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}

function fila(vals: unknown[]): string {
  return vals.map(celda).join(';')
}

function fechaES(d: Date | null): string {
  if (!d) return ''
  return new Intl.DateTimeFormat('es-ES', { dateStyle: 'short', timeStyle: 'short', timeZone: 'Europe/Madrid' }).format(d)
}

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const { searchParams } = req.nextUrl
  const tipo = searchParams.get('tipo') ?? 'pedidos'
  const desde = searchParams.get('desde')
  const hasta = searchParams.get('hasta')
  const cliente = searchParams.get('cliente')
  const canal = searchParams.get('canal')

  const rangoFechas: Record<string, Date> = {}
  if (desde) rangoFechas.gte = new Date(`${desde}T00:00:00`)
  if (hasta) rangoFechas.lte = new Date(`${hasta}T23:59:59.999`)

  let csv: string
  let nombre: string

  if (tipo === 'envios') {
    const where: Record<string, unknown> = {}
    if (desde || hasta) where.createdAt = rangoFechas
    if (cliente) where.clienteId = parseInt(cliente)

    const envios = await prisma.envio.findMany({
      where,
      include: { cliente: { select: { nombre: true } } },
      orderBy: { createdAt: 'desc' },
    })

    csv = [
      fila(['Tracking', 'Transportista', 'Cliente', 'Descripción', 'Fecha esperada', 'Estado', 'Último evento', 'Registrado']),
      ...envios.map(e => fila([
        e.trackingNumber, e.transportista, e.cliente.nombre, e.descripcion,
        e.fechaEsperada ? fechaES(e.fechaEsperada) : '', e.estado, e.ultimoEvento, fechaES(e.createdAt),
      ])),
    ].join('\r\n')
    nombre = 'envios'
  } else {
    const where: Record<string, unknown> = {}
    if (desde || hasta) where.createdAt = rangoFechas
    if (cliente) where.clienteId = parseInt(cliente)
    if (canal) where.canal = canal

    const pedidos = await prisma.pedido.findMany({
      where,
      include: { cliente: { select: { nombre: true } }, producto: { select: { nombre: true, sku: true } } },
      orderBy: { createdAt: 'desc' },
    })

    csv = [
      fila(['Nº Pedido', 'Canal', 'Cliente', 'Producto', 'SKU', 'Destinatario', 'Ciudad', 'CP', 'País', 'Fecha', 'Estado', 'Transportista', 'Tracking', 'Estado envío']),
      ...pedidos.map(p => fila([
        p.amazonOrderId,
        CANALES[p.canal]?.label ?? p.canal,
        p.cliente.nombre,
        p.producto.nombre,
        p.producto.sku,
        p.destinatarioNombre,
        p.destinatarioCiudad,
        p.destinatarioCP,
        p.destinatarioPais,
        fechaES(p.createdAt),
        ESTADOS_PEDIDO[p.estado as keyof typeof ESTADOS_PEDIDO]?.label ?? p.estado,
        p.transportista,
        p.trackingNumber,
        p.trackingEstado,
      ])),
    ].join('\r\n')
    nombre = 'pedidos'
  }

  const sufijo = [desde, hasta].filter(Boolean).join('_a_') || 'todo'
  // BOM para que Excel abra el UTF-8 correctamente
  return new NextResponse('﻿' + csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="cargoprime-${nombre}-${sufijo}.csv"`,
    },
  })
}
