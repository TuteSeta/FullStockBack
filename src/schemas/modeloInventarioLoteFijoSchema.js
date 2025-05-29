const { z } = require('zod');

const modeloInventarioLoteFijoSchema = z.object({
    loteOptimo: z.coerce.number().int().nonnegative(),
    puntoPedido: z.coerce.number().int().nonnegative(),
    stockSeguridadLF: z.coerce.number().int().nonnegative(),
});

module.exports = { modeloInventarioLoteFijoSchema };