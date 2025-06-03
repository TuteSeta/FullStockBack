// schemas/proveedorArticuloSchema.js
const { z } = require('zod');

const proveedorArticuloSchema = z.object({
  codProveedor: z.number().int(),
  codArticulo: z.number().int(),
   cargoPedidoAP: z.number().nonnegative(), // ya no es .int()
  demoraEntregaAP: z.number().int(),       // esto puede quedar int si son días
  precioUnitarioAP: z.number().nonnegative()
});

module.exports = { proveedorArticuloSchema };
