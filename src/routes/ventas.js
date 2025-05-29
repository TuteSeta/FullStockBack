const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// POST /api/ventas - Registrar una venta
router.post('/', async (req, res) => {
  const { codArticulo, montoTotalVenta } = req.body;

  try {
    const articulo = await prisma.articulo.findUnique({
      where: { codArticulo },
      include: {
        modeloInventarioLoteFijo: true,
        articuloProveedores: true,
      },
    });

    if (!articulo) {
      return res.status(404).json({ error: 'Artículo no encontrado' });
    }

    if (articulo.cantArticulo <= 1) {
      return res.status(400).json({ error: 'No se puede vender: stock menor o igual a 1' });
    }

    // Crear venta
    const venta = await prisma.ventas.create({
      data: {
        fechaVenta: new Date(),
        montoTotalVenta: parseFloat(montoTotalVenta),
        articulo: {
          connect: { codArticulo },
        },
      },
    });

    // Actualizar stock
    await prisma.articulo.update({
      where: { codArticulo },
      data: {
        cantArticulo: articulo.cantArticulo - 1,
      },
    });

    // Verificar si aplica generación de orden de compra (modelo LF)
    const modeloLF = articulo.modeloInventarioLoteFijo;
    if (modeloLF && (articulo.cantArticulo - 1 <= modeloLF.puntoOptimo)) {
      const proveedor = articulo.articuloProveedores[0];

      if (!proveedor) {
        return res.status(400).json({ error: 'No hay proveedor asignado al artículo' });
      }

      // Verificar si ya hay orden pendiente o enviada
      const ordenesPendientes = await prisma.ordenCompra.findMany({
        where: {
          codProveedor: proveedor.codProveedor,
          detalleOrdenCompra: {
            some: { codArticulo: codArticulo },
          },
          estadoOrdenCompra: {
            NOT: { nombreEstadoOC: 'Recibido' },
          },
        },
        include: { estadoOrdenCompra: true },
      });

      if (ordenesPendientes.length === 0) {
        await prisma.ordenCompra.create({
          data: {
            montoOrdenCompra: articulo.costoCompra,
            codProveedor: proveedor.codProveedor,
            codEstadoOrdenCompra: 1, // Estado 'Pendiente' asumido como 1
            detalleOrdenCompra: {
              create: {
                montoDOC: articulo.costoCompra,
                codArticulo,
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

// GET /api/ventas - Ver todas las ventas realizadas
router.get('/', async (req, res) => {
  try {
    const ventas = await prisma.ventas.findMany({
      include: {
        articulo: true,
        detalleVenta: true,
      },
    });

    res.status(200).json(ventas);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al obtener las ventas' });
  }
});

module.exports = router;
