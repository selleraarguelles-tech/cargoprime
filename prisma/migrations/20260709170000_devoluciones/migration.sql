-- Devoluciones FBM: gestión de devoluciones de clientes con opción de reingreso a stock.

CREATE TABLE "Devolucion" (
    "id" SERIAL NOT NULL,
    "pedidoId" INTEGER NOT NULL,
    "clienteId" INTEGER NOT NULL,
    "motivo" TEXT,
    "estado" TEXT NOT NULL DEFAULT 'solicitada',
    "reingresado" BOOLEAN NOT NULL DEFAULT false,
    "notas" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "recibidaAt" TIMESTAMP(3),
    CONSTRAINT "Devolucion_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Devolucion" ADD CONSTRAINT "Devolucion_pedidoId_fkey" FOREIGN KEY ("pedidoId") REFERENCES "Pedido"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Devolucion" ADD CONSTRAINT "Devolucion_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
