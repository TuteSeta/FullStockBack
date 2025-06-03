const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { ventasSchema } = require('../schemas/ventasSchema');

const prisma = new PrismaClient();

router.post('/', async (req, res) => {

  const parseResult = ventasSchema.safeParse(req.body);

  if (!parseResult.success) {
    return res.status(400).json({ error: parseResult.error.errors });
  }
  const { articulos } = parseResult.data;

  try {
    const detalles = [];
    let montoTotalVenta = 0;

    for (const { codArticulo, cantidad } of articulos) {
      const articulo = await prisma.articulo.findUnique({
        where: { codArticulo },
        include: {
          modeloInventarioLoteFijo: true,
          articuloProveedores: true,
        },
      });

      if (!articulo) {
        return res.status(404).json({ error: `Artículo ${codArticulo} no encontrado` });
      }

      if (articulo.cantArticulo < cantidad) {
        return res.status(400).json({ error: `Stock insuficiente para el artículo ${articulo.nombreArt}` });
      }

      const precioUnitario = articulo.costoCompra;
      const montoDetalleVenta = precioUnitario * cantidad;

      // Acumular los datos del detalle
      detalles.push({
        codArticulo,
        cantidad,
        precioUnitario,
        montoDetalleVenta,
        articulo, // guardamos el objeto completo para uso posterior (stock/lote)
      });

      montoTotalVenta += montoDetalleVenta;
    }

    // Crear la venta
    const venta = await prisma.ventas.create({
      data: {
        fechaVenta: new Date(),
        montoTotalVenta,
        cantidad: detalles.reduce((acc, d) => acc + d.cantidad, 0),
        detalleVenta: {
          create: detalles.map(d => ({
            codArticulo: d.codArticulo,
            cantidad: d.cantidad,
            precioUnitario: d.precioUnitario,
            montoDetalleVenta: d.montoDetalleVenta,
          })),
        },
      },
      include: {
        detalleVenta: {
          include: {
            articulo: {
              select: {
                codArticulo: true,
                nombreArt: true,
              },
            },
          },
        },
      },
    });

    // Actualizar stock y verificar modelo Lote Fijo
    for (const d of detalles) {
      const nuevoStock = d.articulo.cantArticulo - d.cantidad;

      await prisma.articulo.update({
        where: { codArticulo: d.codArticulo },
        data: { cantArticulo: nuevoStock },
      });

      const modeloLF = d.articulo.modeloInventarioLoteFijo;
      if (modeloLF && nuevoStock <= modeloLF.puntoPedido) {
        const proveedor = d.articulo.articuloProveedores[0];
        if (proveedor) {
          const ordenesPendientes = await prisma.ordenCompra.findMany({
            where: {
              codProveedor: proveedor.codProveedor,
              detalleOrdenCompra: {
                some: { codArticulo: d.codArticulo },
              },
              estadoOrdenCompra: {
                NOT: { nombreEstadoOC: 'Recibido' },
              },
            },
          });

          if (ordenesPendientes.length === 0) {
            await prisma.ordenCompra.create({
              data: {
                montoOrdenCompra: d.articulo.costoCompra,
                codProveedor: proveedor.codProveedor,
                codEstadoOrdenCompra: 1, // Estado "Pendiente"
                detalleOrdenCompra: {
                  create: {
                    montoDOC: d.articulo.costoCompra,
                    codArticulo: d.codArticulo,
                  },
                },
              },
            });
          }
        }
      }
    }

    res.status(201).json({ message: 'Venta registrada con éxito', venta });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al registrar la venta' });
  }
});

// GET /api/ventas - Listar ventas con artículos (usando DetalleVenta) 
router.get('/', async (req, res) => {
  try {
    const ventas = await prisma.ventas.findMany({
      orderBy: { nroVenta: 'desc' },
      include: {
        detalleVenta: {
          include: {
            articulo: {
              select: {
                codArticulo: true,
                nombreArt: true,
              },
            },
          },
        },
      },
    });

    res.status(200).json(ventas);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al obtener las ventas' });
  }
});

// DELETE /api/ventas/:id
router.delete('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const venta = await prisma.ventas.findUnique({
      where: { nroVenta: parseInt(id) },
      include: {
        detalleVenta: true,
      },
    });

    if (!venta) {
      return res.status(404).json({ error: 'La venta no existe' });
    }

    // Actualizar stock de cada artículo en el detalle de la venta
    for (const detalle of venta.detalleVenta) {
      await prisma.articulo.update({
        where: { codArticulo: detalle.codArticulo },
        data: {
          cantArticulo: {
            increment: detalle.cantidad, // Aumentar el stock
          },
        },
      });
    }

    // Eliminar los detalles de la venta
    await prisma.detalleVenta.deleteMany({
      where: { nroVenta: parseInt(id) },
    });

    // Eliminar la venta
    await prisma.ventas.delete({
      where: { nroVenta: parseInt(id) },
    });

    res.status(204).send();
  } catch (error) {
    console.error('Error al eliminar la venta:', error);
    res.status(500).json({ error: 'No se pudo eliminar la venta' });
  }
});


module.exports = router;
