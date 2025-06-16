const express = require('express');
const router = express.Router();
const prisma = require('../prismaClient');
const { articulosSchema } = require('../schemas/articulosSchema');
const { ar, de } = require('zod/v4/locales');
const e = require('express');


// PUT /api/articulos/:id
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const data = articulosSchema.parse(req.body); // valida y convierte

  // Extrar posibles modelos de inventario
  const {modeloInventarioLoteFijo, modeloInventarioIntervaloFijo, ...articuloData} = data;

  const updateData = {...articuloData};

  // Eliminar codArticulo para que no se intente actualizar
  delete updateData.codArticulo;

  if (modeloInventarioLoteFijo) {
    updateData.modeloInventarioLoteFijo = {
  upsert: {
    update: modeloInventarioLoteFijo,
    create: modeloInventarioLoteFijo
    }
  };
  updateData.modeloInventarioIntervaloFijo = { disconnect: true };

  } else if (modeloInventarioIntervaloFijo) {
    updateData.modeloInventarioIntervaloFijo = {
      upsert: {
        update: modeloInventarioIntervaloFijo,
        create: modeloInventarioIntervaloFijo
      }
    };
    updateData.modeloInventarioLoteFijo = { disconnect: true };
  } else {
    updateData.modeloInventarioLoteFijo = { disconnect: true };
    updateData.modeloInventarioIntervaloFijo = { disconnect: true };
  }

  try {
    const actualizado = await prisma.articulo.update({
      where: { codArticulo: parseInt(id) },
      data: updateData,
      include: {
        modeloInventarioLoteFijo: true,
        modeloInventarioIntervaloFijo: true
      }
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
    const articulos = await prisma.articulo.findMany({
      include: {
        modeloInventarioLoteFijo: true,
        modeloInventarioIntervaloFijo: true
      }
  });
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

    // Extrar posibles modelos de inventario
    const {modeloInventarioLoteFijo, modeloInventarioIntervaloFijo, ...articuloData} = data;
    
    const createData = {...articuloData};
    if (modeloInventarioLoteFijo) {
      createData.modeloInventarioLoteFijo = {create: modeloInventarioLoteFijo};
    } else if (modeloInventarioIntervaloFijo) {
      createData.modeloInventarioIntervaloFijo = {create: modeloInventarioIntervaloFijo};
    }


    const nuevo = await prisma.articulo.create({ 
      data: createData,
      include: {
        modeloInventarioLoteFijo: true,
        modeloInventarioIntervaloFijo: true
      }
    });

    res.status(201).json(nuevo);
  } catch (error) {
    console.error(error);
    // Si tenés un middleware de errores:
    next(error);
    // Si no lo tenés aún, podés dejar esto temporalmente:
    // res.status(400).json({ error: error.message });
  }


});
router.get('/count', async (req, res) => {
  try {
    const total = await prisma.articulo.count();
    res.status(200).json({ total });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al contar los artículos' });
  }
});

router.post('/estadistica', async (req, res) => {
  try {
    const total = await prisma.articulo.count();
    const nuevaEstadistica = await prisma.estadisticaArticulo.create({
      data: {
        totalArticulos: total,
      },
    });
    res.status(201).json(nuevaEstadistica);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al guardar estadística" });
  }
});

router.get('/historico', async (req, res) => {
  try {
    // 1. Contar artículos en tiempo real
    const actual = await prisma.articulo.count();

    // 2. Obtener el último registro guardado en estadística
    const ultimoRegistro = await prisma.estadisticaArticulo.findFirst({
      orderBy: { fecha: 'desc' },
    });

    const anterior = ultimoRegistro?.totalArticulos || 0;

    res.status(200).json({ actual, anterior });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al obtener históricos" });
  }
});

router.post('/stock/estadistica', async (req, res) => {
  try {
    const articulos = await prisma.articulo.findMany({
      select: {
        cantArticulo: true,
        cantMaxArticulo: true,
      },
    });

    const stockDisponible = articulos.reduce((acc, a) => acc + a.cantArticulo, 0);
    const stockMaximo = articulos.reduce((acc, a) => acc + a.cantMaxArticulo, 0);

    const estadistica = await prisma.estadisticaStock.create({
      data: {
        stockDisponible,
        stockMaximo,
      },
    });

    res.status(201).json(estadistica);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al guardar estadística de stock" });
  }
});

// GET /api/articulos/stock/historico
router.get('/stock/historico', async (req, res) => {
  try {
    const articulos = await prisma.articulo.findMany({
      select: {
        cantArticulo: true,
        cantMaxArticulo: true,
      },
    });

    const stockActual = articulos.reduce((acc, a) => acc + a.cantArticulo, 0);
    const stockMaxActual = articulos.reduce((acc, a) => acc + a.cantMaxArticulo, 0);

    const ultimo = await prisma.estadisticaStock.findFirst({
      orderBy: { fecha: 'desc' },
    });

    const porcentajeActual = (stockActual / stockMaxActual) * 100;
    const porcentajeAnterior = ultimo
      ? (ultimo.stockDisponible / ultimo.stockMaximo) * 100
      : 0;

    res.status(200).json({
      actual: stockActual,
      delta: porcentajeActual - porcentajeAnterior,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al obtener histórico de stock" });
  }
});

// GET /api/articulos/stock-bajo
router.get('/stock-bajo', async (req, res) => {
  try {
    const articulos = await prisma.articulo.findMany({
      select: {
        codArticulo: true,
        nombreArt: true,
        cantArticulo: true,
        cantMaxArticulo: true,
        modeloInventarioIntervaloFijo: {
          select: {
            stockSeguridadIF: true,
          },
        },
        modeloInventarioLoteFijo: {
          select: {
            stockSeguridadLF: true,
          },
        },
      },
    });

    const procesados = articulos
      .map((a) => {
        const stockSeguridad =
          a.modeloInventarioIntervaloFijo?.stockSeguridadIF ??
          a.modeloInventarioLoteFijo?.stockSeguridadLF ??
          0;

        return {
          nombre: a.nombreArt,
          cantidad: a.cantArticulo,
          total: a.cantMaxArticulo,
          stockSeguridad,
        };
      })
      .sort((a, b) => a.cantidad - b.cantidad)
      .slice(0, 4);

    res.status(200).json(procesados);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al obtener artículos con stock bajo" });
  }
});



module.exports = router;
