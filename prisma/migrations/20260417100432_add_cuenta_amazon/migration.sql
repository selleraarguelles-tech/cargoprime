-- CreateTable
CREATE TABLE "CuentaAmazon" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "nombre" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "marketplaceId" TEXT NOT NULL DEFAULT 'A1RKKUPIHCS9HS',
    "clienteId" INTEGER NOT NULL,
    "refreshToken" TEXT NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CuentaAmazon_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "CuentaAmazon_sellerId_key" ON "CuentaAmazon"("sellerId");
