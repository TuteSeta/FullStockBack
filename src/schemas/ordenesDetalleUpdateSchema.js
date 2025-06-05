const { z } = require('zod');

const ordenesDetalleUpdateSchema = z.object({
  nuevaCantidad: z.number().int().positive("La cantidad debe ser mayor a 0"),
});

module.exports = { ordenesDetalleUpdateSchema };