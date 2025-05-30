/*
  Warnings:

  - Added the required column `precioUnitario` to the `DetalleVenta` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "DetalleVenta" ADD COLUMN     "precioUnitario" DOUBLE PRECISION NOT NULL,
ALTER COLUMN "montoDetalleVenta" SET DATA TYPE DOUBLE PRECISION;
