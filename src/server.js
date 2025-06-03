const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
// Configurar CORS de forma flexible
app.use(cors({ origin: process.env.CORS_ORIGIN || '*', }));

app.use(express.json());

// Rutas
const articulosRoute = require('./routes/articulos');
const proveedoresRoute = require('./routes/proveedores');
const proveedorArticulosRoute = require('./routes/proveedor-articulos');
const ventasRoutes = require('./routes/ventas');
const ventasDetalleRoute = require('./routes/venta-detalle');
const ordenesRoute = require('./routes/ordenes');
const ordenesDetalleRoute = require('./routes/ordenes-detalle');

app.use('/api/articulos', articulosRoute);
app.use('/api/proveedores', proveedoresRoute);
app.use('/api/proveedor-articulos', proveedorArticulosRoute);
app.use('/api/ventas', ventasRoutes);
app.use('/api/venta-detalle', ventasDetalleRoute);
app.use('/api/ordenes', ordenesRoute);
app.use('/api/ordenes-detalle', ordenesDetalleRoute);

// Middleware para manejar errores
const { errorHandler } = require('./middlewares/errorHandler');
app.use(errorHandler);


const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Servidor backend escuchando en el puerto ${PORT}`);
});
