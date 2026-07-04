const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { verificarToken, verificarRol } = require('../middleware/auth');

router.get('/global-data', verificarToken, verificarRol(['super_admin']), adminController.getDataGlobal);
router.get('/sucursal/:sucursalId', verificarToken, verificarRol(['super_admin']), adminController.detallesSucursal); 
router.post('/crear-usuario', verificarToken, verificarRol(['super_admin']), adminController.crearUsuarioAdmin); 
router.put('/editar-usuario', verificarToken, verificarRol(['super_admin']), adminController.editarUsuario);
router.delete('/eliminar-usuario/:id', verificarToken, verificarRol(['super_admin']), adminController.eliminarUsuario);
router.post('/config-export', verificarToken, verificarRol(['super_admin']), adminController.configurarExportacion);

module.exports = router;