/*
  Warnings:

  - You are about to drop the column `nroVenta` on the `Articulo` table. All the data in the column will be lost.
  - Added the required column `codArticulo` to the `DetalleVenta` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Articulo" DROP CONSTRAINT "Articulo_nroVenta_fkey";

-- AlterTable
ALTER TABLE "Articulo" DROP COLUMN "nroVenta";

-- AlterTable
ALTER TABLE "DetalleVenta" ADD COLUMN     "codArticulo" INTEGER NOT NULL;

-- AddForeignKey
ALTER TABLE "DetalleVenta" ADD CONSTRAINT "DetalleVenta_codArticulo_fkey" FOREIGN KEY ("codArticulo") REFERENCES "Articulo"("codArticulo") ON DELETE RESTRICT ON UPDATE CASCADE;
