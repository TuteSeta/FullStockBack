const cron = require('node-cron');
const prisma = require('../prismaClient');
const { calcularModeloIntervaloFijo } = require('../utils/inventario');

// Corre todos los días a las 2 AM (o más seguido si querés mayor precisión)
cron.schedule('08 17 * * *', async () => {
  console.log('⏰ Revisión automática de artículos con modelo de intervalo fijo...');

  const ahora = new Date();

  // Trae todos los artículos con modelo de intervalo fijo y proveedor predeterminado
  const articulos = await prisma.articulo.findMany({
    where: {
      modeloInventarioIntervaloFijo: { isNot: null },
      proveedorPredeterminado: { isNot: null }
    },
    include: {
      modeloInventarioIntervaloFijo: true,
      proveedorPredeterminado: true,
      articuloProveedores: true
    },
  });

  for (const articulo of articulos) {
    const modelo = articulo.modeloInventarioIntervaloFijo;
    const proveedor = articulo.proveedorPredeterminado;
    const intervaloDias = Number(modelo.intervaloTiempo);

    // Calcular días desde la última revisión
    const ultima = articulo.ultimaRevision ? new Date(articulo.ultimaRevision) : null;
    const diasDesdeUltima = ultima ? (ahora - ultima) / (1000 * 60 * 60 * 24) : Infinity;

    // Solo revisar si nunca se revisó o si pasaron al menos intervaloDias
    if (diasDesdeUltima < intervaloDias) {
        console.log(
            `(Intervalo Fijo) No se creó la orden de compra para "${articulo.nombreArt}" porque la última revisión fue el ${articulo.ultimaRevision ? new Date(articulo.ultimaRevision).toLocaleString() : 'nunca'}. Su intervalo de revisión es de ${intervaloDias} días.`
        );
        continue;
    }

    // Buscar la relación proveedor-artículo para obtener la demora de entrega
    const relacion = articulo.articuloProveedores.find(
      ap => ap.codProveedor === proveedor.codProveedor
    );
    if (!relacion) continue;

    // Calcular la cantidad a pedir
    const resultado = calcularModeloIntervaloFijo({
      demanda: Number(articulo.demanda),
      desviacionDemanda: Number(articulo.desviacionDemandaTArticulo),
      nivelServicioDeseado: Number(articulo.nivelServicioDeseado),
      intervaloTiempo: Number(modelo.intervaloTiempo),
      demoraEntrega: Number(relacion.demoraEntregaAP),
      inventarioActual: Number(articulo.cantArticulo)
    });

    // Si hay que pedir, crear la orden de compra (y evitar duplicados)
    if (resultado.cantidadPedido > 0) {
      // Verificar si ya hay una OC pendiente para este artículo y proveedor
      const existeOC = await prisma.ordenCompra.findFirst({
        where: {
          codProveedor: proveedor.codProveedor,
          estadoOrdenCompra: { nombreEstadoOC: 'Pendiente' },
          detalleOrdenCompra: {
            some: { codArticulo: articulo.codArticulo }
          }
        }
      });
      if (existeOC) {
        console.log(`Ya existe OC pendiente para ${articulo.nombreArt}, no se crea otra.`);
        // Igual actualizamos la fecha de revisión para evitar múltiples intentos
        await prisma.articulo.update({
          where: { codArticulo: articulo.codArticulo },
          data: { ultimaRevision: ahora }
        });
        continue;
      }

      const costoUnitario = Number(relacion.costoUnitarioAP) || 0;
      const cantidad = resultado.cantidadPedido;
      const montoDOC = cantidad * costoUnitario;

      // Crear la orden de compra
      await prisma.ordenCompra.create({
        data: {
          montoOrdenCompra: montoDOC,
          proveedor: { connect: { codProveedor: proveedor.codProveedor } },
          estadoOrdenCompra: { connect: { codEstadoOrdenCompra: 1 } }, // Pendiente
          detalleOrdenCompra: {
            create: [{
              codArticulo: articulo.codArticulo,
              cantidadDOC: cantidad,
              montoDOC: montoDOC,
            }]
          }
        }
      });
      console.log(`✔️ (Intervalo Fijo) Orden de compra creada para artículo ${articulo.nombreArt} (cantidad: ${cantidad})`);
    }

    // Actualizar la fecha de última revisión
    await prisma.articulo.update({
      where: { codArticulo: articulo.codArticulo },
      data: { ultimaRevision: ahora }
    });
  }

   

// Ahora revisa artículos con modelo de lote fijo
const articulosLoteFijo = await prisma.articulo.findMany({
  where: {
    modeloInventarioLoteFijo: { isNot: null },
    proveedorPredeterminado: { isNot: null }
  },
  include: {
    modeloInventarioLoteFijo: true,
    proveedorPredeterminado: true,
    articuloProveedores: true
  },
});

for (const articulo of articulosLoteFijo) {
  const modelo = articulo.modeloInventarioLoteFijo;
  const proveedor = articulo.proveedorPredeterminado;

  // Buscar la relación proveedor-artículo para obtener el costo unitario
  const relacion = articulo.articuloProveedores.find(
    ap => ap.codProveedor === proveedor.codProveedor
  );
  if (!relacion) continue;

  // Si la cantidad actual es menor o igual al punto de pedido, crear OC
  if (articulo.cantArticulo <= modelo.puntoPedido) {
    // Verificar si ya hay una OC pendiente para este artículo y proveedor
    const existeOC = await prisma.ordenCompra.findFirst({
      where: {
        codProveedor: proveedor.codProveedor,
        estadoOrdenCompra: { nombreEstadoOC: 'Pendiente' },
        detalleOrdenCompra: {
          some: { codArticulo: articulo.codArticulo }
        }
      }
    });
    if (existeOC) {
      console.log(`(Lote Fijo) Ya existe OC pendiente para ${articulo.nombreArt}, no se crea otra.`);
      continue;
    }

    const costoUnitario = Number(relacion.costoUnitarioAP) || 0;
    const cantidad = modelo.loteOptimo;
    const montoDOC = cantidad * costoUnitario;

    await prisma.ordenCompra.create({
      data: {
        montoOrdenCompra: montoDOC,
        proveedor: { connect: { codProveedor: proveedor.codProveedor } },
        estadoOrdenCompra: { connect: { codEstadoOrdenCompra: 1 } }, // Pendiente
        detalleOrdenCompra: {
          create: [{
            codArticulo: articulo.codArticulo,
            cantidadDOC: cantidad,
            montoDOC: montoDOC,
          }]
        }
      }
    });
    console.log(`✔️ (Lote Fijo) Orden de compra creada para artículo ${articulo.nombreArt} (cantidad: ${cantidad})`);
  } else {
    console.log(
      `(Lote Fijo) No se creó la orden de compra para "${articulo.nombreArt}" porque la cantidad actual (${articulo.cantArticulo}) es mayor que el punto de pedido (${modelo.puntoPedido}).`
    );
  }
 }
});