/*
  Warnings:

  - Added the required column `cantidadDOC` to the `DetalleOrdenCompra` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "DetalleOrdenCompra" ADD COLUMN     "cantidadDOC" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "OrdenCompra" ADD COLUMN     "fechaCreacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
