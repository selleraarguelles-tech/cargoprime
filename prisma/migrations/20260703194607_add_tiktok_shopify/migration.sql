-- AlterTable
ALTER TABLE "Pedido" ADD COLUMN     "canal" TEXT NOT NULL DEFAULT 'amazon';

-- CreateTable
CREATE TABLE "CuentaTikTok" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "shopCipher" TEXT,
    "clienteId" INTEGER NOT NULL,
    "accessToken" TEXT NOT NULL,
    "refreshToken" TEXT NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CuentaTikTok_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CuentaShopify" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "shopDomain" TEXT NOT NULL,
    "clienteId" INTEGER NOT NULL,
    "accessToken" TEXT NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CuentaShopify_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CuentaTikTok_shopId_key" ON "CuentaTikTok"("shopId");

-- CreateIndex
CREATE UNIQUE INDEX "CuentaShopify_shopDomain_key" ON "CuentaShopify"("shopDomain");

-- AddForeignKey
ALTER TABLE "CuentaTikTok" ADD CONSTRAINT "CuentaTikTok_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CuentaShopify" ADD CONSTRAINT "CuentaShopify_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
