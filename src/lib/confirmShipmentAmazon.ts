import { prisma } from '@/lib/prisma'
import { createFeedDocument, uploadFeedContent, createFeed } from '@/lib/spapi'

// Solo confirmamos envíos recientes: pasada esta ventana no aporta al Valid Tracking Rate
// y evitamos reenviar histórico antiguo.
const VENTANA_DIAS = 14
// Un feed por lote (Amazon admite muchos mensajes por envelope; limitamos por seguridad).
const LOTE = 100
const FEED_CONTENT_TYPE = 'text/xml; charset=UTF-8'

function xmlEscape(s: string): string {
  return s.replace(/[<>&'"]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' }[c] as string))
}

interface PedidoConfirmable {
  amazonOrderId: string
  transportista: string | null
  trackingNumber: string | null
  enviadoAt: Date | null
}

/** Construye el envelope XML OrderFulfillment con un mensaje por pedido. */
function buildFulfillmentXml(sellerId: string, pedidos: PedidoConfirmable[]): string {
  const mensajes = pedidos.map((p, i) => `
  <Message>
    <MessageID>${i + 1}</MessageID>
    <OrderFulfillment>
      <AmazonOrderID>${xmlEscape(p.amazonOrderId)}</AmazonOrderID>
      <FulfillmentDate>${(p.enviadoAt ?? new Date()).toISOString()}</FulfillmentDate>
      <FulfillmentData>
        <CarrierName>${xmlEscape(p.transportista ?? 'CTT Express')}</CarrierName>
        <ShippingMethod>Standard</ShippingMethod>
        <ShipperTrackingNumber>${xmlEscape(p.trackingNumber ?? '')}</ShipperTrackingNumber>
      </FulfillmentData>
    </OrderFulfillment>
  </Message>`).join('')

  return `<?xml version="1.0" encoding="UTF-8"?>
<AmazonEnvelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:noNamespaceSchemaLocation="amzn-envelope.xsd">
  <Header>
    <DocumentVersion>1.01</DocumentVersion>
    <MerchantIdentifier>${xmlEscape(sellerId)}</MerchantIdentifier>
  </Header>
  <MessageType>OrderFulfillment</MessageType>${mensajes}
</AmazonEnvelope>`
}

interface CuentaConfirm {
  clienteId: number
  sellerId: string
  marketplaceId: string
  isSandbox: boolean
}

/**
 * Sube a Amazon el tracking (de CTT) de los pedidos ya enviados de esta cuenta que
 * todavía no se han confirmado. Protege el Valid Tracking Rate del seller.
 * Marca amazonConfirmadoAt al enviar el feed (idempotente: no se reenvían).
 */
export async function confirmShipmentsForCuenta(
  accessToken: string,
  cuenta: CuentaConfirm
): Promise<{ confirmados: number; feedId?: string }> {
  if (cuenta.isSandbox) return { confirmados: 0 }

  const desde = new Date(Date.now() - VENTANA_DIAS * 24 * 60 * 60 * 1000)

  const pendientes = await prisma.pedido.findMany({
    where: {
      clienteId: cuenta.clienteId,
      canal: 'amazon',
      estado: 'enviado',
      trackingNumber: { not: null },
      enviadoAt: { not: null, gte: desde },
      amazonConfirmadoAt: null,
    },
    orderBy: { enviadoAt: 'asc' },
    take: LOTE,
    select: { id: true, amazonOrderId: true, transportista: true, trackingNumber: true, enviadoAt: true },
  })

  if (pendientes.length === 0) return { confirmados: 0 }

  const xml = buildFulfillmentXml(cuenta.sellerId, pendientes)

  const { feedDocumentId, url } = await createFeedDocument(accessToken, cuenta.marketplaceId, FEED_CONTENT_TYPE, cuenta.isSandbox)
  await uploadFeedContent(url, xml, FEED_CONTENT_TYPE)
  const feedId = await createFeed(accessToken, cuenta.marketplaceId, 'POST_ORDER_FULFILLMENT_DATA', feedDocumentId, cuenta.isSandbox)

  await prisma.pedido.updateMany({
    where: { id: { in: pendientes.map(p => p.id) } },
    data: { amazonConfirmadoAt: new Date(), amazonFeedId: feedId },
  })

  return { confirmados: pendientes.length, feedId }
}
