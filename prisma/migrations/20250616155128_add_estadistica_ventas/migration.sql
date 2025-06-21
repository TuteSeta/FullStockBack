-- CreateTable
CREATE TABLE "EstadisticaVentas" (
    "id" SERIAL NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cantidadVentas" INTEGER NOT NULL,

    CONSTRAINT "EstadisticaVentas_pkey" PRIMARY KEY ("id")
);
