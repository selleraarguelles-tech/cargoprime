-- AlterTable: fecha real de expedición del pedido (para el control de +36h sin entregar)
ALTER TABLE "Pedido" ADD COLUMN     "enviadoAt" TIMESTAMP(3);

-- Backfill: para los pedidos ya enviados se aproxima con la fecha del pedido
UPDATE "Pedido" SET "enviadoAt" = "createdAt" WHERE "estado" = 'enviado';
