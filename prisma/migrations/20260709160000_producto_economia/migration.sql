-- AlterTable: economía por producto para el P&L (rentabilidad por SKU). Aditivo.
ALTER TABLE "Producto" ADD COLUMN     "precioVenta" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "Producto" ADD COLUMN     "costeUnitario" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "Producto" ADD COLUMN     "comisionAmazon" DOUBLE PRECISION NOT NULL DEFAULT 15;
