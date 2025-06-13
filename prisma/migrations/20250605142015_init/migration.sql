/*
  Warnings:

  - A unique constraint covering the columns `[nombreEstadoOC]` on the table `EstadoOrdenCompra` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "EstadoOrdenCompra_nombreEstadoOC_key" ON "EstadoOrdenCompra"("nombreEstadoOC");
