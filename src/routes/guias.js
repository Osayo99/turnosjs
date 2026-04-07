const express = require('express');
const router = express.Router();
const guiaController = require('../controllers/guiaController');

router.get('/', guiaController.obtenerGuias);
router.post('/', guiaController.crearGuia);
router.delete('/:id', guiaController.eliminarGuia);
router.put('/:id', guiaController.actualizarGuia);

module.exports = router;