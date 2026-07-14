-- Transportista preferido por cliente y canal (CTT Express o Correos Express).
-- Si no hay fila para una combinación, se usa CTT por defecto.
CREATE TABLE "PreferenciaTransportista" (
    "id" SERIAL NOT NULL,
    "clienteId" INTEGER NOT NULL,
    "canal" TEXT NOT NULL,
    "transportista" TEXT NOT NULL,
    CONSTRAINT "PreferenciaTransportista_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PreferenciaTransportista_clienteId_canal_key" ON "PreferenciaTransportista"("clienteId", "canal");

ALTER TABLE "PreferenciaTransportista" ADD CONSTRAINT "PreferenciaTransportista_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE CASCADE ON UPDATE CASCADE;
