-- CreateTable
CREATE TABLE "EstadisticaArticulo" (
    "id" SERIAL NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "totalArticulos" INTEGER NOT NULL,

    CONSTRAINT "EstadisticaArticulo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EstadisticaStock" (
    "id" SERIAL NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "stockDisponible" INTEGER NOT NULL,
    "stockMaximo" INTEGER NOT NULL,

    CONSTRAINT "EstadisticaStock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EstadisticaVentas" (
    "id" SERIAL NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cantidadVentas" INTEGER NOT NULL,

    CONSTRAINT "EstadisticaVentas_pkey" PRIMARY KEY ("id")
);
