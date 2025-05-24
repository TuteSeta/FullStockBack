const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// GET /api/articulos
router.get('/', async (req, res) => {
  try {
    const articulos = await prisma.articulo.findMany();
    res.status(200).json(articulos);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al obtener los artículos' });
  }
});

// POST /api/articulos
router.post('/', async (req, res) => {
  const { codArticulo, nombreArt, descripcion, demanda, cantArticulo, cantMaxArticulo, costoAlmacenamiento, costoMantenimiento, costoPedido, costoCompra, desviacionDemandaLArticulo, desviacionDemandaTArticulo, nivelServicioDeseado } = req.body;

  try {
    const nuevo = await prisma.articulo.create({
      data: {
        codArticulo:parseInt(codArticulo),
        nombreArt,
        descripcion,
        demanda: parseInt(demanda),
        cantArticulo: parseInt(cantArticulo),
        cantMaxArticulo: parseInt(cantMaxArticulo),
        costoAlmacenamiento: parseFloat(costoAlmacenamiento),
        costoMantenimiento: parseFloat(costoMantenimiento),
        costoPedido: parseFloat(costoPedido),
        costoCompra: parseFloat(costoCompra),
        desviacionDemandaLArticulo: parseFloat(desviacionDemandaLArticulo),
        desviacionDemandaTArticulo: parseFloat(desviacionDemandaTArticulo),
        nivelServicioDeseado: parseFloat(nivelServicioDeseado),
      },
    });

    res.status(201).json(nuevo);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al crear el artículo' });
  }
});

module.exports = router;
