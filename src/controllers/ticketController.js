const Ticket = require('../models/Ticket');
const Sucursal = require('../models/Sucursal');
const Usuario = require('../models/Usuario');
const mongoose = require('mongoose');

// CREAR TICKET (Kiosco)
exports.crearTicket = async (req, res) => {
    try {
        const { sucursalId, tipoTramite, documento, condiciones } = req.body;

        const sucursal = await Sucursal.findById(sucursalId);
        if (!sucursal) return res.status(404).json({ msg: 'Sucursal no encontrada' });

        const mapaLetras = { 'PAGOS': 'G', 'CONSULTAS': 'C', 'RECLAMOS': 'R', 'NUEVOS': 'N' };
        const letra = mapaLetras[tipoTramite] || 'A';

        // Consecutivo Diario
        const startToday = new Date();
        startToday.setHours(0,0,0,0);
        
        const ultimoTicket = await Ticket.findOne({ 
            sucursal: sucursalId,
            creadoEn: { $gte: startToday },
            letra: letra
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

        // --- CORRECCIÓN: USAR 'io' ---
        const io = req.app.get('io');
        io.to(sucursalId).emit('cola_actualizada', nuevoTicket);

        res.status(201).json({ success: true, ticket: nuevoTicket });

    } catch (error) { res.status(500).send('Error servidor'); }
};

// LLAMAR SIGUIENTE (INTELIGENTE CON PRIORIDADES DINÁMICAS)
exports.llamarTicket = async (req, res) => {
    const { usuarioId, sucursalId, ventanilla } = req.body;

    try {
        // 1. OBTENER USUARIO Y SUS SKILLS
        const usuario = await Usuario.findById(usuarioId).lean();
        if (!usuario) return res.status(404).json({ success: false, msg: 'Usuario no encontrado' });

        // CANDADO DE SEGURIDAD (Si ya tiene uno activo, devolverlo)
        const ticketActivo = await Ticket.findOne({
            ventanillaAtendio: usuarioId,
            estado: 'atendiendo'
        });

        if (ticketActivo) {
            return res.json({ 
                success: true, 
                ticket: ticketActivo,
                msg: 'Sesión restaurada.',
                restored: true 
            });
        }

        // 2. CONSTRUIR ESTRATEGIA DE BÚSQUEDA
        if (!usuario.skills || usuario.skills.length === 0) {
            return res.json({ success: false, msg: 'No tienes habilidades asignadas para atender tickets.' });
        }

        const skillsOrdenadas = usuario.skills.sort((a, b) => a.prioridad - b.prioridad);
        const prioridadesUnicas = [...new Set(skillsOrdenadas.map(s => s.prioridad))];
        
        let siguienteTicket = null;
        const now = new Date();

        // 3. BUSCAR TICKETS NIVEL POR NIVEL
        for (const nivelPrioridad of prioridadesUnicas) {
            
            const tiposDeEsteNivel = skillsOrdenadas
                .filter(s => s.prioridad === nivelPrioridad)
                .map(s => s.tipo);

            // Buscamos y actualizamos atómicamente
            siguienteTicket = await Ticket.findOneAndUpdate(
                { 
                    sucursal: sucursalId, 
                    estado: 'pendiente',
                    tipoTramite: { $in: tiposDeEsteNivel } 
                },
                { 
                    estado: 'atendiendo',
                    ventanillaAtendio: usuarioId,
                    llamadoEn: now,      
                    actualizadoEn: now,
                    // GUARDAMOS EL NÚMERO DE VENTANILLA PARA EL MONITOR
                    ventanillaNumero: ventanilla 
                },
                { sort: { esPrioritario: -1, creadoEn: 1 }, new: true } 
            );

            if (siguienteTicket) {
                break; 
            }
        }

        // 4. RESPUESTA FINAL
        if (!siguienteTicket) {
            return res.json({ success: false, msg: 'No hay tickets pendientes para tu perfil.' });
        }

        // Actualizar estado del usuario a Ocupado
        await Usuario.findByIdAndUpdate(usuarioId, {
            estado: 'ocupado',
            ticket: siguienteTicket._id,
            numeroVentanilla: ventanilla
        });

        // --- CORRECCIÓN: USAR 'io' Y ENVIAR AL SOCKET ---
        const io = req.app.get('io');
        if(io) {
            io.to(sucursalId).emit('ticket_llamado', siguienteTicket);
            io.to(sucursalId).emit('cola_actualizada');
        }

        res.json({ success: true, ticket: siguienteTicket });

    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, msg: 'Error al llamar ticket' });
    }
};

// RE-LLAMAR (Ventanilla)
exports.volverALlamar = async (req, res) => {
    try {
        const { sucursalId, usuarioId } = req.body;
        const ticketActual = await Ticket.findOne({
            sucursal: sucursalId,
            ventanillaAtendio: usuarioId,
            estado: { $in: ['llamando', 'atendiendo'] }
        }).sort({ llamadoEn: -1 });

        if (!ticketActual) return res.status(404).json({ success: false, msg: 'No tienes ticket activo.' });

        // --- CORRECCIÓN: USAR 'io' ---
        const io = req.app.get('io');
        io.to(sucursalId).emit('ticket_llamado', ticketActual);

        res.json({ success: true, ticket: ticketActual });
    } catch (error) { res.status(500).send('Error'); }
};

// FINALIZAR (Ventanilla)
exports.finalizarTicket = async (req, res) => {
    try {
        const { ticketId, notas, tiempoTotal } = req.body;
        const ticket = await Ticket.findByIdAndUpdate(ticketId, {
            estado: 'finalizado',
            finalizadoEn: new Date(),
            notasAtencion: notas,
            tiempoTotalAtencion: tiempoTotal
        });
        
        // --- CORRECCIÓN: USAR 'io' ---
        // Avisar a Jefatura para actualizar gráficas
        const io = req.app.get('io');
        io.to(ticket.sucursal.toString()).emit('ticket_finalizado', { ticketId });
        
        res.json({ success: true });
    } catch (e) { res.status(500).send('Error'); }
};

// DERIVAR (Ventanilla -> Jefe)
exports.derivarTicket = async (req, res) => {
    try {
        const { ticketId, motivo, usuarioId } = req.body;
        const ticket = await Ticket.findByIdAndUpdate(ticketId, {
            estado: 'derivado',
            motivoDerivacion: motivo,
            derivadoPor: usuarioId,
            ventanillaAtendio: null 
        });

        // --- CORRECCIÓN: USAR 'io' ---
        // Avisar a Jefatura que llegó uno nuevo
        const io = req.app.get('io');
        io.to(ticket.sucursal.toString()).emit('cola_actualizada', {});

        res.json({ success: true });
    } catch (e) { res.status(500).send('Error'); }
};

// OBTENER COLA (Monitor)
exports.obtenerCola = async (req, res) => {
    try {
        const { sucursalId } = req.params;
        const cola = await Ticket.find({ sucursal: sucursalId, estado: 'pendiente' })
            .sort({ esPrioritario: -1, creadoEn: 1 });
        res.json(cola);
    } catch (e) { res.status(500).send('Error'); }
};

// --- JEFATURA ---

// INFO DASHBOARD JEFE
exports.infoJefatura = async (req, res) => {
    try {
        const { sucursalId } = req.params;
        const startToday = new Date();
        startToday.setHours(0,0,0,0);

        // 1. Estadísticas
        const total = await Ticket.countDocuments({ sucursal: sucursalId, creadoEn: { $gte: startToday } });
        const atendidos = await Ticket.countDocuments({ sucursal: sucursalId, estado: 'finalizado', creadoEn: { $gte: startToday } });
        const derivados = await Ticket.countDocuments({ sucursal: sucursalId, estado: 'derivado', creadoEn: { $gte: startToday } });
        const pendientes = await Ticket.countDocuments({ sucursal: sucursalId, estado: 'pendiente' });

        // 2. Gráfica
        const conteoPorTipo = await Ticket.aggregate([
            { $match: { sucursal: new mongoose.Types.ObjectId(sucursalId), estado: 'finalizado', creadoEn: { $gte: startToday } } },
            { $group: { _id: "$tipoTramite", count: { $sum: 1 } } }
        ]);

        // 3. MONITOR DE VENTANILLAS
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

        // 4. Colas
        const colaEspera = await Ticket.find({ sucursal: sucursalId, estado: 'pendiente' })
            .sort({ esPrioritario: -1, creadoEn: 1 }).limit(10);

        const colaDerivados = await Ticket.find({ sucursal: sucursalId, estado: 'derivado' })
            .populate('derivadoPor', 'nombre ventanillaNumero')
            .sort({ modificadoEn: 1 });

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
        res.status(500).send('Error stats'); 
    }
};

// JEFE LLAMA TICKET
exports.atenderDerivado = async (req, res) => {
    try {
        const { ticketId, usuarioId } = req.body;
        
        const jefe = await Usuario.findById(usuarioId);
        if (!jefe) return res.status(404).json({ msg: 'Usuario no encontrado' });

        const ticket = await Ticket.findByIdAndUpdate(ticketId, {
            estado: 'atendiendo',
            ventanillaAtendio: usuarioId,
            llamadoEn: new Date()
        }, { new: true });

        const respuesta = { 
            ...ticket.toObject(), 
            ventanillaNumero: jefe.numeroVentanilla || 0 
        };

        // --- CORRECCIÓN: USAR 'io' ---
        const io = req.app.get('io');
        io.to(ticket.sucursal.toString()).emit('ticket_llamado', respuesta);

        res.json({ success: true, ticket: respuesta });
    } catch (e) { 
        console.error(e);
        res.status(500).send('Error'); 
    }
};

// BUSCADOR HISTÓRICO
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
        res.status(500).send('Error historial'); 
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