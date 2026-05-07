const express = require('express');
const router = express.Router();
const usuarioController = require('../controllers/usuarioController');
const { verificarToken, verificarRol } = require('../middleware/auth');

router.post('/login', usuarioController.login);
router.post('/logout', usuarioController.logout);

router.post('/cambiar-password', verificarToken, usuarioController.cambiarPasswordPropio);

router.get('/sucursal/:sucursalId', verificarToken, verificarRol(['super_admin', 'jefe_sucursal']), usuarioController.listarPorSucursal);
router.post('/crear', verificarToken, verificarRol(['super_admin', 'jefe_sucursal']), usuarioController.crearUsuario);
router.post('/actualizar', verificarToken, verificarRol(['super_admin', 'jefe_sucursal']), usuarioController.actualizarUsuario);
router.post('/admin-reset-password', verificarToken, verificarRol(['super_admin', 'jefe_sucursal']), usuarioController.adminResetPassword);
router.delete('/:id', verificarToken, verificarRol(['super_admin', 'jefe_sucursal']), usuarioController.eliminarUsuarioJefe);

router.get('/migrar-seguridad', verificarToken, verificarRol(['super_admin']), usuarioController.migrarPasswords);
router.get('/migrar-skills', verificarToken, verificarRol(['super_admin']), usuarioController.migrarSkills);

module.exports = router;