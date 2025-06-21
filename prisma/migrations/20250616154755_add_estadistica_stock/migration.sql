-- CreateTable
CREATE TABLE "EstadisticaStock" (
    "id" SERIAL NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "stockDisponible" INTEGER NOT NULL,
    "stockMaximo" INTEGER NOT NULL,

    CONSTRAINT "EstadisticaStock_pkey" PRIMARY KEY ("id")
);
