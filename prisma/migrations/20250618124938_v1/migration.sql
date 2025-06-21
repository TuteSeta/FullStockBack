/*
  Warnings:

  - Added the required column `inventarioMaximo` to the `ModeloInventarioIntervaloFijo` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "ModeloInventarioIntervaloFijo" ADD COLUMN     "inventarioMaximo" INTEGER NOT NULL;
