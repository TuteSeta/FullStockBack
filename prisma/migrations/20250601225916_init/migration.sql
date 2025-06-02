-- DropForeignKey
ALTER TABLE "DetalleVenta" DROP CONSTRAINT "DetalleVenta_nroVenta_fkey";

-- AddForeignKey
ALTER TABLE "DetalleVenta" ADD CONSTRAINT "DetalleVenta_nroVenta_fkey" FOREIGN KEY ("nroVenta") REFERENCES "Ventas"("nroVenta") ON DELETE CASCADE ON UPDATE CASCADE;
