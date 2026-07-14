-- Aviso de retraso de envíos entrantes: marca cuándo se avisó al cliente
-- (+48h sobre la fecha esperada sin recibir) para no repetir el email.
ALTER TABLE "Envio" ADD COLUMN     "avisoRetrasoAt" TIMESTAMP(3);
