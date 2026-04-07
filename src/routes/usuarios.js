const express = require('express');
const router = express.Router();
const usuarioController = require('../controllers/usuarioController');

router.post('/login', usuarioController.login);
router.post('/crear', usuarioController.crearUsuario);
router.get('/sucursal/:sucursalId', usuarioController.listarPorSucursal);
router.post('/cambiar-password', usuarioController.cambiarPasswordPropio);
router.post('/admin-reset-password', usuarioController.adminResetPassword);
router.post('/actualizar', usuarioController.actualizarUsuario);
router.get('/migrar-seguridad', usuarioController.migrarPasswords);
router.get('/migrar-skills', usuarioController.migrarSkills);
router.delete('/:id', usuarioController.eliminarUsuarioJefe);

module.exports = router;