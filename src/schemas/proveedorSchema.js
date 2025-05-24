const { z } = require('zod');

const proveedorSchema = z.object({
nombreProveedor: z.string().min(1)
});

module.exports = { proveedorSchema };

