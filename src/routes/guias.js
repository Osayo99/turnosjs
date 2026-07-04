// Rutas de guías de usuario. Expone consulta pública y administración restringida de guías.
const express = require('express');
const router = express.Router();
const guiaController = require('../controllers/guiaController');
const { verificarToken, verificarRol } = require('../middleware/auth');

router.get('/', guiaController.obtenerGuias);
router.post('/', verificarToken, verificarRol(['super_admin']), guiaController.crearGuia);
router.delete('/:id', verificarToken, verificarRol(['super_admin']), guiaController.eliminarGuia);
router.put('/:id', verificarToken, verificarRol(['super_admin']), guiaController.actualizarGuia);

module.exports = router;