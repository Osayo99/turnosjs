// Rutas de autenticación y gestión de usuarios. Define endpoints de login, CRUD y migraciones con rate limiting.
const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const usuarioController = require('../controllers/usuarioController');
const { verificarToken, verificarRol } = require('../middleware/auth');

const loginLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 5,
    keyGenerator: (req) => {
        const username = req.body?.username || 'anon';
        const clientIp = req.ip;
        return `login_${username}_${clientIp}`;
    },
    message: { success: false, msg: 'Demasiados intentos. Espere un minuto antes de intentar de nuevo.' }
});

router.post('/login', loginLimiter, usuarioController.login);
router.post('/logout', usuarioController.logout);

router.post('/cambiar-password', verificarToken, usuarioController.cambiarPasswordPropio);

router.get('/sucursal/:sucursalId', verificarToken, verificarRol(['super_admin', 'jefe_sucursal']), usuarioController.listarPorSucursal);
router.post('/crear', verificarToken, verificarRol(['super_admin', 'jefe_sucursal']), usuarioController.crearUsuario);
router.put('/actualizar', verificarToken, verificarRol(['super_admin', 'jefe_sucursal']), usuarioController.actualizarUsuario);
router.put('/admin-reset-password', verificarToken, verificarRol(['super_admin', 'jefe_sucursal']), usuarioController.adminResetPassword);
router.delete('/:id', verificarToken, verificarRol(['super_admin', 'jefe_sucursal']), usuarioController.eliminarUsuarioJefe);

router.get('/migrar-seguridad', verificarToken, verificarRol(['super_admin']), usuarioController.migrarPasswords);
router.get('/migrar-skills', verificarToken, verificarRol(['super_admin']), usuarioController.migrarSkills);

module.exports = router;