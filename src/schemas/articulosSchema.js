const { z } = require('zod');
const { modeloInventarioLoteFijoSchema } = require('./modeloInventarioLoteFijoSchema');
const { modeloInventarioIntervaloFijoSchema } = require('./modeloInventarioIntervaloFijoSchema');

const articulosSchema = z.object({
  codArticulo: z.coerce.number().int().nonnegative().optional(),
  nombreArt: z.string().min(1),
  descripcion: z.string().min(1),
  demanda: z.coerce.number().int().nonnegative(),
  cantArticulo: z.coerce.number().int().nonnegative(),
  cantMaxArticulo: z.coerce.number().int().nonnegative(),
  costoAlmacenamiento: z.coerce.number().nonnegative(),
  costoMantenimiento: z.coerce.number().nonnegative(),
  costoPedido: z.coerce.number().nonnegative(),
  costoCompra: z.coerce.number().nonnegative(),
  desviacionDemandaLArticulo: z.coerce.number().nonnegative(),
  desviacionDemandaTArticulo: z.coerce.number().nonnegative(),
  nivelServicioDeseado: z.coerce.number().nonnegative(),
  modeloInventarioLoteFijo: modeloInventarioLoteFijoSchema.optional(),
  modeloInventarioIntervaloFijo: modeloInventarioIntervaloFijoSchema.optional(),
});

module.exports = { articulosSchema };
