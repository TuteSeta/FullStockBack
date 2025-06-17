/*
  Warnings:

  - You are about to drop the column `cantMaxArticulo` on the `Articulo` table. All the data in the column will be lost.
  - You are about to drop the column `costoAlmacenamiento` on the `Articulo` table. All the data in the column will be lost.
  - You are about to drop the column `costoCompra` on the `Articulo` table. All the data in the column will be lost.
  - You are about to drop the column `costoPedido` on the `Articulo` table. All the data in the column will be lost.
  - You are about to drop the column `precioUnitarioAP` on the `ArticuloProveedor` table. All the data in the column will be lost.
  - Added the required column `precioArticulo` to the `Articulo` table without a default value. This is not possible if the table is not empty.
  - Added the required column `costoUnitarioAP` to the `ArticuloProveedor` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Articulo" DROP COLUMN "cantMaxArticulo",
DROP COLUMN "costoAlmacenamiento",
DROP COLUMN "costoCompra",
DROP COLUMN "costoPedido",
ADD COLUMN     "precioArticulo" DOUBLE PRECISION NOT NULL;

-- AlterTable
ALTER TABLE "ArticuloProveedor" DROP COLUMN "precioUnitarioAP",
ADD COLUMN     "costoUnitarioAP" DOUBLE PRECISION NOT NULL;
