const express = require('express');
const router = express.Router();
const prisma = require('../prismaClient');
const { proveedorSchema } = require('../schemas/proveedorSchema');


// GET /api/proveedores
router.get('/', async (req, res) => {

  try {
    const proveedores = await prisma.proveedor.findMany({
      where: { fechaHoraBajaProveedor: null }, // Solo los activos
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

module.exports = router;
