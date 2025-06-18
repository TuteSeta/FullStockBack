const express = require('express');
const router = express.Router();
const prisma = require('../prismaClient');
const { articulosSchema } = require('../schemas/articulosSchema');
const { calcularModeloLoteFijo, calcularModeloIntervaloFijo } = require('../utils/inventario');

// PUT /api/articulos/:id
router.put('/:id', async (req, res) => {
  console.log('Body recibido:', req.body);
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
  delete updateData.recalcularLoteFijo; // 👈 SOLO AQUÍ

  console.log('recalcularLoteFijo:', recalcularLoteFijo);
  if (recalcularLoteFijo && modeloInventarioLoteFijo) {
    let loteOptimo = 0;
    let puntoPedido = 0;
    let stockSeguridadLF = 0;

    if (data.codProveedorPredeterminado) {
      const proveedor = await prisma.proveedor.findUnique({
        where: { codProveedor: data.codProveedorPredeterminado },
        include: {
          articuloProveedores: {
            where: { codArticulo: parseInt(id) },
            select: {
              codArticulo: true,
              cargoPedidoAP: true,
              demoraEntregaAP: true,
            },
          },
        },
      });

      const relacion = proveedor?.articuloProveedores[0];

      if (relacion && relacion.cargoPedidoAP && relacion.demoraEntregaAP) {
        console.log('Entrando al cálculo de lote fijo');
        const articuloParaCalculo = {
          demanda: Number(data.demanda),
          costoMantenimiento: Number(data.costoMantenimiento),
          desviacionDemandaLArticulo: Number(data.desviacionDemandaLArticulo),
          nivelServicioDeseado: Number(data.nivelServicioDeseado),
        };
        console.log('Datos para cálculo:', {
          demanda: data.demanda,
          costoMantenimiento: data.costoMantenimiento,
          desviacionDemandaLArticulo: data.desviacionDemandaLArticulo,
          nivelServicioDeseado: data.nivelServicioDeseado,
          cargoPedidoAP: relacion?.cargoPedidoAP,
          demoraEntregaAP: relacion?.demoraEntregaAP,
        });

        try {
          const calculado = calcularModeloLoteFijo(articuloParaCalculo, relacion);
          loteOptimo = calculado.loteOptimo;
          puntoPedido = calculado.puntoPedido;
          stockSeguridadLF = calculado.stockSeguridadLF;
        } catch (e) {
          return res.status(400).json({ error: 'No se pudo calcular modelo: ' + e.message });
        }
      } else {
        return res.status(400).json({ error: 'Faltan datos en la relación proveedor-artículo' });
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

  //INTERVALO FIJO
  if (
    modeloInventarioIntervaloFijo &&
    (
    modeloInventarioIntervaloFijo.stockSeguridadIF == null ||
    modeloInventarioIntervaloFijo.inventarioMaximo == null ||
    modeloInventarioIntervaloFijo.cantidadPedido == null
    )
  ) {
    const proveedor = await prisma.proveedor.findUnique({
      where: { codProveedor: data.codProveedorPredeterminado },
      include: {
        articuloProveedores: {
          where: { codArticulo: parseInt(id) },
          select: {
            demoraEntregaAP: true,
          },
        },
      },
    });

    const relacion = proveedor?.articuloProveedores[0];
    if (!relacion) {
      return res.status(400).json({
        error: 'No se puede calcular modelo IF: proveedor-artículo sin relación',
      });
    }

      // Obtener el stock actual del artículo
    const articuloActual = await prisma.articulo.findUnique({
      where: { codArticulo: parseInt(id) },
      select: { cantArticulo: true }
    });

    try {
      const resultado = calcularModeloIntervaloFijo({
        demanda: Number(data.demanda),
        desviacionDemanda: Number(data.desviacionDemandaTArticulo),
        nivelServicioDeseado: Number(data.nivelServicioDeseado),
        intervaloTiempo: Number(modeloInventarioIntervaloFijo.intervaloTiempo),
        demoraEntrega: Number(relacion.demoraEntregaAP),
        inventarioActual: Number(articuloActual?.cantArticulo) || 0,
      });

      modeloInventarioIntervaloFijo.stockSeguridadIF = resultado.stockSeguridadIF;
      modeloInventarioIntervaloFijo.inventarioMaximo = resultado.inventarioMaximo;
      modeloInventarioIntervaloFijo.cantidadPedido = resultado.cantidadPedido;
    } catch (e) {
      return res.status(400).json({ error: 'Error al calcular modelo IF: ' + e.message });
    }
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

// GET /api/articulos/:id
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const articulo = await prisma.articulo.findUnique({
      where: { codArticulo: parseInt(id) },
      include: {
        modeloInventarioLoteFijo: true,
        modeloInventarioIntervaloFijo: true,
        proveedorPredeterminado: true,
      },
    });
    if (!articulo) {
      return res.status(404).json({ error: 'Artículo no encontrado' });
    }
    res.status(200).json(articulo);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al obtener el artículo' });
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

      if (data.codProveedorPredeterminado && data.codArticulo) {
        const proveedor = await prisma.proveedor.findUnique({
          where: { codProveedor: data.codProveedorPredeterminado },
          include: {
            articuloProveedores: {
              where: { codArticulo: data.codArticulo },
              select: {
                codArticulo: true,
                cargoPedidoAP: true,
                demoraEntregaAP: true,
              },
            },
          },
        });

        const relacion = proveedor?.articuloProveedores[0];

        if (relacion && relacion.cargoPedidoAP && relacion.demoraEntregaAP) {
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
      let stockSeguridadIF = 0;
      let inventarioMaximo = 0;
      let cantidadPedido = 0;

      if (data.codProveedorPredeterminado) {
        const proveedor = await prisma.proveedor.findUnique({
          where: { codProveedor: data.codProveedorPredeterminado },
          include: {
            articuloProveedores: {
              where: { codArticulo: data.codArticulo },
              select: { demoraEntregaAP: true },
            },
          },
        });

        const relacion = proveedor?.articuloProveedores[0];
        if (relacion && relacion.demoraEntregaAP) {
          const resultado = calcularModeloIntervaloFijo({
            demanda: Number(data.demanda),
            desviacionDemanda: Number(data.desviacionDemandaTArticulo),
            nivelServicioDeseado: Number(data.nivelServicioDeseado),
            intervaloTiempo: Number(modeloInventarioIntervaloFijo.intervaloTiempo),
            demoraEntrega: Number(relacion.demoraEntregaAP),
          });

          stockSeguridadIF = resultado.stockSeguridadIF;
          inventarioMaximo = resultado.inventarioMaximo;
          cantidadPedido = resultado.cantidadPedido;
        }
      }

      createData.modeloInventarioIntervaloFijo = {
        create: {
          intervaloTiempo: Number(modeloInventarioIntervaloFijo.intervaloTiempo),
          stockSeguridadIF,
          inventarioMaximo,
          cantidadPedido,
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
    delete createData.recalcularLoteFijo; // 👈 SOLO AQUÍ

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