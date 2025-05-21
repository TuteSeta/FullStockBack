const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

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

// POST /api/proveedores
router.post('/', async (req, res) => {
  const { nombreProveedor } = req.body;
  try {
    const nuevoProveedor = await prisma.proveedor.create({
      data: {
        nombreProveedor,
      },
    });
    res.status(201).json(nuevoProveedor);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al crear el proveedor' });
  }
});

module.exports = router;
