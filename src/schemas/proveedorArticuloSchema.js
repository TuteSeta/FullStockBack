// schemas/proveedorArticuloSchema.js
const { z } = require('zod');

const proveedorArticuloSchema = z.object({
  codProveedor: z.number().int(),
  codArticulo: z.number().int(),
  cargoPedidoAP: z.number().int(),
  demoraEntregaAP: z.number().int(),
  precioUnitarioAP: z.number().int()
});

module.exports = { proveedorArticuloSchema };
