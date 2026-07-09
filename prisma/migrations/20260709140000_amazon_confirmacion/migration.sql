-- AlterTable: confirmación de despacho a Amazon (subir tracking CTT vía Feeds API).
-- Aditivo: marca cuándo se confirmó el envío a Amazon y el id del feed enviado.
ALTER TABLE "Pedido" ADD COLUMN     "amazonConfirmadoAt" TIMESTAMP(3);
ALTER TABLE "Pedido" ADD COLUMN     "amazonFeedId" TEXT;
