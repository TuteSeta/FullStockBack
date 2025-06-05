const { z } = require('zod');

const ordenesSchema = z.object({
  codProveedor: z.number().int().positive(),
  detalleOC: z.array(
    z.object({
      codArticulo: z.number().int().positive(),
      cantidadDOC: z.number().int().positive(),
    })
  ).min(1)
});

module.exports = { ordenesSchema };