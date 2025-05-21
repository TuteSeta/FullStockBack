/*
  Warnings:

  - The primary key for the `Articulo` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `codigo` on the `Articulo` table. All the data in the column will be lost.
  - You are about to drop the column `estado` on the `Articulo` table. All the data in the column will be lost.
  - You are about to drop the column `fechaBaja` on the `Articulo` table. All the data in the column will be lost.
  - You are about to drop the column `id` on the `Articulo` table. All the data in the column will be lost.
  - Added the required column `cantArticulo` to the `Articulo` table without a default value. This is not possible if the table is not empty.
  - Added the required column `cantMaxArticulo` to the `Articulo` table without a default value. This is not possible if the table is not empty.
  - Added the required column `costoMantenimiento` to the `Articulo` table without a default value. This is not possible if the table is not empty.
  - Added the required column `desviacionDemandaLArticulo` to the `Articulo` table without a default value. This is not possible if the table is not empty.
  - Added the required column `desviacionDemandaTArticulo` to the `Articulo` table without a default value. This is not possible if the table is not empty.
  - Added the required column `nivelServicioDeseado` to the `Articulo` table without a default value. This is not possible if the table is not empty.
  - Added the required column `nombreArt` to the `Articulo` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "Articulo_codigo_key";

-- AlterTable
ALTER TABLE "Articulo" DROP CONSTRAINT "Articulo_pkey",
DROP COLUMN "codigo",
DROP COLUMN "estado",
DROP COLUMN "fechaBaja",
DROP COLUMN "id",
ADD COLUMN     "cantArticulo" INTEGER NOT NULL,
ADD COLUMN     "cantMaxArticulo" INTEGER NOT NULL,
ADD COLUMN     "codArticulo" SERIAL NOT NULL,
ADD COLUMN     "costoMantenimiento" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "desviacionDemandaLArticulo" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "desviacionDemandaTArticulo" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "fechaHoraBajaArticulo" TIMESTAMP(3),
ADD COLUMN     "modeloInventarioIntervaloFijoCod" INTEGER,
ADD COLUMN     "modeloInventarioLoteFijoCod" INTEGER,
ADD COLUMN     "nivelServicioDeseado" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "nombreArt" TEXT NOT NULL,
ADD COLUMN     "nroVenta" INTEGER,
ADD CONSTRAINT "Articulo_pkey" PRIMARY KEY ("codArticulo");

-- CreateTable
CREATE TABLE "ArticuloProveedor" (
    "cargoPedidoAP" INTEGER NOT NULL,
    "demoraEntregaAP" INTEGER NOT NULL,
    "precioUnitarioAP" INTEGER NOT NULL,
    "codProveedor" INTEGER NOT NULL,
    "codArticulo" INTEGER NOT NULL
);

-- CreateTable
CREATE TABLE "ModeloInventarioIntervaloFijo" (
    "modeloInventarioIntervaloFijoCod" SERIAL NOT NULL,
    "intervaloTiempo" INTEGER NOT NULL,
    "stockSeguridad" INTEGER NOT NULL,

    CONSTRAINT "ModeloInventarioIntervaloFijo_pkey" PRIMARY KEY ("modeloInventarioIntervaloFijoCod")
);

-- CreateTable
CREATE TABLE "ModeloInventarioLoteFijo" (
    "modeloInventarioLoteFijoCod" SERIAL NOT NULL,
    "loteOptimo" INTEGER NOT NULL,
    "puntoOptimo" INTEGER NOT NULL,
    "stockSeguridadLF" INTEGER NOT NULL,

    CONSTRAINT "ModeloInventarioLoteFijo_pkey" PRIMARY KEY ("modeloInventarioLoteFijoCod")
);

-- CreateTable
CREATE TABLE "Ventas" (
    "fechaVenta" TIMESTAMP(3) NOT NULL,
    "montoTotalVenta" INTEGER NOT NULL,
    "nroVenta" SERIAL NOT NULL,

    CONSTRAINT "Ventas_pkey" PRIMARY KEY ("nroVenta")
);

-- CreateTable
CREATE TABLE "DetalleVenta" (
    "montoDetalleVenta" INTEGER NOT NULL,
    "nroRenglonDV" SERIAL NOT NULL,
    "nroVenta" INTEGER NOT NULL,

    CONSTRAINT "DetalleVenta_pkey" PRIMARY KEY ("nroRenglonDV")
);

-- CreateTable
CREATE TABLE "Proveedor" (
    "codProveedor" SERIAL NOT NULL,
    "fechaHoraBajaProveedor" TIMESTAMP(3),
    "nombreProveedor" TEXT NOT NULL,

    CONSTRAINT "Proveedor_pkey" PRIMARY KEY ("codProveedor")
);

-- CreateTable
CREATE TABLE "OrdenCompra" (
    "nroOrdenCompra" SERIAL NOT NULL,
    "montoOrdenCompra" DOUBLE PRECISION NOT NULL,
    "fechaHoraBajaOrdenCompra" TIMESTAMP(3),
    "codProveedor" INTEGER NOT NULL,
    "codEstadoOrdenCompra" INTEGER NOT NULL,

    CONSTRAINT "OrdenCompra_pkey" PRIMARY KEY ("nroOrdenCompra")
);

-- CreateTable
CREATE TABLE "EstadoOrdenCompra" (
    "codEstadoOrdenCompra" SERIAL NOT NULL,
    "fechaHoraBajaEstadoOC" TIMESTAMP(3),
    "nombreEstadoOC" TEXT NOT NULL,

    CONSTRAINT "EstadoOrdenCompra_pkey" PRIMARY KEY ("codEstadoOrdenCompra")
);

-- CreateTable
CREATE TABLE "DetalleOrdenCompra" (
    "montoDOC" DOUBLE PRECISION NOT NULL,
    "nroRenglonDOC" SERIAL NOT NULL,
    "nroOrdenCompra" INTEGER NOT NULL,
    "codArticulo" INTEGER NOT NULL,

    CONSTRAINT "DetalleOrdenCompra_pkey" PRIMARY KEY ("nroRenglonDOC")
);

-- CreateIndex
CREATE UNIQUE INDEX "ArticuloProveedor_codArticulo_codProveedor_key" ON "ArticuloProveedor"("codArticulo", "codProveedor");

-- AddForeignKey
ALTER TABLE "Articulo" ADD CONSTRAINT "Articulo_modeloInventarioIntervaloFijoCod_fkey" FOREIGN KEY ("modeloInventarioIntervaloFijoCod") REFERENCES "ModeloInventarioIntervaloFijo"("modeloInventarioIntervaloFijoCod") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Articulo" ADD CONSTRAINT "Articulo_modeloInventarioLoteFijoCod_fkey" FOREIGN KEY ("modeloInventarioLoteFijoCod") REFERENCES "ModeloInventarioLoteFijo"("modeloInventarioLoteFijoCod") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Articulo" ADD CONSTRAINT "Articulo_nroVenta_fkey" FOREIGN KEY ("nroVenta") REFERENCES "Ventas"("nroVenta") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArticuloProveedor" ADD CONSTRAINT "ArticuloProveedor_codProveedor_fkey" FOREIGN KEY ("codProveedor") REFERENCES "Proveedor"("codProveedor") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArticuloProveedor" ADD CONSTRAINT "ArticuloProveedor_codArticulo_fkey" FOREIGN KEY ("codArticulo") REFERENCES "Articulo"("codArticulo") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DetalleVenta" ADD CONSTRAINT "DetalleVenta_nroVenta_fkey" FOREIGN KEY ("nroVenta") REFERENCES "Ventas"("nroVenta") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrdenCompra" ADD CONSTRAINT "OrdenCompra_codProveedor_fkey" FOREIGN KEY ("codProveedor") REFERENCES "Proveedor"("codProveedor") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrdenCompra" ADD CONSTRAINT "OrdenCompra_codEstadoOrdenCompra_fkey" FOREIGN KEY ("codEstadoOrdenCompra") REFERENCES "EstadoOrdenCompra"("codEstadoOrdenCompra") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DetalleOrdenCompra" ADD CONSTRAINT "DetalleOrdenCompra_nroOrdenCompra_fkey" FOREIGN KEY ("nroOrdenCompra") REFERENCES "OrdenCompra"("nroOrdenCompra") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DetalleOrdenCompra" ADD CONSTRAINT "DetalleOrdenCompra_codArticulo_fkey" FOREIGN KEY ("codArticulo") REFERENCES "Articulo"("codArticulo") ON DELETE RESTRICT ON UPDATE CASCADE;
