const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { ventaDetalleUpdateSchema } = require('../schemas/ventaDetalleUpdateSchema');

const prisma = new PrismaClient();

// PUT /api/venta-detalle/:nroRenglonDV
router.put('/:nroRenglonDV', async (req, res) => {
  const { nroRenglonDV } = req.params;

  const parseResult = ventaDetalleUpdateSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({ error: parseResult.error.errors });
  }
  const { nuevaCantidad } = parseResult.data;

  try {
    const detalle = await prisma.detalleVenta.findUnique({
      where: { nroRenglonDV: parseInt(nroRenglonDV) },
      include: {
        articulo: true,
        ventas: true,
      },
    });

    if (!detalle) {
      return res.status(404).json({ error: 'Detalle no encontrado' });
    }

    const diferencia = nuevaCantidad - detalle.cantidad;

    // Validación de stock disponible
    if (diferencia > 0 && detalle.articulo.cantArticulo < diferencia) {
       return res.status(400).json({ error: 'No hay suficiente stock disponible para aumentar la cantidad' });
      }

    const nuevoStock = detalle.articulo.cantArticulo - diferencia;
    const nuevoMonto = detalle.precioUnitario * nuevaCantidad;

    // Actualizar stock
    await prisma.articulo.update({
      where: { codArticulo: detalle.codArticulo },
      data: { cantArticulo: nuevoStock },
    });

    // Actualizar detalle
    await prisma.detalleVenta.update({
      where: { nroRenglonDV: parseInt(nroRenglonDV) },
      data: {
        cantidad: nuevaCantidad,
        montoDetalleVenta: nuevoMonto,
      },
    });

    // Actualizar monto total de la venta
    const otrosDetalles = await prisma.detalleVenta.findMany({
      where: {
        nroVenta: detalle.nroVenta,
        NOT: { nroRenglonDV: parseInt(nroRenglonDV) },
      },
    });

    const nuevoMontoTotal = otrosDetalles.reduce((sum, d) => sum + d.montoDetalleVenta, 0) + nuevoMonto;

    await prisma.ventas.update({
      where: { nroVenta: detalle.nroVenta },
      data: { montoTotalVenta: nuevoMontoTotal },
    });

    res.status(200).json({ message: 'Cantidad y montos actualizados' });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al actualizar la cantidad' });
  }
});


// DELETE /api/venta-detalle/:nroRenglonDV
router.delete('/:nroRenglonDV', async (req, res) => {
  const { nroRenglonDV } = req.params;

  try {
    const detalle = await prisma.detalleVenta.findUnique({
      where: { nroRenglonDV: parseInt(nroRenglonDV) },
      include: { articulo: true },
    });

    if (!detalle) {
      return res.status(404).json({ error: 'Detalle no encontrado' });
    }

    await prisma.articulo.update({
      where: { codArticulo: detalle.codArticulo },
      data: { cantArticulo: detalle.articulo.cantArticulo + detalle.cantidad },
    });

    await prisma.detalleVenta.delete({
      where: { nroRenglonDV: parseInt(nroRenglonDV) },
    });

    res.status(204).send();

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al eliminar el detalle' });
  }
});

module.exports = router;
