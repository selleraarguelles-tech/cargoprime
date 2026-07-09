import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { generarFactura } from '@/lib/facturacion'

// Genera (o regenera si está en borrador) la factura de un cliente para un periodo 'YYYY-MM'.
export async function POST(req: NextRequest) {
  const session = await auth()
  if (session?.user?.role !== 'admin') return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })

  const body = await req.json().catch(() => null)
  const clienteId = Number(body?.clienteId)
  const periodo = String(body?.periodo ?? '')

  if (!clienteId || !/^\d{4}-\d{2}$/.test(periodo)) {
    return NextResponse.json({ error: 'clienteId y periodo (YYYY-MM) obligatorios' }, { status: 400 })
  }

  try {
    const { id, regenerada } = await generarFactura(clienteId, periodo)
    return NextResponse.json({ ok: true, id, regenerada })
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Error al generar' }, { status: 400 })
  }
}
