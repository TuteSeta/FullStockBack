-- CreateTable
CREATE TABLE "Articulo" (
    "id" SERIAL NOT NULL,
    "codigo" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "demanda" INTEGER NOT NULL,
    "costoAlmacenamiento" DOUBLE PRECISION NOT NULL,
    "costoPedido" DOUBLE PRECISION NOT NULL,
    "costoCompra" DOUBLE PRECISION NOT NULL,
    "estado" BOOLEAN NOT NULL DEFAULT true,
    "fechaBaja" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Articulo_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Articulo_codigo_key" ON "Articulo"("codigo");
