// Rutas de sucursales. Expone consulta pública y administración protegida de sucursales.
const express = require('express');
const router = express.Router();
const sucursalController = require('../controllers/sucursalController');
const { verificarToken, verificarRol } = require('../middleware/auth');

router.get('/', sucursalController.obtenerSucursales);
router.get('/:id', sucursalController.obtenerSucursalPorId);
router.get('/:id/estado-completo', verificarToken, verificarRol(['jefe_sucursal', 'super_admin']), sucursalController.obtenerEstadoJefatura);
router.post('/', verificarToken, verificarRol(['super_admin']), sucursalController.crearSucursal);
router.put('/:id', verificarToken, verificarRol(['super_admin']), sucursalController.actualizarSucursal);
router.delete('/:id', verificarToken, verificarRol(['super_admin']), sucursalController.eliminarSucursal);

module.exports = router;