/*
  Warnings:

  - You are about to drop the column `puntoOptimo` on the `ModeloInventarioLoteFijo` table. All the data in the column will be lost.
  - Added the required column `puntoPedido` to the `ModeloInventarioLoteFijo` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "ModeloInventarioLoteFijo" DROP COLUMN "puntoOptimo",
ADD COLUMN     "puntoPedido" INTEGER NOT NULL;
