-- AlterTable: fecha real de entrega (para la métrica de entrega en plazo)
-- y fecha de reclamación a CTT (para no reclamar dos veces el mismo envío)
ALTER TABLE "Pedido" ADD COLUMN     "entregadoAt" TIMESTAMP(3);
ALTER TABLE "Pedido" ADD COLUMN     "cttReclamadoAt" TIMESTAMP(3);
