-- Facturación 3PL: tarifas por cliente (RateCard) y facturas mensuales con líneas.

CREATE TABLE "RateCard" (
    "id" SERIAL NOT NULL,
    "clienteId" INTEGER NOT NULL,
    "cuotaMensual" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "tarifaPedido" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "tarifaRecepcion" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "tarifaUnidadAlmacen" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "iva" DOUBLE PRECISION NOT NULL DEFAULT 21,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "RateCard_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "RateCard_clienteId_key" ON "RateCard"("clienteId");

ALTER TABLE "RateCard" ADD CONSTRAINT "RateCard_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "Factura" (
    "id" SERIAL NOT NULL,
    "clienteId" INTEGER NOT NULL,
    "periodo" TEXT NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'borrador',
    "subtotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "iva" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "total" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Factura_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Factura_clienteId_periodo_key" ON "Factura"("clienteId", "periodo");

ALTER TABLE "Factura" ADD CONSTRAINT "Factura_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "FacturaLinea" (
    "id" SERIAL NOT NULL,
    "facturaId" INTEGER NOT NULL,
    "concepto" TEXT NOT NULL,
    "cantidad" DOUBLE PRECISION NOT NULL,
    "precioUnitario" DOUBLE PRECISION NOT NULL,
    "importe" DOUBLE PRECISION NOT NULL,
    CONSTRAINT "FacturaLinea_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "FacturaLinea" ADD CONSTRAINT "FacturaLinea_facturaId_fkey" FOREIGN KEY ("facturaId") REFERENCES "Factura"("id") ON DELETE CASCADE ON UPDATE CASCADE;
