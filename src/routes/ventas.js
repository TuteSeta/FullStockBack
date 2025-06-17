const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { ventasSchema } = require('../schemas/ventasSchema');

const prisma = new PrismaClient();

//POST 
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
          proveedorPredeterminado: true,
          articuloProveedores: true,
          detalleOrdenCompra: {
            where: {
              ordenCompra: {
                codEstadoOrdenCompra: { in: [1, 2] }, // Pendiente o Enviada
                fechaHoraBajaOrdenCompra: null
              }
            }
          }
        }
      });

      if (!articulo) {
        return res.status(404).json({ error: `Artículo ${codArticulo} no encontrado` });
      }

      if (articulo.cantArticulo < cantidad) {
        return res.status(400).json({ error: `Stock insuficiente para el artículo ${articulo.nombreArt}` });
      }

      const proveedor = articulo.articuloProveedores.find(p => p.codProveedor === articulo.codProveedorPredeterminado);
      if (!proveedor) {
        return res.status(400).json({ error: `Artículo ${articulo.nombreArt} no tiene relación válida con su proveedor predeterminado` });
      }

      const precioUnitario = proveedor.costoUnitarioAP;
      const montoDetalleVenta = precioUnitario * cantidad;

      detalles.push({
        codArticulo,
        cantidad,
        precioUnitario,
        montoDetalleVenta,
        articulo,
        proveedor
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
              select: { codArticulo: true, nombreArt: true },
            },
          },
        },
      },
    });

    const estadoPendiente = await prisma.estadoOrdenCompra.upsert({
      where: { nombreEstadoOC: 'Pendiente' },
      update: {},
      create: { nombreEstadoOC: 'Pendiente' }
    });

    // Actualizar stock y verificar punto de pedido
    for (const d of detalles) {
      const nuevoStock = d.articulo.cantArticulo - d.cantidad;

      await prisma.articulo.update({
        where: { codArticulo: d.codArticulo },
        data: { cantArticulo: nuevoStock },
      });

      const modeloLF = d.articulo.modeloInventarioLoteFijo;

      const yaTieneOC = d.articulo.detalleOrdenCompra.length > 0;

      if (
        modeloLF &&
        nuevoStock <= modeloLF.puntoPedido &&
        d.articulo.proveedorPredeterminado &&
        !yaTieneOC
      ) {
        const lote = modeloLF.loteOptimo;

        await prisma.ordenCompra.create({
          data: {
            codProveedor: d.proveedor.codProveedor,
            codEstadoOrdenCompra: estadoPendiente.codEstadoOrdenCompra,
            montoOrdenCompra: lote * d.proveedor.costoUnitarioAP,
            detalleOrdenCompra: {
              create: {
                codArticulo: d.codArticulo,
                cantidadDOC: lote,
                montoDOC: lote * d.proveedor.costoUnitarioAP,
              },
            },
          },
        });
      }
    }

    res.status(201).json({ message: 'Venta registrada con éxito', venta });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al registrar la venta' });
  }
});


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

    for (const detalle of venta.detalleVenta) {
      await prisma.articulo.update({
        where: { codArticulo: detalle.codArticulo },
        data: {
          cantArticulo: {
            increment: detalle.cantidad,
          },
        },
      });
    }

    await prisma.detalleVenta.deleteMany({
      where: { nroVenta: parseInt(id) },
    });

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
