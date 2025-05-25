const express = require('express');
const router = express.Router();
const prisma = require('../prismaClient');
const { ventaSchema } = require('../schemas/ventasSchema');

router.post('/', async (req, res) => {
  const validacion = ventaSchema.safeParse(req.body);
  if (!validacion.success) {
    return res.status(400).json({ error: 'Datos inválidos', detalles: validacion.error.format() });
  }

  const { codArticulo, cantidad, montoTotalVenta } = req.body;

  try {
    const articulo = await prisma.articulo.findUnique({
      where: { codArticulo },
      include: {
        modeloInventarioLoteFijo: true,
        detalleOrdenCompra: {
          include: {
            ordenCompra: {
              include: {
                estadoOrdenCompra: true
              }
            }
          }
        }
      }
    });

    if (!articulo) return res.status(404).json({ error: 'Artículo no encontrado' });

    // Validar stock
    if (cantidad > articulo.cantArticulo) {
      return res.status(400).json({ error: 'Cantidad supera el stock disponible' });
    }

    // Crear venta
    const nuevaVenta = await prisma.ventas.create({
      data: {
        fechaVenta: new Date(),
        montoTotalVenta,
        articulo: { connect: { codArticulo } }, // relacionar con el artículo
        detalleVenta: {
          create: {
            montoDetalleVenta: montoTotalVenta
          }
        }
      }
    });

    // Descontar del stock
    await prisma.articulo.update({
      where: { codArticulo },
      data: { cantArticulo: { decrement: cantidad } }
    });

    // Verificar si se debe crear orden de compra (modelo LF)
    const usarLoteFijo = articulo.modeloInventarioLoteFijoCod !== null;
    const stockBajo = articulo.cantArticulo - cantidad < articulo.modeloInventarioLoteFijo?.puntoOptimo;
    const tieneOrdenPendiente = articulo.detalleOrdenCompra.some(doc =>
      ['pendiente', 'enviada'].includes(doc.ordenCompra.estadoOrdenCompra.nombreEstadoOC.toLowerCase())
    );

    if (usarLoteFijo && stockBajo && !tieneOrdenPendiente) {
      // Obtener estado "pendiente"
      const estadoPendiente = await prisma.estadoOrdenCompra.findFirst({
        where: { nombreEstadoOC: { equals: 'pendiente', mode: 'insensitive' } }
      });

      if (!estadoPendiente) {
        return res.status(500).json({ error: 'Estado "pendiente" no definido en la base de datos' });
      }

      const orden = await prisma.ordenCompra.create({
        data: {
          montoOrdenCompra: articulo.costoCompra * articulo.modeloInventarioLoteFijo.loteOptimo,
          codProveedor: 1, // ajustar si necesitás lógica para proveedor
          codEstadoOrdenCompra: estadoPendiente.codEstadoOrdenCompra,
          detalleOrdenCompra: {
            create: {
              codArticulo,
              montoDOC: articulo.costoCompra * articulo.modeloInventarioLoteFijo.loteOptimo
            }
          }
        }
      });

      console.log(`Orden de compra generada automáticamente (ID: ${orden.nroOrdenCompra})`);
    }

    res.status(201).json({ mensaje: 'Venta registrada', venta: nuevaVenta });
  } catch (error) {
    console.error('Error en venta:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

module.exports = router;

