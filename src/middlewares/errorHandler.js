module.exports.errorHandler = (err, req, res, next) => {
  console.error('--- ERROR DETECTADO ---');
  console.error('Mensaje:', err.message);
  console.error('Nombre:', err.name);
  if (err.stack) console.error('Stack trace:\n', err.stack);

  // Zod validation error
  if (err.name === 'ZodError') {
    return res.status(400).json({
      error: 'Error de validación',
      detalles: err.errors,
    });
  }

  // Prisma: Error por campo único duplicado (como clave primaria o unique)
  if (err.code === 'P2002') {
    return res.status(409).json({
      error: 'Dato duplicado',
      campo: err.meta?.target,
      mensaje: `Ya existe un valor con ese campo único.`,
    });
  }

  // Prisma: Error de conexión, base caída, etc.
  if (err.code === 'ECONNREFUSED') {
    return res.status(503).json({
      error: 'Base de datos no disponible',
      mensaje: 'No se pudo conectar con la base de datos.',
    });
  }

  // Otros errores personalizados (si usás clases AppError, por ejemplo)
  if (err.status && err.message) {
    return res.status(err.status).json({ mensaje: err.message });
  }

  // Fallback general
  res.status(500).json({ error: 'Error interno del servidor' });
};