const express = require('express');
const router = express.Router();
const prisma = require('../prismaClient');
const { ordenesSchema } = require('../schemas/ordenesSchema.js');

// POST /api/ordenes
router.post('/', async (req, res) => {

  try {
    const { codProveedor, detalleOC } = ordenesSchema.parse(req.body); // valida y convierte

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

      if (!relacion || isNaN(relacion.costoUnitarioAP)) {
        throw new Error(`El proveedor ${codProveedor} no tiene relación válida con el artículo ${item.codArticulo}`);
      }

      return {
        codArticulo: item.codArticulo,
        cantidadDOC: item.cantidadDOC,
        montoDOC: Number(relacion.costoUnitarioAP) * item.cantidadDOC
      };
    }));

    const montoOrdenCompra = detallesConMontos.reduce((total, item) => total + Number(item.montoDOC), 0);

    // Crear la orden de compra en estado Pendiente 
    const nuevaOC = await prisma.ordenCompra.create({
      data: {
        montoOrdenCompra,
        proveedor: { connect: { codProveedor } }, // 🔁 ← esto es lo correcto
        estadoOrdenCompra: { connect: { codEstadoOrdenCompra: 1 } },
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
    const nro = parseInt(id);

    // Buscar la orden de compra
    const orden = await prisma.ordenCompra.findUnique({
      where: { nroOrdenCompra: nro },
    });

    if (!orden) {
      return res.status(404).json({ error: 'Orden de compra no encontrada' });
    }

    // Solo permitir eliminar si la orden está en estado Pendiente
    const estadoPendiente = await prisma.estadoOrdenCompra.findFirst({
      where: { nombreEstadoOC: 'Pendiente' }
    });

    if (orden.codEstadoOrdenCompra !== estadoPendiente?.codEstadoOrdenCompra) {
      return res.status(400).json({ error: 'Solo se pueden eliminar órdenes en estado Pendiente' });
    }

    // Buscar el código del estado "Cancelada"
    const estadoCancelada = await prisma.estadoOrdenCompra.findFirst({
      where: { nombreEstadoOC: 'Cancelada' }
    });

    if (!estadoCancelada) {
      return res.status(500).json({ error: 'Estado "Cancelada" no definido en la base de datos.' });
    }

    // Realizar la baja lógica actualizando el estado y la fecha
    await prisma.ordenCompra.update({
      where: { nroOrdenCompra: nro },
      data: {
        codEstadoOrdenCompra: estadoCancelada.codEstadoOrdenCompra,
        fechaHoraBajaOrdenCompra: new Date()
      }
    });

    res.status(204).send(); // No content
  } catch (error) {
    console.error('Error al cancelar la orden de compra:', error);
    res.status(500).json({ error: 'No se pudo cancelar la orden de compra' });
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

// PATCH /api/ordenes/:id/finalizar
router.patch('/:id/finalizar', async (req, res) => {
  const { id } = req.params;

  try {
    const orden = await prisma.ordenCompra.findUnique({
      where: { nroOrdenCompra: parseInt(id) },
      include: {
        detalleOrdenCompra: true,
        estadoOrdenCompra: true,
      },
    });

    if (!orden) {
      return res.status(404).json({ error: 'Orden no encontrada' });
    }

    if (orden.estadoOrdenCompra.nombreEstadoOC === 'Finalizada') {
      return res.status(400).json({ error: 'La orden ya está finalizada' });
    }

    // Obtener (o crear si no existe) el estado Finalizada
    const estadoFinalizada = await prisma.estadoOrdenCompra.upsert({
      where: { nombreEstadoOC: 'Finalizada' },
      update: {},
      create: { nombreEstadoOC: 'Finalizada' },
    });

    // Sumar las cantidades de cada artículo al stock
    for (const detalle of orden.detalleOrdenCompra) {
      await prisma.articulo.update({
        where: { codArticulo: detalle.codArticulo },
        data: {
          cantArticulo: {
            increment: detalle.cantidadDOC,
          },
        },
      });
    }

    // Actualizar la orden al nuevo estado
    const ordenFinalizada = await prisma.ordenCompra.update({
      where: { nroOrdenCompra: parseInt(id) },
      data: {
        codEstadoOrdenCompra: estadoFinalizada.codEstadoOrdenCompra,
      },
      include: {
        detalleOrdenCompra: true,
        proveedor: true,
        estadoOrdenCompra: true,
      },
    });

    res.status(200).json({ message: 'Orden finalizada y stock actualizado', orden: ordenFinalizada });

  } catch (error) {
    console.error('Error al finalizar la orden:', error);
    res.status(500).json({ error: 'No se pudo finalizar la orden' });
  }
});



module.exports = router;