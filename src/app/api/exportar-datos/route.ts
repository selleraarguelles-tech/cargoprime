import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

// Exportacion completa de la base de datos, para llevarse los datos al
// servidor nuevo. Temporal: en cuanto termine la mudanza se quita este fichero.
//
// Solo administradores. El resultado se descarga como fichero, no se muestra.

export const dynamic = 'force-dynamic'
export const maxDuration = 300

// El orden importa: al importar, cada tabla necesita que ya existan aquellas a
// las que hace referencia (un pedido necesita su cliente y su producto).
const TABLAS = [
  'Cliente',
  'User',
  'Producto',
  'RateCard',
  'PreferenciaTransportista',
  'CuentaAmazon',
  'CuentaTikTok',
  'CuentaShopify',
  'Envio',
  'EnvioLinea',
  'Pedido',
  'Devolucion',
  'Factura',
  'FacturaLinea',
  'MovimientoStock',
  'Configuracion',
  'Notificacion',
] as const

type Tabla = (typeof TABLAS)[number]

// Cada tabla con el metodo de Prisma que la lee.
const lectores: Record<Tabla, () => Promise<unknown[]>> = {
  Cliente: () => prisma.cliente.findMany(),
  User: () => prisma.user.findMany(),
  Producto: () => prisma.producto.findMany(),
  RateCard: () => prisma.rateCard.findMany(),
  PreferenciaTransportista: () => prisma.preferenciaTransportista.findMany(),
  CuentaAmazon: () => prisma.cuentaAmazon.findMany(),
  CuentaTikTok: () => prisma.cuentaTikTok.findMany(),
  CuentaShopify: () => prisma.cuentaShopify.findMany(),
  Envio: () => prisma.envio.findMany(),
  EnvioLinea: () => prisma.envioLinea.findMany(),
  Pedido: () => prisma.pedido.findMany(),
  Devolucion: () => prisma.devolucion.findMany(),
  Factura: () => prisma.factura.findMany(),
  FacturaLinea: () => prisma.facturaLinea.findMany(),
  MovimientoStock: () => prisma.movimientoStock.findMany(),
  Configuracion: () => prisma.configuracion.findMany(),
  Notificacion: () => prisma.notificacion.findMany(),
}

export async function GET(req: NextRequest) {
  const session = await auth()
  if (session?.user?.role !== 'admin') {
    return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
  }

  // ?resumen=1 solo cuenta filas, para comprobar que luego llega todo.
  if (req.nextUrl.searchParams.get('resumen')) {
    const conteo: Record<string, number> = {}
    for (const tabla of TABLAS) {
      conteo[tabla] = (await lectores[tabla]()).length
    }
    return NextResponse.json({ tablas: conteo })
  }

  // ?tabla=Pedido descarga una sola tabla, por si el volcado entero es
  // demasiado grande para una sola respuesta.
  const soloUna = req.nextUrl.searchParams.get('tabla') as Tabla | null
  const aExportar = soloUna ? [soloUna] : TABLAS

  if (soloUna && !TABLAS.includes(soloUna)) {
    return NextResponse.json({ error: 'Tabla desconocida' }, { status: 400 })
  }

  const datos: Record<string, unknown[]> = {}
  for (const tabla of aExportar) {
    datos[tabla] = await lectores[tabla]()
  }

  const cuerpo = JSON.stringify(
    { exportadoEl: new Date().toISOString(), orden: aExportar, datos },
    null,
    2
  )

  const nombre = soloUna
    ? `cargoprime-${soloUna}.json`
    : `cargoprime-datos-${new Date().toISOString().slice(0, 10)}.json`

  return new NextResponse(cuerpo, {
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'content-disposition': `attachment; filename="${nombre}"`,
      'cache-control': 'no-store',
    },
  })
}
