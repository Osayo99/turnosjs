const Usuario = require('../models/Usuario');
const Sucursal = require('../models/Sucursal');
const Ticket = require('../models/Ticket');
const mongoose = require('mongoose');

// 1. DATA GLOBAL (Para mostrar en el dashboard del admin)
exports.getDataGlobal = async (req, res) => {
    try {
        const sucursales = await Sucursal.find({});
        // Traemos usuarios con su sucursal para mostrar en el dashboard del admin
        const usuarios = await Usuario.find({}).populate('sucursal', 'nombre');
        
        // Stats globales del dia (para mostrar en el dashboard del admin)
        const startToday = new Date(); startToday.setHours(0,0,0,0);
        const ticketsHoy = await Ticket.countDocuments({ creadoEn: { $gte: startToday } });

        res.json({ sucursales, usuarios, ticketsHoy });
    } catch (e) { res.status(500).send('Error admin'); }
};

// 2. DETALLES DE SUCURSAL (Vista de Auditoría + Buscador)
exports.detallesSucursal = async (req, res) => {
    try {
        const { sucursalId } = req.params;
        const { busqueda, fechaInicio, fechaFin } = req.query;

        // 1. Configurar Rango de Fechas
        // Por defecto: HOY (00:00:00 a 23:59:59)
        let start = new Date();
        start.setHours(0,0,0,0);
        let end = new Date();
        end.setHours(23,59,59,999);

        // Si el admin selecciona fechas, las usamos para filtrar (cubrimos todo el día seleccionado)
        if (fechaInicio) {
            // Nota: Al recibir "YYYY-MM-DD", JS lo interpreta en UTC o Local según navegador.
            // Para asegurar cobertura completa del día, forzamos horas.
            const parts = fechaInicio.split('-');
            start = new Date(parts[0], parts[1]-1, parts[2]);
            start.setHours(0,0,0,0);
        }
        
        if (fechaFin) {
            const parts = fechaFin.split('-');
            end = new Date(parts[0], parts[1]-1, parts[2]);
            end.setHours(23,59,59,999);
        }

        // Filtro Base (Sucursal + Rango Fecha)
        const filtroBase = { 
            sucursal: sucursalId, 
            creadoEn: { $gte: start, $lte: end } 
        };

        // 2. Calcular Estadística, respetando el rango de fecha seleccionado.
        const total = await Ticket.countDocuments(filtroBase);
        
        const atendidos = await Ticket.countDocuments({ 
            ...filtroBase, 
            estado: 'finalizado' 
        });
        
        const atendidosJefatura = await Ticket.countDocuments({ 
            ...filtroBase,
            estado: 'finalizado',
            motivoDerivacion: { $exists: true, $ne: null } 
        });

        // 3. Buscar Registros de cualquier tipo en la tabla.
        let filtroRegistros = { ...filtroBase };

        if (busqueda) {
            const regex = new RegExp(busqueda, 'i');
            filtroRegistros.$or = [
                { codigo: regex },
                { documentoCliente: regex },
                { tipoTramite: regex },
                { notasAtencion: regex },
                { motivoDerivacion: regex }
            ];
        }

        const registros = await Ticket.find(filtroRegistros)
            .populate('ventanillaAtendio', 'nombre rol')
            .populate('derivadoPor', 'nombre')
            .sort({ creadoEn: -1 })
            .limit(500);

        res.json({ 
            stats: { total, atendidos, atendidosJefatura },
            registros 
        });

    } catch (e) { 
        console.error(e);
        res.status(500).send('Error detalles'); 
    }
};

// 3. ELIMINAR USUARIO
exports.eliminarUsuario = async (req, res) => {
    try {
        await Usuario.findByIdAndDelete(req.body.id);
        res.json({ success: true });
    } catch(e) { res.status(500).send('Error'); }
};

// 4. CREAR USUARIO (Para que el SuperAdmin cree Jefes de Sucrusales)
exports.crearUsuarioAdmin = async (req, res) => {
    try {
        const { nombre, username, password, sucursalId, rol, ventanilla } = req.body;
        const existe = await Usuario.findOne({ username });
        if(existe) return res.status(400).json({ success: false, msg: 'El usuario ya existe.' });

        const nuevo = new Usuario({
            nombre, 
            username, 
            password, 
            sucursal: sucursalId, 
            rol, 
            numeroVentanilla: ventanilla || 0,
            skills: [
                { tipo: 'CONSULTAS', prioridad: 1 },
                { tipo: 'PAGOS', prioridad: 1 },
                { tipo: 'RECLAMOS', prioridad: 1 },
                { tipo: 'NUEVOS', prioridad: 1 }
            ]
        });
        
        await nuevo.save();
        res.json({ success: true, msg: 'Jefe creado exitosamente.' });
    } catch(e) { 
        res.status(500).json({ success: false, msg: 'Error en el servidor: ' + e.message }); 
    }
};

exports.configurarExportacion = async (req, res) => {
    try {
        const { sucursalId, sheetId, frecuencia } = req.body;
        
        await Sucursal.findByIdAndUpdate(sucursalId, {
            googleSheetId: sheetId,
            frecuenciaExportacion: frecuencia
        });

        res.json({ success: true });
    } catch (e) { res.status(500).send('Error guardando configuración'); }
};

// 5. EDITAR USUARIO
exports.editarUsuario = async (req, res) => {
    try {
        const { id, nombre, username, rol, sucursalId } = req.body;
        
        // Verificar si el nuevo username ya le pertenece a OTRO usuario distinto
        const existe = await Usuario.findOne({ username, _id: { $ne: id } });
        if(existe) return res.status(400).json({ success: false, msg: 'El nombre de usuario ya está en uso por otra persona.' });

        await Usuario.findByIdAndUpdate(id, {
            nombre,
            username,
            rol,
            sucursal: sucursalId || null // Si no elige sucursal, queda como global (null)
        });

        res.json({ success: true, msg: 'Usuario actualizado correctamente.' });
    } catch(e) { 
        console.error(e);
        res.status(500).json({ success: false, msg: 'Error al actualizar usuario.' }); 
    }
};