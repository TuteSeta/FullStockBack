const express = require('express');
const router = express.Router();
const prisma = require('../prismaClient');
const { articulosSchema } = require('../schemas/articulosSchema');


// PUT /api/articulos/:id
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const data = req.body;

  try {
    const actualizado = await prisma.articulo.update({
      where: { codArticulo: parseInt(id) },
      data,
    });

    res.status(200).json(actualizado);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al actualizar el artículo' });
  }
});


// DELETE /api/articulos/:id
router.delete('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    await prisma.articulo.delete({
      where: {
        codArticulo: parseInt(id),
      },
    });

    res.status(200).json({ message: 'Artículo eliminado correctamente' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al eliminar el artículo' });
  }
});

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
router.post('/', async (req, res, next) => {
  try {
    const data = articulosSchema.parse(req.body); // valida y convierte
    const nuevo = await prisma.articulo.create({ data });
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
