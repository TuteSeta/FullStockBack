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
                codEstadoOrdenCompra: { in: [1, 2] },
                fechaHoraBajaOrdenCompra: null,
              },
            },
          },
        },
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
        proveedor,
      });

      montoTotalVenta += montoDetalleVenta;
    }

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
      create: { nombreEstadoOC: 'Pendiente' },
    });

    const mensajesOrdenes = [];

    for (const d of detalles) {
      const stockAntes = d.articulo.cantArticulo;
      const nuevoStock = stockAntes - d.cantidad;

      await prisma.articulo.update({
        where: { codArticulo: d.codArticulo },
        data: { cantArticulo: nuevoStock },
      });

      const modeloLF = d.articulo.modeloInventarioLoteFijo;
      const yaTieneOC = d.articulo.detalleOrdenCompra.length > 0;

      if (
        modeloLF &&
        stockAntes >= modeloLF.puntoPedido &&
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

        mensajesOrdenes.push(
          `Se creó una orden de compra para el artículo "${d.articulo.nombreArt}" (stock ${nuevoStock} <= punto de pedido ${modeloLF.puntoPedido}).`
        );
      }
    }
    res.status(201).json({
      message: 'Venta registrada con éxito',
      venta,
      ordenesGeneradas: mensajesOrdenes, // <-- Esto es nuevo
    });

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
      const key = fecha.toLocaleDateString("sv-SE"); // Usa fecha local
      diarias[key] = (diarias[key] || 0) + Number(v.montoTotalVenta);
    }

    const data = Object.entries(diarias)
      .map(([date, totalVentas]) => ({ date, totalVentas }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

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
