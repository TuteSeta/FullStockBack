-- AlterTable
ALTER TABLE "Articulo" ADD COLUMN     "codProveedorPredeterminado" INTEGER;

-- AddForeignKey
ALTER TABLE "Articulo" ADD CONSTRAINT "Articulo_codProveedorPredeterminado_fkey" FOREIGN KEY ("codProveedorPredeterminado") REFERENCES "Proveedor"("codProveedor") ON DELETE SET NULL ON UPDATE CASCADE;
