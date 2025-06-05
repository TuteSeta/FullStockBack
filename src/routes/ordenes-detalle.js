const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { ordenesDetalleUpdateSchema } = require('../schemas/ordenesDetalleUpdateSchema');


// PUT /api/ordenes-detalle/:nroRenglonDOC
router.put('/:nroRenglonDOC', async (req, res) => {
  const { nroRenglonDOC } = req.params;

  const parseResult = ordenesDetalleUpdateSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({ error: parseResult.error.errors });
  }
  const { nuevaCantidad } = parseResult.data;
  
  try {
    const detalle = await prisma.detalleOrdenCompra.findUnique({
      where: { nroRenglonDOC: parseInt(nroRenglonDOC) },
    });

    if (!detalle) {
      return res.status(404).json({ error: 'Detalle no encontrado' });
    }

    // Buscar el precio actual de la relación articuloProveedor
    const relacion = await prisma.articuloProveedor.findUnique({
      where: {
        codArticulo_codProveedor: {
          codArticulo: detalle.codArticulo,
          codProveedor: detalle.codProveedor,
        }
      }
    });
    if (!relacion) {
      return res.status(400).json({ error: 'No existe relación proveedor-artículo' });
    }

    const nuevoMonto = relacion.precioUnitarioAP * nuevaCantidad;
    
    // Actualizar detalle
    await prisma.detalleOrdenCompra.update({
      where: { nroRenglonDOC: parseInt(nroRenglonDOC) },
      data: {
        cantidadDOC: nuevaCantidad,
        montoDOC: nuevoMonto,
      },
    });

    // Actualizar monto total de la orden de compra
    const otrosDetalles = await prisma.detalleOrdenCompra.findMany({
      where: {
        nroOrdenCompra: detalle.nroOrdenCompra,
      },
    });

    const nuevoMontoTotal = otrosDetalles.reduce((sum, d) =>
      d.nroRenglonDOC === detalle.nroRenglonDOC
        ? sum + nuevoMonto
        : sum + d.montoDOC
    , 0);

    await prisma.ordenCompra.update({
      where: { nroOrdenCompra: detalle.nroOrdenCompra },
      data: { montoOrdenCompra: nuevoMontoTotal },
    });

    res.status(200).json({ message: 'Detalle actualizado correctamente' });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al actualizar el detalle' });
  }
});

// DELETE /api/ordenes-detalle/:nroRenglonDOC
router.delete('/:nroRenglonDOC', async (req, res) => {
  const { nroRenglonDOC } = req.params;

  try {
    const detalle = await prisma.detalleOrdenCompra.findUnique({
      where: { nroRenglonDOC: parseInt(nroRenglonDOC) },
    });

    if (!detalle) {
      return res.status(404).json({ error: 'Detalle no encontrado' });
    }

    // Eliminar el detalle
    await prisma.detalleOrdenCompra.delete({
      where: { nroRenglonDOC: parseInt(nroRenglonDOC) },
    });

    // Actualizar monto total de la orden de compra
    const otrosDetalles = await prisma.detalleOrdenCompra.findMany({
      where: {
        nroOrdenCompra: detalle.nroOrdenCompra,
      },
    });

    const nuevoMontoTotal = otrosDetalles.reduce((sum, d) => sum + d.montoDOC, 0);

    await prisma.ordenCompra.update({
      where: { nroOrdenCompra: detalle.nroOrdenCompra },
      data: { montoOrdenCompra: nuevoMontoTotal },
    });

    res.status(204).send();

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al eliminar el detalle' });
  }
});

module.exports = router;