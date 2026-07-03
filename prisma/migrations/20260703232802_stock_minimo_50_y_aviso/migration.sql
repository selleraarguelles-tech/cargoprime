-- AlterTable: nuevo campo para no repetir el aviso de stock bajo
ALTER TABLE "Producto" ADD COLUMN     "notificadoStockBajo" BOOLEAN NOT NULL DEFAULT false;

-- Cambiar el valor por defecto del stock mínimo a 50
ALTER TABLE "Producto" ALTER COLUMN "stockMinimo" SET DEFAULT 50;

-- Fijar el stock mínimo de todos los productos existentes en 50 unidades
UPDATE "Producto" SET "stockMinimo" = 50;
