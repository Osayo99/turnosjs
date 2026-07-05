// Rutas de tickets del sistema de turnos. Expone creación, asignación, finalización y consultas con control de acceso.
const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const ticketController = require('../controllers/ticketController');
const { verificarToken, verificarRol } = require('../middleware/auth');

const crearTicketLimiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW),
    max: parseInt(process.env.RATE_LIMIT_MAX),
    message: { success: false, msg: 'Demasiadas solicitudes. Espere un momento antes de crear otro ticket.' }
});

router.post('/crear', crearTicketLimiter, ticketController.crearTicket);
router.get('/cola/:sucursalId', ticketController.obtenerCola);

const rolesOperacion = ['ventanilla', 'ejecutivo', 'jefe_sucursal', 'super_admin'];
router.post('/llamar', verificarToken, verificarRol(rolesOperacion), ticketController.llamarTicket);
router.post('/volver-llamar', verificarToken, verificarRol(rolesOperacion), ticketController.volverALlamar);
router.post('/finalizar', verificarToken, verificarRol(rolesOperacion), ticketController.finalizarTicket);
router.post('/ausente', verificarToken, verificarRol(rolesOperacion), ticketController.marcarAusente);
router.post('/derivar', verificarToken, verificarRol(rolesOperacion), ticketController.derivarTicket);
router.get('/activo/:usuarioId', verificarToken, verificarRol(rolesOperacion), ticketController.obtenerTicketActivo);

const rolesJefatura = ['jefe_sucursal', 'super_admin'];
router.get('/jefatura/:sucursalId', verificarToken, verificarRol(rolesJefatura), ticketController.infoJefatura);
router.post('/atender-derivado', verificarToken, verificarRol(['jefe_sucursal']), ticketController.atenderDerivado);
router.get('/historial/:sucursalId', verificarToken, verificarRol(rolesJefatura), ticketController.buscarHistorial);

module.exports = router;