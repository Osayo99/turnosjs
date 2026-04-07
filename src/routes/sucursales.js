const express = require('express');
const router = express.Router();
const sucursalController = require('../controllers/sucursalController');

// GET /api/sucursales (Listar)
router.get('/', sucursalController.obtenerSucursales);

// GET /api/sucursales:id (Listar)
router.get('/:id', sucursalController.obtenerSucursalPorId);

// POST /api/sucursales (Crear)
router.post('/', sucursalController.crearSucursal);

// PUT /api/sucursales/:id (Editar) -> ¡NUEVA!
router.put('/:id', sucursalController.actualizarSucursal);

// DELETE /api/sucursales/:id (Eliminar) -> ¡NUEVA!
router.delete('/:id', sucursalController.eliminarSucursal);

router.get('/:id/estado-completo', sucursalController.obtenerEstadoJefatura);

module.exports = router;