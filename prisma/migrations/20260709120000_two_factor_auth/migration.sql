-- AlterTable: soporte de 2FA (TOTP) por usuario. Aditivo y seguro:
-- el secreto es opcional y el 2FA arranca desactivado, así ningún usuario existente queda bloqueado.
ALTER TABLE "User" ADD COLUMN     "twoFactorSecret" TEXT;
ALTER TABLE "User" ADD COLUMN     "twoFactorEnabled" BOOLEAN NOT NULL DEFAULT false;
