-- AlterTable: cantidad e importe reales del pedido (para P&L con ingresos reales
-- y reingreso de stock correcto en devoluciones). Aditivo: los pedidos antiguos
-- quedan con cantidad=1 e importe NULL (el P&L usa el precio configurado como fallback).
ALTER TABLE "Pedido" ADD COLUMN     "cantidad" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "Pedido" ADD COLUMN     "importe" DOUBLE PRECISION;
ALTER TABLE "Pedido" ADD COLUMN     "moneda" TEXT;
