-- DropForeignKey
ALTER TABLE "Articulo" DROP CONSTRAINT "Articulo_modeloInventarioIntervaloFijoCod_fkey";

-- DropForeignKey
ALTER TABLE "Articulo" DROP CONSTRAINT "Articulo_modeloInventarioLoteFijoCod_fkey";

-- AddForeignKey
ALTER TABLE "Articulo" ADD CONSTRAINT "Articulo_modeloInventarioIntervaloFijoCod_fkey" FOREIGN KEY ("modeloInventarioIntervaloFijoCod") REFERENCES "ModeloInventarioIntervaloFijo"("modeloInventarioIntervaloFijoCod") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Articulo" ADD CONSTRAINT "Articulo_modeloInventarioLoteFijoCod_fkey" FOREIGN KEY ("modeloInventarioLoteFijoCod") REFERENCES "ModeloInventarioLoteFijo"("modeloInventarioLoteFijoCod") ON DELETE CASCADE ON UPDATE CASCADE;
