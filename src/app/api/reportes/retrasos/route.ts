import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { ESTADOS_TRACKING } from '@/lib/utils'

const LIMITE_HORAS = 36
const CERRADOS = new Set([
  'Entregado', 'Entregado almacén regulador', 'DELIVERED',
  'Devolución', 'Reexpedición', 'Envío anulado', 'RETURNED', 'No encontrado en CTT',
])

function celda(v: unknown): string {
  const s = v == null ? '' : String(v)
  return /[;"\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}
const fila = (v: unknown[]) => v.map(celda).join(';')
const fechaES = (d: Date) => new Intl.DateTimeFormat('es-ES', { dateStyle: 'short', timeStyle: 'short', timeZone: 'Europe/Madrid' }).format(d)

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const cliente = req.nextUrl.searchParams.get('cliente')

  const where: Record<string, unknown> = {
    trackingNumber: { not: null },
    transportista: { in: ['CTT Express', 'CTTExpress'] },
    OR: [{ trackingEstado: null }, { trackingEstado: { notIn: [...CERRADOS] } }],
  }
  if (cliente) where.clienteId = parseInt(cliente)

  const pedidos = await prisma.pedido.findMany({
    where,
    include: { cliente: { select: { nombre: true } } },
    orderBy: { enviadoAt: 'asc' },
  })

  const ahora = Date.now()
  const limiteMs = ahora - LIMITE_HORAS * 3600000

  const retrasados = pedidos
    .map(p => {
      const base = (p.enviadoAt ?? p.createdAt).getTime()
      const horas = Math.floor((ahora - base) / 3600000)
      return { p, base, horas }
    })
    .filter(x => x.base < limiteMs)

  const filas = [
    fila(['Nº de envío CTT', 'Referencia pedido', 'Cliente', 'Destino', 'CP', 'Fecha expedición', 'Último estado', 'Horas desde expedición', 'Horas de más (sobre 36h)']),
    ...retrasados.map(({ p, horas }) => fila([
      p.trackingNumber,
      p.amazonOrderId,
      p.cliente.nombre,
      p.destinatarioCiudad,
      p.destinatarioCP,
      fechaES(p.enviadoAt ?? p.createdAt),
      p.trackingEstado ? (ESTADOS_TRACKING[p.trackingEstado]?.label ?? p.trackingEstado) : 'Sin datos',
      horas,
      Math.max(0, horas - LIMITE_HORAS),
    ])),
  ]

  const fecha = new Intl.DateTimeFormat('sv', { timeZone: 'Europe/Madrid' }).format(new Date())
  const csv = '﻿' + filas.join('\r\n')
  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="cargoprime-retrasos-ctt-${fecha}.csv"`,
    },
  })
}
