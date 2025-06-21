const express = require('express');
const router = express.Router();
const prisma = require('../prismaClient');
const { articulosSchema } = require('../schemas/articulosSchema');
const { calcularModeloLoteFijo, calcularModeloIntervaloFijo, calcularCGI } = require('../utils/inventario');
const { error } = require('zod/v4/locales/ar.js');
const { number } = require('zod/v4');

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
    let cgi = null;

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
              costoUnitarioAP: true, // 👈 nuevo campo para calcular CGI
            },
          },
        },
      });

      const relacion = proveedor?.articuloProveedores[0];

      if (relacion && relacion.cargoPedidoAP && relacion.demoraEntregaAP && relacion.costoUnitarioAP) {
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
          costoUnitarioAP: relacion?.costoUnitarioAP,
        });

        try {
          const calculado = calcularModeloLoteFijo(articuloParaCalculo, relacion);
          loteOptimo = calculado.loteOptimo;
          puntoPedido = calculado.puntoPedido;
          stockSeguridadLF = calculado.stockSeguridadLF;

          // Calcular el Costo de Gestión de Inventario (CGI)
          cgi = calcularCGI({
            demanda: Number(data.demanda),
            costoUnidad: Number(relacion.costoUnitarioAP),
            loteOptimo,
            costoPedido: Number(relacion.cargoPedidoAP),
            costoMantenimiento: Number(data.costoMantenimiento),
          });
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
    updateData.cgi = cgi; // guardar CGI en el articulo
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
            cargoPedidoAP: true, // necesario para calcular CGI
            costoUnitarioAP: true, // nuevo campo para calcular CGI
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

      // Calcular CGI para intervalo fijo
      if (relacion.cargoPedidoAP && relacion.costoUnitarioAP) {
        updateData.cgi = calcularCGI({
          demanda: Number(data.demanda),
          costoUnidad: Number(relacion.costoUnitarioAP),
          loteOptimo: resultado.cantidadPedido > 0 ? resultado.cantidadPedido : 1,
          costoPedido: Number(relacion.cargoPedidoAP),
          costoMantenimiento: Number(data.costoMantenimiento),
        });
      }

    } catch (e) {
      return res.status(400).json({ error: 'Error al calcular modelo IF: ' + e.message });
    }
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
    // 1. Verificar si el artículo tiene stock
    const articulo = await prisma.articulo.findUnique({
      where: { codArticulo: parseInt(id) },
      select: { cantArticulo: true }
    });
    if (!articulo) {
      return res.status(404).json({ error: 'Artículo no encontrado' });
    }
    if (articulo.cantArticulo > 0) {
      return res.status(400).json({ error: 'No se puede dar de baja: el articulo tiene unidades en stock'});
    }
    
    // 2. Verificar si hay OC pendiente o enviada
    const ocPendiente = await prisma.ordenCompra.findFirst({
      where:{
        detalleOrdenCompra: {
          some: { codArticulo: parseInt(id) }
        },
        estadoOrdenCompra: {
          nombreEstadoOC: { in: ['Pendiente', 'Enviada'] } // 👈 estados que no permiten baja
        }
      }
    });
    
    if (ocPendiente) {
      return res.status(400).json({ error: 'No se puede dar de baja: el artículo tiene órdenes de compra pendientes o enviadas' });
    }

    // Si pasa los controles, dar de baja lógica
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
    const filtro = req.query.filtro;
    let articulos;

    // Traer todos los artículos activos con sus relaciones
    articulos = await prisma.articulo.findMany({
      where: { fechaHoraBajaArticulo: null },
      include: {
        modeloInventarioLoteFijo: true,
        modeloInventarioIntervaloFijo: true,
        proveedorPredeterminado: true,
        articuloProveedores: {
          include: { 
            proveedor: true, // Traer el proveedor
          }
        },
        detalleOrdenCompra: {
          include: {
            ordenCompra: {
              include: {
                estadoOrdenCompra: true, // Traer el estado de la OC
            }
          }
        }
      }
    }
  });

    if (filtro === 'punto-pedido') {
      articulos = articulos.filter(a => {
        // No tiene OC pendiente/enviada
        const tieneOC = a.detalleOrdenCompra?.some(detalle =>
          detalle.ordenCompra &&
          detalle.ordenCompra.estadoOrdenCompra &&
          ['Pendiente', 'Enviada'].includes(detalle.ordenCompra.estadoOrdenCompra.nombreEstadoOC)
        );
        // Lote fijo
        const cumpleLoteFijo = a.modeloInventarioLoteFijo &&
          a.modeloInventarioLoteFijo.puntoPedido != null &&
          a.cantArticulo <= a.modeloInventarioLoteFijo.puntoPedido;
        // Intervalo fijo
        const cumpleIntervaloFijo = a.modeloInventarioIntervaloFijo &&
          a.modeloInventarioIntervaloFijo.cantidadPedido != null &&
          a.cantArticulo <= a.modeloInventarioIntervaloFijo.cantidadPedido;
        return !tieneOC && (cumpleLoteFijo || cumpleIntervaloFijo);
      });
    } else if (filtro === 'stock-seguridad') {
      articulos = articulos.filter(a => {
        const cumpleLoteFijo = a.modeloInventarioLoteFijo &&
          a.modeloInventarioLoteFijo.stockSeguridadLF != null &&
          a.cantArticulo <= a.modeloInventarioLoteFijo.stockSeguridadLF;
        const cumpleIntervaloFijo = a.modeloInventarioIntervaloFijo &&
          a.modeloInventarioIntervaloFijo.stockSeguridadIF != null &&
          a.cantArticulo <= a.modeloInventarioIntervaloFijo.stockSeguridadIF;
        return cumpleLoteFijo || cumpleIntervaloFijo;
      });
    }

    res.status(200).json(articulos);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al obtener los artículos' });
  }
});

// GET /api/articulos/:id
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const articulo = await prisma.articulo.findUnique({
      where: { codArticulo: parseInt(id) },
      include: {
        modeloInventarioLoteFijo: true,
        modeloInventarioIntervaloFijo: true,
        proveedorPredeterminado: true,
        articuloProveedores: {
          include: { proveedor: true }
        },
        detalleOrdenCompra: {
          include: {
            ordenCompra: {
              include: { estadoOrdenCompra: true }
            }
          }
        }
      }
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
      let cgi = null;

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
                costoUnitarioAP: true, // 👈 nuevo campo para calcular CGI
              },
            },
          },
        });

        const relacion = proveedor?.articuloProveedores[0];

        if (relacion && relacion.cargoPedidoAP && relacion.demoraEntregaAP && relacion.costoUnitarioAP) {
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

          // Calcular CGI
          cgi = calcularCGI({
            demanda: Number(data.demanda),
            costoUnidad: Number(relacion.costoUnitarioAP),
            loteOptimo,
            costoPedido: Number(relacion.cargoPedidoAP),
            costoMantenimiento: Number(data.costoMantenimiento),
          });
        }
      }

      createData.cgi = cgi; // guardar CGI en el articulo

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
      let cgi = null;

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
        if (relacion && relacion.demoraEntregaAP && relacion.cargoPedidoAP && relacion.costoUnitarioAP) {
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

          // Calcular CGI para intervalo fijo
          cgi = calcularCGI({
            demanda: Number(data.demanda),
            costoUnidad: Number(relacion.costoUnitarioAP),
            loteOptimo: cantidadPedido > 0 ? cantidadPedido : 1,
            costoPedido: Number(relacion.cargoPedidoAP),
            costoMantenimiento: Number(data.costoMantenimiento),
          });
        }
      }
      createData.cgi = cgi;
      
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