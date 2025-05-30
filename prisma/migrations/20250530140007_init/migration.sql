/*
  Warnings:

  - Added the required column `cantidad` to the `Ventas` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Ventas" ADD COLUMN     "cantidad" INTEGER NOT NULL;
