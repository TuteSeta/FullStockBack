const { z } = require('zod');

const ventasSchema = z.object({
  articulos: z.array(
    z.object({
      codArticulo: z.number().int().positive(),
      cantidad: z.number().int().positive(),
    })
  ).min(1, "Debe incluir al menos un artículo en la venta.")
});

module.exports = { ventasSchema };