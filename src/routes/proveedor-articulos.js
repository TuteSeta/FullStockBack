const express = require('express');
const router = express.Router();
const prisma = require('../prismaClient');
const { proveedorArticuloSchema } = require('../schemas/proveedorArticuloSchema');

// PUT /api/proveedor-articulos/:proveedorId/:articuloId
router.put('/:proveedorId/:articuloId', async (req, res) => {
    const { proveedorId, articuloId } = req.params;
    try {
        // Validamos y parseamos los datos del body
        const data = proveedorArticuloSchema.parse(req.body);

        const actualizado = await prisma.articuloProveedor.update({
            where: {
                codArticulo_codProveedor: {
                    codArticulo: parseInt(articuloId),
                    codProveedor: parseInt(proveedorId),
                },
            },
            data,
        });

        res.status(200).json(actualizado);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al actualizar artículo del proveedor' });
    }
});

// GET /api/proveedor-articulos/proveedor/:codProveedor
router.get('/proveedor/:codProveedor', async (req, res) => {
    const codProveedor = parseInt(req.params.codProveedor);

    try {
        const relaciones = await prisma.articuloProveedor.findMany({
            where: { codProveedor },
            include: {
                articulo: {
                    include: {
                        proveedorPredeterminado: {
                            select: {
                                codProveedor: true
                            }
                        }
                    }
                }
            }
        });


        res.status(200).json(relaciones);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al obtener los artículos del proveedor' });
    }
});

// GET /api/proveedor-articulos
router.get('/', async (req, res) => {
    try {
        const relaciones = await prisma.articuloProveedor.findMany({
            include: { proveedor: true, articulo: true },
        });
        res.status(200).json(relaciones);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al obtener relaciones proveedor-artículo' });
    }
});

// POST /api/proveedor-articulos
router.post('/', async (req, res, next) => {
    try {
        const data = proveedorArticuloSchema.parse(req.body);

        const nuevo = await prisma.articuloProveedor.create({ data });

        res.status(201).json(nuevo);
    } catch (error) {
        console.error(error);
        next(error);
    }
});

// DELETE /api/proveedor-articulos/:codProveedor/:codArticulo
router.delete('/:codProveedor/:codArticulo', async (req, res) => {
    const { codProveedor, codArticulo } = req.params;

    try {
        await prisma.articuloProveedor.delete({
            where: {
                codArticulo_codProveedor: {
                    codArticulo: parseInt(codArticulo),
                    codProveedor: parseInt(codProveedor),
                },
            },
        });

        res.status(204).send();
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al eliminar relación' });
    }
});

module.exports = router;
