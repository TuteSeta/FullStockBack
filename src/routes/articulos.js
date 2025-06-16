const express = require('express');
const router = express.Router();
const prisma = require('../prismaClient');
const { articulosSchema } = require('../schemas/articulosSchema');
const { calcularModeloLoteFijo } = require('../utils/inventario');

// PUT /api/articulos/:id
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const data = articulosSchema.parse(req.body);

  const {
    modeloInventarioLoteFijo,
    modeloInventarioIntervaloFijo,
    recalcularLoteFijo, // 👈 nuevo flag desde frontend
    ...articuloData
  } = data;

  const updateData = { ...articuloData };
  delete updateData.codArticulo;

  if (recalcularLoteFijo) {
    let loteOptimo = 0;
    let puntoPedido = 0;
    let stockSeguridadLF = 0;

    if (data.codProveedorPredeterminado) {
      const proveedor = await prisma.proveedor.findUnique({
        where: { codProveedor: data.codProveedorPredeterminado },
        include: {
          articuloProveedores: {
            where: { codArticulo: parseInt(id) },
          },
        },
      });

      const relacion = proveedor?.articuloProveedores[0];

      if (relacion) {
        const articuloParaCalculo = {
          demanda: Number(data.demanda),
          costoMantenimiento: Number(data.costoMantenimiento),
          desviacionDemandaLArticulo: Number(data.desviacionDemandaLArticulo),
          nivelServicioDeseado: Number(data.nivelServicioDeseado),
        };

        try {
          const calculado = calcularModeloLoteFijo(articuloParaCalculo, relacion);
          loteOptimo = calculado.loteOptimo;
          puntoPedido = calculado.puntoPedido;
          stockSeguridadLF = calculado.stockSeguridadLF;
        } catch (e) {
          return res.status(400).json({ error: 'No se pudo calcular modelo: ' + e.message });
        }
      }
    }

    modeloInventarioLoteFijo.loteOptimo = loteOptimo;
    modeloInventarioLoteFijo.puntoPedido = puntoPedido;
    modeloInventarioLoteFijo.stockSeguridadLF = stockSeguridadLF;
  }
  // Aplicar los cambios en modelos de inventario
  if (modeloInventarioLoteFijo) {
    updateData.modeloInventarioLoteFijo = {
      upsert: {
        update: modeloInventarioLoteFijo,
        create: modeloInventarioLoteFijo,
      },
    };
    updateData.modeloInventarioIntervaloFijo = { disconnect: true };
  } else if (modeloInventarioIntervaloFijo) {
    updateData.modeloInventarioIntervaloFijo = {
      upsert: {
        update: modeloInventarioIntervaloFijo,
        create: modeloInventarioIntervaloFijo,
      },
    };
    updateData.modeloInventarioLoteFijo = { disconnect: true };
  } else {
    updateData.modeloInventarioLoteFijo = { disconnect: true };
    updateData.modeloInventarioIntervaloFijo = { disconnect: true };
  }

  // Proveedor predeterminado
  if ('codProveedorPredeterminado' in data) {
    if (data.codProveedorPredeterminado) {
      updateData.proveedorPredeterminado = {
        connect: { codProveedor: data.codProveedorPredeterminado },
      };
    } else {
      updateData.proveedorPredeterminado = { disconnect: true };
    }
    delete updateData.codProveedorPredeterminado;
  }

  // Ejecutar update
  try {
    const actualizado = await prisma.articulo.update({
      where: { codArticulo: parseInt(id) },
      data: updateData,
      include: {
        modeloInventarioLoteFijo: true,
        modeloInventarioIntervaloFijo: true,
        proveedorPredeterminado: true,
      },
    });

    res.status(200).json(actualizado);
  } catch (error) {
    console.error('Error al actualizar artículo:', error);
    res.status(500).json({ error: 'Error al actualizar el artículo' });
  }
});



// DELETE /api/articulos/:id
router.delete('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    await prisma.articulo.update({
      where: { codArticulo: parseInt(id) },
      data: { fechaHoraBajaArticulo: new Date() }, // baja lógica
    });

    res.status(200).json({ message: 'Artículo dado de baja correctamente' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al dar de baja el artículo' });
  }
});

// GET /api/articulos
router.get('/', async (req, res) => {
  try {
    const articulos = await prisma.articulo.findMany({
      where: {
        fechaHoraBajaArticulo: null, // 👈 excluye eliminados
      },
      include: {
        modeloInventarioLoteFijo: true,
        modeloInventarioIntervaloFijo: true,
        proveedorPredeterminado: true,
      },

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
    const data = articulosSchema.parse(req.body);

    const {
      modeloInventarioLoteFijo,
      modeloInventarioIntervaloFijo,
      ...articuloData
    } = data;

    const createData = { ...articuloData };

    // Modelo Lote Fijo
    if (modeloInventarioLoteFijo !== undefined) {
      let loteOptimo = 0;
      let puntoPedido = 0;
      let stockSeguridadLF = 0;

      if (data.codProveedorPredeterminado) {
        const proveedor = await prisma.proveedor.findUnique({
          where: { codProveedor: data.codProveedorPredeterminado },
          include: {
            articuloProveedores: true,
          },
        });

        const relacion = proveedor?.articuloProveedores.find(
          (rel) => rel.codArticulo == null
        );

        if (relacion) {
          const articuloParaCalculo = {
            demanda: Number(data.demanda),
            costoMantenimiento: Number(data.costoMantenimiento),
            desviacionDemandaLArticulo: Number(data.desviacionDemandaLArticulo),
            nivelServicioDeseado: Number(data.nivelServicioDeseado),
          };

          const calculado = calcularModeloLoteFijo(articuloParaCalculo, relacion);

          loteOptimo = calculado.loteOptimo;
          puntoPedido = calculado.puntoPedido;
          stockSeguridadLF = calculado.stockSeguridadLF;
        }
      }

      createData.modeloInventarioLoteFijo = {
        create: {
          loteOptimo,
          puntoPedido,
          stockSeguridadLF,
        },
      };
    }

    // Modelo Intervalo Fijo
    else if (modeloInventarioIntervaloFijo) {
      createData.modeloInventarioIntervaloFijo = {
        create: {
          intervaloTiempo: Number(modeloInventarioIntervaloFijo.intervaloTiempo) || 0,
          stockSeguridadIF: Number(modeloInventarioIntervaloFijo.stockSeguridadIF) || 0,
        },
      };
    }

    // Proveedor predeterminado (relación externa)
    if (articuloData.codProveedorPredeterminado) {
      createData.proveedorPredeterminado = {
        connect: { codProveedor: articuloData.codProveedorPredeterminado },
      };
    }

    delete createData.codProveedorPredeterminado;

    const nuevo = await prisma.articulo.create({
      data: createData,
      include: {
        modeloInventarioLoteFijo: true,
        modeloInventarioIntervaloFijo: true,
        proveedorPredeterminado: true,
      },
    });

    res.status(201).json(nuevo);
  } catch (error) {
    console.error(error);
    next(error);
  }
});



module.exports = router;
