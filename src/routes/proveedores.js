const express = require('express');
const router = express.Router();
const prisma = require('../prismaClient');
const { proveedorSchema } = require('../schemas/proveedorSchema');
const { calcularModeloLoteFijo } = require('../utils/inventario');


// PUT /api/proveedores/:codProveedor
router.put('/:codProveedor', async (req, res) => {
  const codProveedor = parseInt(req.params.codProveedor);
  const { nombreProveedor, fechaHoraBajaProveedor } = req.body;
  try {
    const proveedorActualizado = await prisma.proveedor.update({
      where: { codProveedor },
      data: {
        nombreProveedor,
        fechaHoraBajaProveedor: fechaHoraBajaProveedor ? new Date(fechaHoraBajaProveedor) : null,
      },
    });

    // 🔁 Buscar todos los artículos donde este proveedor es predeterminado
    const articulosRelacionados = await prisma.articulo.findMany({
      where: {
        codProveedorPredeterminado: codProveedor,
        fechaHoraBajaArticulo: null,
      },
      include: {
        modeloInventarioLoteFijo: true,
        articuloProveedores: {
          where: { codProveedor }
        }
      }
    });

    for (const articulo of articulosRelacionados) {
      const relacion = articulo.articuloProveedores[0];
      if (!relacion) continue;

      const nuevosValores = calcularModeloLoteFijo(articulo, relacion);

      await prisma.modeloInventarioLoteFijo.upsert({
        where: { codArticulo: articulo.codArticulo },
        update: nuevosValores,
        create: {
          ...nuevosValores,
          codArticulo: articulo.codArticulo
        }
      });
    }

    res.status(200).json(proveedorActualizado);
  } catch (error) {
    console.error('Error al actualizar proveedor:', error);
    res.status(500).json({ error: 'No se pudo actualizar el proveedor' });
  }
});

// GET /api/proveedores?soloActivos=true
router.get('/', async (req, res) => {
  const soloActivos = req.query.soloActivos === 'true';

  try {
    const proveedores = await prisma.proveedor.findMany({
      where: {
        fechaHoraBajaProveedor: null, // 👈 excluye dados de baja
      },
    });
    res.status(200).json(proveedores);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al obtener proveedores' });
  }
});

// POST /api/articulos
router.post('/', async (req, res, next) => {
  try {
    const data = proveedorSchema.parse(req.body); // valida y convierte

    const nuevo = await prisma.proveedor.create({ data });
    res.status(201).json(nuevo);
  } catch (error) {
    console.error(error);
    // Si tenés un middleware de errores:
    next(error);
    // Si no lo tenés aún, podés dejar esto temporalmente:
    // res.status(400).json({ error: error.message });
  }
});

// DELETE /api/proveedores/:codProveedor
router.delete('/:codProveedor', async (req, res) => {
  const codProveedor = parseInt(req.params.codProveedor);

  try {

    // 1. Eliminar relaciones con artículos
    await prisma.articuloProveedor.deleteMany({
      where: { codProveedor }
    });

    // Actualizar la fecha de baja en lugar de eliminar
    const proveedorBaja = await prisma.proveedor.update({
      where: { codProveedor },
      data: { fechaHoraBajaProveedor: new Date() },
    });

    res.status(200).json(proveedorBaja);
  } catch (error) {
    console.error('Error al dar de baja el proveedor:', error);
    res.status(500).json({ error: 'No se pudo dar de baja el proveedor' });
  }
});


module.exports = router;
