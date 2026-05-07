const Ticket = require('../models/Ticket');
const Sucursal = require('../models/Sucursal');
const Usuario = require('../models/Usuario');
const mongoose = require('mongoose');

// Controlador para la gestión de tickets (Ventanilla, Jefatura y Auditoría de tickets históricos)

// CREAR TICKET (Kiosco)
exports.crearTicket = async (req, res) => {
    try {
        const { sucursalId, tipoTramite, documento, condiciones } = req.body;

        const sucursal = await Sucursal.findById(sucursalId);
        if (!sucursal) return res.status(404).json({ success: false, msg: 'Sucursal no encontrada' });

        const mapaLetras = { 'PAGOS': 'G', 'CONSULTAS': 'C', 'RECLAMOS': 'R', 'NUEVOS': 'N' };
        const letra = mapaLetras[tipoTramite] || 'A';

        const startToday = new Date();
        startToday.setHours(0,0,0,0);
        
        const ultimoTicket = await Ticket.findOne({ 
            sucursal: sucursalId,
            letra: letra,
            creadoEn: { $gte: startToday }
        }).sort({ creadoEn: -1 });

        const nuevoNumero = ultimoTicket ? ultimoTicket.numero + 1 : 1;
        const esPrioritario = condiciones && condiciones.length > 0;

        const nuevoTicket = new Ticket({
            numero: nuevoNumero,
            letra: letra,
            codigo: `${letra}-${nuevoNumero}`,
            tipoTramite,
            documentoCliente: documento,
            sucursal: sucursalId,
            estado: 'pendiente',
            esPrioritario: esPrioritario,
            condicionesEspeciales: condiciones || []
        });

        await nuevoTicket.save();

        const io = req.app.get('io');
        if (io) io.to(sucursalId).emit('cola_actualizada', nuevoTicket);

        res.status(201).json({ success: true, ticket: nuevoTicket });

    } catch (error) { 
        console.error(error);
        res.status(500).json({ success: false, msg: 'Error interno al crear el ticket' }); 
    }
};

// LLAMAR SIGUIENTE
exports.llamarTicket = async (req, res) => {
    const { usuarioId, sucursalId, ventanilla } = req.body;

    try {
        const usuario = await Usuario.findById(usuarioId).lean();
        if (!usuario) {
            return res.status(404).json({ success: false, msg: 'Usuario no encontrado' });
        }

        const ticketActivo = await Ticket.findOne({
            ventanillaAtendio: usuarioId,
            estado: 'atendiendo'
        });

        if (ticketActivo) {
            return res.json({ success: true, ticket: ticketActivo, msg: 'Sesión restaurada.', restored: true });
        }

        if (!usuario.skills || usuario.skills.length === 0) {
            return res.json({ success: false, msg: 'No tienes habilidades asignadas para atender tickets.' });
        }

        const skillsOrdenadas = usuario.skills.sort((a, b) => a.prioridad - b.prioridad);
        const prioridadesUnicas = [...new Set(skillsOrdenadas.map(s => s.prioridad))];
        
        let siguienteTicket = null;
        const now = new Date();

        for (const nivelPrioridad of prioridadesUnicas) {
            const tiposDeEsteNivel = skillsOrdenadas.filter(s => s.prioridad === nivelPrioridad).map(s => s.tipo);
            siguienteTicket = await Ticket.findOneAndUpdate(
                { sucursal: sucursalId, estado: 'pendiente', tipoTramite: { $in: tiposDeEsteNivel } },
                { estado: 'atendiendo', ventanillaAtendio: usuarioId, llamadoEn: now, actualizadoEn: now, ventanillaNumero: ventanilla },
                { sort: { esPrioritario: -1, creadoEn: 1 }, new: true } 
            );

            if (siguienteTicket) break; 
        }

        if (!siguienteTicket) {
            return res.json({ success: false, msg: 'No hay tickets pendientes para tu perfil.' });
        }

        await Usuario.findByIdAndUpdate(usuarioId, {
            estado: 'ocupado',
            ticket: siguienteTicket._id,
            numeroVentanilla: ventanilla
        });

        const io = req.app.get('io');
        if(io) {
            io.to(sucursalId).emit('ticket_llamado', siguienteTicket);
            io.to(sucursalId).emit('cola_actualizada');
        }

        res.json({ success: true, ticket: siguienteTicket });

    } catch (error) {
        console.error("Error en llamarTicket:", error);
        res.status(500).json({ success: false, msg: 'Error de concurrencia al llamar ticket' });
    }
};

// RE-LLAMAR
exports.volverALlamar = async (req, res) => {
    try {
        const { sucursalId, usuarioId } = req.body;
        const ticketActual = await Ticket.findOne({
            sucursal: sucursalId,
            ventanillaAtendio: usuarioId,
            estado: { $in: ['llamando', 'atendiendo'] }
        }).sort({ llamadoEn: -1 });

        if (!ticketActual) return res.status(404).json({ success: false, msg: 'No tienes ticket activo.' });

        const io = req.app.get('io');
        if (io) io.to(sucursalId).emit('ticket_llamado', ticketActual);

        res.json({ success: true, ticket: ticketActual });
    } catch (error) { 
        console.error(error);
        res.status(500).json({ success: false, msg: 'Error al volver a llamar' }); 
    }
};

// FINALIZAR o LIBERAR USUARIO
exports.finalizarTicket = async (req, res) => {
    try {
        const { ticketId, notas, tiempoTotal } = req.body;
        
        const ticket = await Ticket.findByIdAndUpdate(ticketId, {
            estado: 'finalizado',
            finalizadoEn: new Date(),
            notasAtencion: notas,
            tiempoTotalAtencion: tiempoTotal
        }, { new: true });
        
        if (!ticket) return res.status(404).json({ success: false, msg: 'Ticket no encontrado' });

        await Usuario.findByIdAndUpdate(ticket.ventanillaAtendio, {
            estado: 'disponible',
            ticket: null
        });
        
        const io = req.app.get('io');
        if (io) io.to(ticket.sucursal.toString()).emit('ticket_finalizado', { ticketId });
        
        res.json({ success: true });
    } catch (e) { 
        console.error(e);
        res.status(500).json({ success: false, msg: 'Error al finalizar ticket' }); 
    }
};

// DERIVAR y/o LIBERAR USUARIO)
exports.derivarTicket = async (req, res) => {
    try {
        const { ticketId, motivo, usuarioId } = req.body;
        const ticket = await Ticket.findByIdAndUpdate(ticketId, {
            estado: 'derivado',
            motivoDerivacion: motivo,
            derivadoPor: usuarioId,
            ventanillaAtendio: null 
        }, { new: true });

        if (!ticket) return res.status(404).json({ success: false, msg: 'Ticket no encontrado' });

        await Usuario.findByIdAndUpdate(usuarioId, {
            estado: 'disponible',
            ticket: null
        });

        const io = req.app.get('io');
        if (io) io.to(ticket.sucursal.toString()).emit('cola_actualizada', {});

        res.json({ success: true });
    } catch (e) { 
        console.error(e);
        res.status(500).json({ success: false, msg: 'Error al derivar ticket' }); 
    }
};

// OBTENER COLA
exports.obtenerCola = async (req, res) => {
    try {
        const { sucursalId } = req.params;
        const cola = await Ticket.find({ sucursal: sucursalId, estado: 'pendiente' })
            .sort({ esPrioritario: -1, creadoEn: 1 });
        res.json(cola);
    } catch (e) { 
        console.error(e);
        res.status(500).json({ success: false, msg: 'Error obteniendo la cola' }); 
    }
};

// --- JEFATURA ---

exports.infoJefatura = async (req, res) => {
    try {
        const { sucursalId } = req.params;
        const startToday = new Date();
        startToday.setHours(0,0,0,0);

        const total = await Ticket.countDocuments({ sucursal: sucursalId, creadoEn: { $gte: startToday } });
        const atendidos = await Ticket.countDocuments({ sucursal: sucursalId, estado: 'finalizado', creadoEn: { $gte: startToday } });
        const derivados = await Ticket.countDocuments({ sucursal: sucursalId, estado: 'derivado', creadoEn: { $gte: startToday } });
        const pendientes = await Ticket.countDocuments({ sucursal: sucursalId, estado: 'pendiente' });

        const conteoPorTipo = await Ticket.aggregate([
            { $match: { sucursal: new mongoose.Types.ObjectId(sucursalId), estado: 'finalizado', creadoEn: { $gte: startToday } } },
            { $group: { _id: "$tipoTramite", count: { $sum: 1 } } }
        ]);

        const ejecutivos = await Usuario.find({ 
            sucursal: sucursalId, 
            numeroVentanilla: { $gt: 0 } 
        }).select('nombre numeroVentanilla username');
        
        const ticketsActivos = await Ticket.find({ 
            sucursal: sucursalId, 
            estado: { $in: ['llamando', 'atendiendo'] } 
        });

        const estadoVentanillas = ejecutivos.map(ejec => {
            const ticket = ticketsActivos.find(t => t.ventanillaAtendio?.toString() === ejec._id.toString());
            return {
                nombre: ejec.nombre,
                numero: ejec.numeroVentanilla,
                ticket: ticket ? { 
                    codigo: ticket.codigo, 
                    tipo: ticket.tipoTramite, 
                    inicio: ticket.llamadoEn || ticket.actualizadoEn || ticket.creadoEn
                } : null,
                estado: ticket ? 'ocupado' : 'libre'
            };
        });

        estadoVentanillas.sort((a, b) => a.numero - b.numero);

        const colaEspera = await Ticket.find({ sucursal: sucursalId, estado: 'pendiente' })
            .sort({ esPrioritario: -1, creadoEn: 1 }).limit(10);

        const colaDerivados = await Ticket.find({ sucursal: sucursalId, estado: 'derivado' })
            .populate('derivadoPor', 'nombre ventanillaNumero')
            .sort({ creadoEn: 1 });

        const historial = await Ticket.find({ sucursal: sucursalId, estado: 'finalizado', creadoEn: { $gte: startToday } })
            .populate('ventanillaAtendio', 'nombre')
            .sort({ finalizadoEn: -1 }).limit(5);

        res.json({ 
            stats: { total, atendidos, derivados, pendientes }, 
            conteoPorTipo,
            estadoVentanillas,
            colaEspera,
            colaDerivados, 
            historial 
        });

    } catch (e) { 
        console.error(e);
        res.status(500).json({ success: false, msg: 'Error obteniendo métricas' }); 
    }
};

exports.atenderDerivado = async (req, res) => {
    try {
        const { ticketId, usuarioId } = req.body;
        
        const jefe = await Usuario.findById(usuarioId);
        if (!jefe) return res.status(404).json({ success: false, msg: 'Usuario no encontrado' });

        const ticket = await Ticket.findByIdAndUpdate(ticketId, {
            estado: 'atendiendo',
            ventanillaAtendio: usuarioId,
            llamadoEn: new Date()
        }, { new: true });

        const respuesta = { 
            ...ticket.toObject(), 
            ventanillaNumero: jefe.numeroVentanilla || 0 
        };

        const io = req.app.get('io');
        if (io) io.to(ticket.sucursal.toString()).emit('ticket_llamado', respuesta);

        res.json({ success: true, ticket: respuesta });
    } catch (e) { 
        console.error(e);
        res.status(500).json({ success: false, msg: 'Error al atender derivado' }); 
    }
};

exports.buscarHistorial = async (req, res) => {
    try {
        const { sucursalId } = req.params;
        const { busqueda, fechaInicio, fechaFin } = req.query;

        let start = new Date(); start.setHours(0,0,0,0);
        let end = new Date(); end.setHours(23,59,59,999);

        if (fechaInicio) {
            const parts = fechaInicio.split('-');
            start = new Date(parts[0], parts[1]-1, parts[2]); 
            start.setHours(0,0,0,0);
        }
        if (fechaFin) {
            const parts = fechaFin.split('-');
            end = new Date(parts[0], parts[1]-1, parts[2]);
            end.setHours(23,59,59,999);
        }

        let filtro = { 
            sucursal: sucursalId, 
            creadoEn: { $gte: start, $lte: end } 
        };

        if (busqueda) {
            const regex = new RegExp(busqueda, 'i');
            filtro.$or = [
                { codigo: regex },
                { documentoCliente: regex },
                { tipoTramite: regex },
                { notasAtencion: regex },
                { motivoDerivacion: regex }
            ];
        }

        const registros = await Ticket.find(filtro)
            .populate('ventanillaAtendio', 'nombre rol')
            .populate('derivadoPor', 'nombre')
            .sort({ creadoEn: -1 })
            .limit(200);

        res.json(registros);

    } catch (e) { 
        console.error(e);
        res.status(500).json({ success: false, msg: 'Error en el buscador histórico' }); 
    }
};

exports.obtenerTicketActivo = async (req, res) => {
    try {
        const { usuarioId } = req.params;
        const ticket = await Ticket.findOne({ 
            ventanillaAtendio: usuarioId, 
            estado: 'atendiendo' 
        });

        if (ticket) {
            return res.json({ success: true, ticket });
        } else {
            return res.json({ success: false });
        }
    } catch (error) {
        console.error("Error al buscar ticket activo:", error);
        res.status(500).json({ success: false, msg: 'Error de servidor' });
    }
};