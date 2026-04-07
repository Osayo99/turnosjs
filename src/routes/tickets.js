const express = require('express');
const router = express.Router();
const ticketController = require('../controllers/ticketController');

router.post('/crear', ticketController.crearTicket);
router.post('/llamar', ticketController.llamarTicket);
router.post('/volver-llamar', ticketController.volverALlamar);
router.post('/finalizar', ticketController.finalizarTicket);
router.post('/derivar', ticketController.derivarTicket);
router.get('/cola/:sucursalId', ticketController.obtenerCola);
router.get('/activo/:usuarioId', ticketController.obtenerTicketActivo);

// Rutas Jefatura
router.get('/jefatura/:sucursalId', ticketController.infoJefatura);
router.post('/atender-derivado', ticketController.atenderDerivado);
router.get('/historial/:sucursalId', ticketController.buscarHistorial);

module.exports = router;