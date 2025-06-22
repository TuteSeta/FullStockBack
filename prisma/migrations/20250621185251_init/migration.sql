-- CreateTable
CREATE TABLE "Articulo" (
    "codArticulo" SERIAL NOT NULL,
    "nombreArt" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "demanda" INTEGER NOT NULL,
    "cantArticulo" INTEGER NOT NULL,
    "precioArticulo" DOUBLE PRECISION NOT NULL,
    "costoMantenimiento" DOUBLE PRECISION NOT NULL,
    "desviacionDemandaLArticulo" DOUBLE PRECISION NOT NULL,
    "desviacionDemandaTArticulo" DOUBLE PRECISION NOT NULL,
    "nivelServicioDeseado" DOUBLE PRECISION NOT NULL,
    "ultimaRevision" TIMESTAMP(3),
    "cgi" DOUBLE PRECISION,
    "fechaHoraBajaArticulo" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "modeloInventarioIntervaloFijoCod" INTEGER,
    "modeloInventarioLoteFijoCod" INTEGER,
    "codProveedorPredeterminado" INTEGER,

    CONSTRAINT "Articulo_pkey" PRIMARY KEY ("codArticulo")
);

-- CreateTable
CREATE TABLE "ArticuloProveedor" (
    "cargoPedidoAP" DOUBLE PRECISION NOT NULL,
    "demoraEntregaAP" INTEGER NOT NULL,
    "costoUnitarioAP" DOUBLE PRECISION NOT NULL,
    "codProveedor" INTEGER NOT NULL,
    "codArticulo" INTEGER NOT NULL
);

-- CreateTable
CREATE TABLE "ModeloInventarioIntervaloFijo" (
    "modeloInventarioIntervaloFijoCod" SERIAL NOT NULL,
    "intervaloTiempo" INTEGER NOT NULL,
    "stockSeguridadIF" INTEGER NOT NULL,
    "inventarioMaximo" INTEGER NOT NULL,
    "cantidadPedido" INTEGER,

    CONSTRAINT "ModeloInventarioIntervaloFijo_pkey" PRIMARY KEY ("modeloInventarioIntervaloFijoCod")
);

-- CreateTable
CREATE TABLE "ModeloInventarioLoteFijo" (
    "modeloInventarioLoteFijoCod" SERIAL NOT NULL,
    "loteOptimo" INTEGER NOT NULL,
    "puntoPedido" INTEGER NOT NULL,
    "stockSeguridadLF" INTEGER NOT NULL,

    CONSTRAINT "ModeloInventarioLoteFijo_pkey" PRIMARY KEY ("modeloInventarioLoteFijoCod")
);

-- CreateTable
CREATE TABLE "Ventas" (
    "fechaVenta" TIMESTAMP(3) NOT NULL,
    "montoTotalVenta" INTEGER NOT NULL,
    "cantidad" INTEGER NOT NULL,
    "nroVenta" SERIAL NOT NULL,

    CONSTRAINT "Ventas_pkey" PRIMARY KEY ("nroVenta")
);

-- CreateTable
CREATE TABLE "DetalleVenta" (
    "montoDetalleVenta" DOUBLE PRECISION NOT NULL,
    "nroRenglonDV" SERIAL NOT NULL,
    "precioUnitario" DOUBLE PRECISION NOT NULL,
    "cantidad" INTEGER NOT NULL,
    "codArticulo" INTEGER NOT NULL,
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
    "fechaCreacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
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
    "cantidadDOC" INTEGER NOT NULL,
    "nroOrdenCompra" INTEGER NOT NULL,
    "codArticulo" INTEGER NOT NULL,

    CONSTRAINT "DetalleOrdenCompra_pkey" PRIMARY KEY ("nroRenglonDOC")
);

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

-- CreateIndex
CREATE UNIQUE INDEX "ArticuloProveedor_codArticulo_codProveedor_key" ON "ArticuloProveedor"("codArticulo", "codProveedor");

-- CreateIndex
CREATE UNIQUE INDEX "EstadoOrdenCompra_nombreEstadoOC_key" ON "EstadoOrdenCompra"("nombreEstadoOC");

-- AddForeignKey
ALTER TABLE "Articulo" ADD CONSTRAINT "Articulo_modeloInventarioIntervaloFijoCod_fkey" FOREIGN KEY ("modeloInventarioIntervaloFijoCod") REFERENCES "ModeloInventarioIntervaloFijo"("modeloInventarioIntervaloFijoCod") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Articulo" ADD CONSTRAINT "Articulo_modeloInventarioLoteFijoCod_fkey" FOREIGN KEY ("modeloInventarioLoteFijoCod") REFERENCES "ModeloInventarioLoteFijo"("modeloInventarioLoteFijoCod") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Articulo" ADD CONSTRAINT "Articulo_codProveedorPredeterminado_fkey" FOREIGN KEY ("codProveedorPredeterminado") REFERENCES "Proveedor"("codProveedor") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArticuloProveedor" ADD CONSTRAINT "ArticuloProveedor_codProveedor_fkey" FOREIGN KEY ("codProveedor") REFERENCES "Proveedor"("codProveedor") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArticuloProveedor" ADD CONSTRAINT "ArticuloProveedor_codArticulo_fkey" FOREIGN KEY ("codArticulo") REFERENCES "Articulo"("codArticulo") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DetalleVenta" ADD CONSTRAINT "DetalleVenta_nroVenta_fkey" FOREIGN KEY ("nroVenta") REFERENCES "Ventas"("nroVenta") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DetalleVenta" ADD CONSTRAINT "DetalleVenta_codArticulo_fkey" FOREIGN KEY ("codArticulo") REFERENCES "Articulo"("codArticulo") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrdenCompra" ADD CONSTRAINT "OrdenCompra_codProveedor_fkey" FOREIGN KEY ("codProveedor") REFERENCES "Proveedor"("codProveedor") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrdenCompra" ADD CONSTRAINT "OrdenCompra_codEstadoOrdenCompra_fkey" FOREIGN KEY ("codEstadoOrdenCompra") REFERENCES "EstadoOrdenCompra"("codEstadoOrdenCompra") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DetalleOrdenCompra" ADD CONSTRAINT "DetalleOrdenCompra_nroOrdenCompra_fkey" FOREIGN KEY ("nroOrdenCompra") REFERENCES "OrdenCompra"("nroOrdenCompra") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DetalleOrdenCompra" ADD CONSTRAINT "DetalleOrdenCompra_codArticulo_fkey" FOREIGN KEY ("codArticulo") REFERENCES "Articulo"("codArticulo") ON DELETE RESTRICT ON UPDATE CASCADE;
