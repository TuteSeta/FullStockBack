const { z } = require('zod');

const ventaSchema = z.object({
  codArticulo: z.string(),
  cantidad: z.number().int().positive(),
  montoTotalVenta: z.number().positive()
});

module.exports = { ventaSchema };

