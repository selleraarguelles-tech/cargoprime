export type EstadoPedido = 'sin_etiqueta' | 'preparando' | 'enviado'

export const ESTADOS_PEDIDO: Record<EstadoPedido, { label: string; variant: 'danger' | 'warning' | 'success' }> = {
  sin_etiqueta: { label: 'Sin etiqueta', variant: 'danger' },
  preparando: { label: 'Preparando', variant: 'warning' },
  enviado: { label: 'Enviado', variant: 'success' },
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
