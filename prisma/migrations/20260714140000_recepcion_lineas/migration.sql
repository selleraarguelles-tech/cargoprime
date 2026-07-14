-- Recepción de mercancía con líneas: SKU esperado vs recibido por envío entrante.
ALTER TABLE "Envio" ADD COLUMN     "recibidoAt" TIMESTAMP(3);

CREATE TABLE "EnvioLinea" (
    "id" SERIAL NOT NULL,
    "envioId" INTEGER NOT NULL,
    "productoId" INTEGER NOT NULL,
    "cantidadEsperada" INTEGER NOT NULL,
    "cantidadRecibida" INTEGER,
    CONSTRAINT "EnvioLinea_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "EnvioLinea_envioId_productoId_key" ON "EnvioLinea"("envioId", "productoId");

ALTER TABLE "EnvioLinea" ADD CONSTRAINT "EnvioLinea_envioId_fkey" FOREIGN KEY ("envioId") REFERENCES "Envio"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EnvioLinea" ADD CONSTRAINT "EnvioLinea_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "Producto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
