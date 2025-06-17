// schemas/proveedorArticuloSchema.js
const { z } = require('zod');

const proveedorArticuloSchema = z.object({
  codProveedor: z.number().int(),
  codArticulo: z.number().int(),
  cargoPedidoAP: z.number().nonnegative(), 
  demoraEntregaAP: z.number().int(),       
  costoUnitarioAP: z.number().nonnegative()
});

module.exports = { proveedorArticuloSchema };
