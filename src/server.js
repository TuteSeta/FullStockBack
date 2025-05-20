const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// Rutas
const articulosRoute = require('./routes/articulos');
app.use('/api/articulos', articulosRoute);

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Servidor backend escuchando en el puerto ${PORT}`);
});
