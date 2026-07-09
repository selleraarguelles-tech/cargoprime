-- AlterTable: enlazar usuarios de tipo "seller" a su Cliente (portal multi-tenant).
-- Aditivo y seguro: columna opcional. Los usuarios staff (admin/readonly) quedan con clienteId NULL.
ALTER TABLE "User" ADD COLUMN     "clienteId" INTEGER;

-- FK hacia Cliente. Si se borra el Cliente, el usuario queda sin enlazar (SET NULL) en vez de romper.
ALTER TABLE "User" ADD CONSTRAINT "User_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE SET NULL ON UPDATE CASCADE;
