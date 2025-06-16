-- CreateTable
CREATE TABLE "EstadisticaArticulo" (
    "id" SERIAL NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "totalArticulos" INTEGER NOT NULL,

    CONSTRAINT "EstadisticaArticulo_pkey" PRIMARY KEY ("id")
);
