const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');

router.get('/global-data', adminController.getDataGlobal);
router.get('/sucursal/:sucursalId', adminController.detallesSucursal); 
router.post('/eliminar-usuario', adminController.eliminarUsuario);
router.post('/crear-usuario', adminController.crearUsuarioAdmin); 
router.post('/config-export', adminController.configurarExportacion);
router.put('/editar-usuario', adminController.editarUsuario);

module.exports = router;