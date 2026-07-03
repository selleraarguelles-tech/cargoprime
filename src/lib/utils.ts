export type EstadoPedido = 'sin_etiqueta' | 'preparando' | 'enviado'

export const CANALES: Record<string, { label: string; variant: 'default' | 'orange' | 'info' }> = {
  amazon: { label: 'Amazon', variant: 'orange' },
  tiktok: { label: 'TikTok Shop', variant: 'default' },
  shopify: { label: 'Shopify', variant: 'info' },
}

export const ESTADOS_PEDIDO: Record<EstadoPedido, { label: string; variant: 'danger' | 'warning' | 'success' }> = {
  sin_etiqueta: { label: 'Sin etiqueta', variant: 'danger' },
  preparando: { label: 'Preparando', variant: 'warning' },
  enviado: { label: 'Enviado', variant: 'success' },
}

export const ESTADOS_TRACKING: Record<string, { label: string; variant: 'danger' | 'warning' | 'success' | 'default' }> = {
  // Amazon Orders API (includedData=PACKAGES)
  SHIPPED: { label: 'Enviado', variant: 'success' },
  IN_TRANSIT: { label: 'En tránsito', variant: 'warning' },
  OUT_FOR_DELIVERY: { label: 'En reparto', variant: 'warning' },
  DELIVERED: { label: 'Entregado', variant: 'success' },
  UNDELIVERABLE: { label: 'No entregable', variant: 'danger' },
  RETURNING: { label: 'En devolución', variant: 'danger' },
  RETURNED: { label: 'Devuelto', variant: 'danger' },
  // CTT Express (Get Shipping Tracking API)
  'Manifestado o grabado': { label: 'Manifestado', variant: 'default' },
  'Envío recogido': { label: 'Recogido', variant: 'warning' },
  'En tránsito': { label: 'En tránsito', variant: 'warning' },
  'En reparto': { label: 'En reparto', variant: 'warning' },
  'Entregado': { label: 'Entregado', variant: 'success' },
  'Entregado almacén regulador': { label: 'Entregado', variant: 'success' },
  'Entrega parcial': { label: 'Entrega parcial', variant: 'warning' },
  'Reparto fallido': { label: 'Reparto fallido', variant: 'danger' },
  'Recogida fallida': { label: 'Recogida fallida', variant: 'danger' },
  'Recogida anulada': { label: 'Recogida anulada', variant: 'danger' },
  'Envío anulado': { label: 'Envío anulado', variant: 'danger' },
  'Devolución': { label: 'Devolución', variant: 'danger' },
  'Mal transitado': { label: 'Incidencia en tránsito', variant: 'danger' },
}

export function formatDate(date: string | Date) {
  return new Date(date).toLocaleDateString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

export function formatDateTime(date: string | Date) {
  return new Date(date).toLocaleString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}
