import { prisma } from './prisma'
import { emailConfigurado, sendRetrasoEntranteEmail } from './mail'

const LIMITE_HORAS = 48

/**
 * Avisa al cliente de los envíos entrantes con más de 48h de retraso sobre su
 * fecha esperada y aún sin recibir, para que reclame a su transitario.
 * Un solo aviso por envío (avisoRetrasoAt).
 */
export async function avisarEntrantesRetrasados(): Promise<{ retrasados: number; avisados: number }> {
  const limite = new Date(Date.now() - LIMITE_HORAS * 60 * 60 * 1000)

  const retrasados = await prisma.envio.findMany({
    where: {
      recibidoAt: null,
      avisoRetrasoAt: null,
      fechaEsperada: { not: null, lt: limite },
      estado: { notIn: ['recibido', 'entregado', 'cancelado'] },
    },
    include: { cliente: { select: { nombre: true, email: true } } },
    take: 20,
  })

  if (retrasados.length === 0) return { retrasados: 0, avisados: 0 }
  if (!(await emailConfigurado())) {
    console.warn('[avisosEntrantes] SMTP sin configurar:', retrasados.length, 'entrantes +48h sin avisar')
    return { retrasados: retrasados.length, avisados: 0 }
  }

  let avisados = 0
  for (const envio of retrasados) {
    if (!envio.cliente.email) continue
    try {
      const horas = (Date.now() - envio.fechaEsperada!.getTime()) / 3600000
      await sendRetrasoEntranteEmail(
        envio.cliente.email,
        envio.cliente.nombre,
        envio.id,
        envio.trackingNumber,
        envio.transportista,
        envio.fechaEsperada!,
        horas
      )
      await prisma.envio.update({ where: { id: envio.id }, data: { avisoRetrasoAt: new Date() } })
      avisados++
    } catch (e) {
      console.error('[avisosEntrantes] fallo aviso envío', envio.id, ':', e instanceof Error ? e.message : e)
    }
  }

  return { retrasados: retrasados.length, avisados }
}
