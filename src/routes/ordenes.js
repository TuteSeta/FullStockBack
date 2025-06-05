const express = require('express');
const router = express.Router();
const prisma = require('../prismaClient');
const { ordenesSchema } = require('../schemas/ordenesSchema.js');

// POST /api/ordenes
router.post('/', async (req, res) => {

  try{
    const { codProveedor, detalleOC} = ordenesSchema.parse(req.body); // valida y convierte

    // Calcular montos usando el precio de la relación articuloProveedor
    const detallesConMontos = await Promise.all(detalleOC.map(async (item) => {
      const relacion = await prisma.articuloProveedor.findUnique({
        where: {
          codArticulo_codProveedor: {
            codArticulo: item.codArticulo,
            codProveedor: codProveedor,
          }
        }
      });
      if (!relacion) throw new Error(`El proveedor no tiene el artículo ${item.codArticulo}`);
      return {
        codArticulo: item.codArticulo,
        cantidadDOC: item.cantidadDOC,
        montoDOC: relacion.precioUnitarioAP * item.cantidadDOC
      };
    }));

    const montoOrdenCompra = detallesConMontos.reduce((total, item) => total + Number(item.montoDOC), 0);

    // Crear la orden de compra en estado Pendiente 
    const nuevaOC = await prisma.ordenCompra.create({
        data: {
            codProveedor,
            montoOrdenCompra,
            codEstadoOrdenCompra: 1, // Pendiente
            detalleOrdenCompra: {
                create: detallesConMontos
            }
        },
        include: {
            detalleOrdenCompra: true,
            proveedor: true,
            estadoOrdenCompra: true
        }
    });
    res.status(201).json(nuevaOC);
  } catch (error) {
    console.error('Error al crear la orden de compra:', error);
    res.status(500).json({ error: 'No se pudo crear la orden de compra' });
  }
});

// GET /api/ordenes

router.get('/', async (req, res) => {
  try {
    const ordenes = await prisma.ordenCompra.findMany({
      include: {
        detalleOrdenCompra: true,
        proveedor: true,
        estadoOrdenCompra: true
      }
    });
    res.status(200).json(ordenes);
  } catch (error) {
    console.error('Error al obtener las órdenes de compra:', error);
    res.status(500).json({ error: 'No se pudieron obtener las órdenes de compra' });
  }
});

// GET /api/ordenes/:id
router.get('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const orden = await prisma.ordenCompra.findUnique({
      where: { nroOrdenCompra: parseInt(id) },
      include: {
        detalleOrdenCompra: true,
        proveedor: true,
        estadoOrdenCompra: true
      }
    });

    if (!orden) {
      return res.status(404).json({ error: 'Orden de compra no encontrada' });
    }

    res.status(200).json(orden);
  } catch (error) {
    console.error('Error al obtener la orden de compra:', error);
    res.status(500).json({ error: 'No se pudo obtener la orden de compra' });
  }
});

// PUT /api/ordenes/:id

router.put('/:id', async (req, res) => {
    const { id } = req.params;
    const { codProveedor, detalleOC } = ordenesSchema.parse(req.body); // valida y convierte

    try {
        // Buscar la orden de compra 
        const orden = await prisma.ordenCompra.findUnique({
            where: { nroOrdenCompra: parseInt(id) },
        });

        if (!orden) {
            return res.status(404).json({ error: 'Orden de compra no encontrada' });
        }

        // Solo permitir actualizar si la orden está en estado Pendiente
        if (orden.codEstadoOrdenCompra !== 1) { // 1 es el código para Pendiente
            return res.status(400).json({ error: 'Solo se pueden actualizar órdenes en estado Pendiente' });
        }

        // Calcular montos usando el precio de la relación articuloProveedor
        const detallesConMontos = await Promise.all(detalleOC.map(async (item) => {
          const relacion = await prisma.articuloProveedor.findUnique({
            where: {
              codArticulo_codProveedor: {
                codArticulo: item.codArticulo,
                codProveedor: codProveedor,
              }
            }
          });
          if (!relacion) throw new Error(`El proveedor no tiene el artículo ${item.codArticulo}`);
          return {
            codArticulo: item.codArticulo,
            cantidadDOC: item.cantidadDOC,
            montoDOC: relacion.precioUnitarioAP * item.cantidadDOC
          };
        }));

        const montoOrdenCompra = detallesConMontos.reduce((total, item) => total + Number(item.montoDOC), 0);

        // Actualizar la orden de compra
        await prisma.detalleOrdenCompra.deleteMany({
            where: { nroOrdenCompra: orden.nroOrdenCompra }
        });

        const ordenActualizada = await prisma.ordenCompra.update({
            where: { nroOrdenCompra: orden.nroOrdenCompra },
            data: {
                codProveedor,
                montoOrdenCompra,
                detalleOrdenCompra: {
                    create: detallesConMontos
                }
            },
        include: {
            detalleOrdenCompra: true,
            proveedor: true,
            estadoOrdenCompra: true
        }
    });
        res.status(200).json(ordenActualizada);
    } catch (error) {
        console.error('Error al actualizar la orden de compra:', error);
        res.status(500).json({ error: 'No se pudo actualizar la orden de compra' });
    }
});

// DELETE /api/ordenes/:id
router.delete('/:id', async (req, res) => {
    const { id } = req.params;

    try {
        // Buscar la orden de compra
        const orden = await prisma.ordenCompra.findUnique({
            where: { nroOrdenCompra: parseInt(id) },
        });

        if (!orden) {
            return res.status(404).json({ error: 'Orden de compra no encontrada' });
        }

        // Solo permitir eliminar si la orden está en estado Pendiente
        if (orden.codEstadoOrdenCompra !== 1) { // 1 es el código para Pendiente
            return res.status(400).json({ error: 'Solo se pueden eliminar órdenes en estado Pendiente' });
        }

        // Realizar la baja lógica actualizando la fechaHoraBajaOrdenCompra
        await prisma.ordenCompra.update({
            where: { nroOrdenCompra: orden.nroOrdenCompra },
            data: { fechaHoraBajaOrdenCompra: new Date() }
        });

        res.status(204).send(); // No content
    } catch (error) {
        console.error('Error al eliminar la orden de compra:', error);
        res.status(500).json({ error: 'No se pudo eliminar la orden de compra' });
    }
});

// DELETE /api/ordenes/:id/detalle/:detalleId
router.delete('/:id/detalle/:detalleId', async (req, res) => {
    const { id, detalleId } = req.params;

    try {
        // Buscar la orden de compra
        const orden = await prisma.ordenCompra.findUnique({
            where: { nroOrdenCompra: parseInt(id) }
        });

        if (!orden) {
            return res.status(404).json({ error: 'Orden de compra no encontrada' });
        }

        // Solo permitir eliminar si la orden está en estado Pendiente
        if (orden.codEstadoOrdenCompra !== 1) {
            return res.status(400).json({ error: 'Solo se pueden modificar órdenes en estado Pendiente' });
        }

        // Eliminar el detalle específico
        await prisma.detalleOrdenCompra.delete({
            where: { nroRenglonDOC: parseInt(detalleId) }
        });

        res.status(204).send();
    } catch (error) {
        console.error('Error al eliminar el detalle de la orden de compra:', error);
        res.status(500).json({ error: 'No se pudo eliminar el detalle de la orden de compra' });
    }
});

module.exports = router;