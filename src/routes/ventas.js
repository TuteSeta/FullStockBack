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

      detalles.push({
        codArticulo,
        cantidad,
        precioUnitario,
        montoDetalleVenta,
        articulo,
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

    // Buscar o crear el estado "Pendiente" de forma insensible
    let estadoPendiente = await prisma.estadoOrdenCompra.findFirst({
      where: {
        nombreEstadoOC: {
          equals: "Pendiente",
          mode: "insensitive",
        },
      },
    });

    if (!estadoPendiente) {
      estadoPendiente = await prisma.estadoOrdenCompra.create({
        data: {
          nombreEstadoOC: "Pendiente",
        },
      });
    }

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
                codEstadoOrdenCompra: estadoPendiente.codEstadoOrdenCompra, // ✅ dinámico
                detalleOrdenCompra: {
                  create: {
                    montoDOC: d.articulo.costoCompra,
                    codArticulo: d.codArticulo,
                    cantidadDOC: modeloLF?.loteOptimo ?? d.cantidad, // ✅ extra
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
router.get('/dashboard/ventas-diarias', async (req, res) => {
  try {
    const ventas = await prisma.ventas.findMany({
      select: {
        fechaVenta: true,
        montoTotalVenta: true,
      },
    });

    const diarias = {};

    for (const v of ventas) {
      const fecha = new Date(v.fechaVenta);
      // 👇 Agrupar por día: formato "YYYY-MM-DD"
      const key = fecha.toISOString().split('T')[0];
      diarias[key] = (diarias[key] || 0) + Number(v.montoTotalVenta);
    }

    const data = Object.entries(diarias).map(([date, totalVentas]) => ({
      date,
      totalVentas,
    }));

    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al calcular ventas diarias" });
  }
});


// POST /api/ventas/estadistica
router.post('/estadistica', async (req, res) => {
  try {
    const hoy = new Date();
    const hace7dias = new Date();
    hace7dias.setDate(hoy.getDate() - 7);

    const cantidadVentas = await prisma.ventas.count({
      where: {
        fechaVenta: {
          gte: hace7dias,
          lte: hoy,
        },
      },
    });

    const estadistica = await prisma.estadisticaVentas.create({
      data: {
        cantidadVentas,
      },
    });

    res.status(201).json(estadistica);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al guardar estadística de ventas" });
  }
});

// GET /api/ventas/historico
router.get('/historico', async (req, res) => {
  try {
    const hoy = new Date();
    const hace7dias = new Date();
    hace7dias.setDate(hoy.getDate() - 7);

    const ventasActuales = await prisma.ventas.count({
      where: {
        fechaVenta: {
          gte: hace7dias,
          lte: hoy,
        },
      },
    });

    const ultimo = await prisma.estadisticaVentas.findFirst({
      orderBy: { fecha: 'desc' },
    });

    const delta = ultimo?.cantidadVentas
      ? ((ventasActuales - ultimo.cantidadVentas) / ultimo.cantidadVentas) * 100
      : 0;

    res.status(200).json({
      actual: ventasActuales,
      delta,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al obtener histórico de ventas" });
  }
});


module.exports = router;
