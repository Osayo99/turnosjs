const express = require('express');
const router = express.Router();
const ticketController = require('../controllers/ticketController');
const { verificarToken, verificarRol } = require('../middleware/auth');

router.post('/crear', ticketController.crearTicket);
router.get('/cola/:sucursalId', ticketController.obtenerCola);

const rolesOperacion = ['ventanilla', 'ejecutivo', 'jefe_sucursal', 'super_admin'];
router.post('/llamar', verificarToken, verificarRol(rolesOperacion), ticketController.llamarTicket);
router.post('/volver-llamar', verificarToken, verificarRol(rolesOperacion), ticketController.volverALlamar);
router.post('/finalizar', verificarToken, verificarRol(rolesOperacion), ticketController.finalizarTicket);
router.post('/derivar', verificarToken, verificarRol(rolesOperacion), ticketController.derivarTicket);
router.get('/activo/:usuarioId', verificarToken, verificarRol(rolesOperacion), ticketController.obtenerTicketActivo);

const rolesJefatura = ['jefe_sucursal', 'super_admin'];
router.get('/jefatura/:sucursalId', verificarToken, verificarRol(rolesJefatura), ticketController.infoJefatura);
router.post('/atender-derivado', verificarToken, verificarRol(['jefe_sucursal']), ticketController.atenderDerivado);
router.get('/historial/:sucursalId', verificarToken, verificarRol(rolesJefatura), ticketController.buscarHistorial);

module.exports = router;