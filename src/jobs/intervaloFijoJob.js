const cron = require('node-cron');
const prisma = require('../prismaClient');
const { calcularModeloIntervaloFijo } = require('../utils/inventario');

// Corre todos los días a las 2 AM
cron.schedule('54 20 * * *', async () => {
  console.log('⏰ Revisión automática de artículos con modelo de intervalo fijo...');

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
              cantidadDOC: resultado.cantidadPedido,
              montoDOC: montoDOC,
            }]
          }
        }
      });
      console.log(`✔️ Orden de compra creada para artículo ${articulo.nombreArt} (cantidad: ${resultado.cantidadPedido})`);
    }
  }
});