const { z } = require('zod');

const ventaDetalleUpdateSchema = z.object({
  nuevaCantidad: z.number().int().positive("La cantidad debe ser mayor a 0"),
});

module.exports = { ventaDetalleUpdateSchema };