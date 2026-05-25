-- CreateTable
CREATE TABLE "Envio" (
    "id" SERIAL NOT NULL,
    "clienteId" INTEGER NOT NULL,
    "transportista" TEXT NOT NULL,
    "trackingNumber" TEXT NOT NULL,
    "descripcion" TEXT,
    "fechaEsperada" TIMESTAMP(3),
    "estado" TEXT NOT NULL DEFAULT 'en_transito',
    "ultimoEvento" TEXT,
    "ultimaRevision" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Envio_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Envio" ADD CONSTRAINT "Envio_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
