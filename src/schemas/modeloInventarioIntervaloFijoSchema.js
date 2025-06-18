const { z } = require('zod');

const modeloInventarioIntervaloFijoSchema = z.object({
    intervaloTiempo: z.coerce.number().int().nonnegative(),
    inventarioMaximo: z.coerce.number().int().nonnegative(),
    stockSeguridadIF: z.coerce.number().int().nonnegative(),
});
module.exports = { modeloInventarioIntervaloFijoSchema };