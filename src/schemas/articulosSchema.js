const { z } = require('zod');
const { modeloInventarioLoteFijoSchema } = require('./modeloInventarioLoteFijoSchema');
const { modeloInventarioIntervaloFijoSchema } = require('./modeloInventarioIntervaloFijoSchema');

const articulosSchema = z.object({
  codArticulo: z.coerce.number().int().nonnegative().optional(),
  nombreArt: z.string().min(1),
  descripcion: z.string().min(1),
  demanda: z.coerce.number().int().nonnegative(),
  precioArticulo: z.coerce.number().int().nonnegative(),
  cantArticulo: z.coerce.number().int().nonnegative(),
  costoMantenimiento: z.coerce.number().nonnegative(),
  desviacionDemandaLArticulo: z.coerce.number().nonnegative(),
  desviacionDemandaTArticulo: z.coerce.number().nonnegative(),
  nivelServicioDeseado: z.coerce.number().min(0).max(1),
  modeloInventarioLoteFijo: z.preprocess(
    (val) =>
      val === undefined || val === null || (typeof val === 'object' && Object.keys(val).length === 0)
        ? undefined
        : val,
    modeloInventarioLoteFijoSchema.optional()
  ),
  modeloInventarioIntervaloFijo: modeloInventarioIntervaloFijoSchema.optional(),
  codProveedorPredeterminado: z.coerce.number().int().nonnegative().optional(),
});

module.exports = { articulosSchema };
