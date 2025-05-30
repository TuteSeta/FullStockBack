const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// POST /api/ventas - Registrar una venta
router.post('/', async (req, res) => {
  const { codArticulo, cantidadVendida } = req.body;

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

    if (articulo.cantArticulo < 1 || cantidadVendida > articulo.cantArticulo) {
      return res.status(400).json({ error: 'Stock insuficiente para realizar la venta' });
    }

    const montoTotalVenta = articulo.costoCompra * cantidadVendida;
    const precioUnitario = articulo.costoCompra;
    const montoDetalleVenta = precioUnitario * cantidadVendida;
    // 1. Crear la venta
    const venta = await prisma.ventas.create({
      data: {
        fechaVenta: new Date(),
        montoTotalVenta,
        cantidad: cantidadVendida,
        detalleVenta: {
          create: {
            codArticulo,
            cantidad: cantidadVendida,
            precioUnitario,
            montoDetalleVenta,
          },
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
        }
      
      },
    });

    // 2. Actualizar el stock
    await prisma.articulo.update({
      where: { codArticulo },
      data: {
        cantArticulo: articulo.cantArticulo - cantidadVendida,
      },
    });

    // 3. Verificar modelo Lote Fijo y crear orden si hace falta
    const modeloLF = articulo.modeloInventarioLoteFijo;
    if (modeloLF && (articulo.cantArticulo - cantidadVendida <= modeloLF.puntoPedido)) {
      const proveedor = articulo.articuloProveedores[0];
      if (proveedor) {
        const ordenesPendientes = await prisma.ordenCompra.findMany({
          where: {
            codProveedor: proveedor.codProveedor,
            detalleOrdenCompra: {
              some: { codArticulo },
            },
            estadoOrdenCompra: {
              NOT: { nombreEstadoOC: 'Recibido' },
            },
          },
        });

        if (ordenesPendientes.length === 0) {
          await prisma.ordenCompra.create({
            data: {
              montoOrdenCompra: articulo.costoCompra,
              codProveedor: proveedor.codProveedor,
              codEstadoOrdenCompra: 1, // Estado "Pendiente"
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

module.exports = router;
