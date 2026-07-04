// Controlador de administración global. Proporciona dashboard, auditoría por sucursal y gestión de usuarios para el super administrador.
const Usuario = require('../models/Usuario');
const Sucursal = require('../models/Sucursal');
const Ticket = require('../models/Ticket');
const mongoose = require('mongoose');

exports.getDataGlobal = async (req, res) => {
    try {
        const sucursales = await Sucursal.find({});
        const usuarios = await Usuario.find({}).populate('sucursal', 'nombre').select('-password');
        
        const startToday = new Date(); startToday.setHours(0,0,0,0);
        const ticketsHoy = await Ticket.countDocuments({ creadoEn: { $gte: startToday } });

        res.json({ sucursales, usuarios, ticketsHoy });
    } catch (e) { res.status(500).send('Error admin'); }
};

exports.detallesSucursal = async (req, res) => {
    try {
        const { sucursalId } = req.params;
        const { busqueda, fechaInicio, fechaFin } = req.query;

        let start = new Date();
        start.setHours(0,0,0,0);
        let end = new Date();
        end.setHours(23,59,59,999);

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

        const filtroBase = { 
            sucursal: sucursalId, 
            creadoEn: { $gte: start, $lte: end } 
        };

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
            const usuariosPorCodigo = await Usuario.find({ codigoEmpleado: regex }).select('_id').lean();
            if (usuariosPorCodigo.length > 0) {
                filtroRegistros.$or.push(
                    { ventanillaAtendio: { $in: usuariosPorCodigo.map(u => u._id) } }
                );
            }
        }

        const registros = await Ticket.find(filtroRegistros)
            .populate('ventanillaAtendio', 'nombre rol codigoEmpleado')
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

exports.eliminarUsuario = async (req, res) => {
    try {
        await Usuario.findByIdAndDelete(req.params.id);
        res.json({ success: true });
    } catch(e) { res.status(500).send('Error'); }
};

exports.crearUsuarioAdmin = async (req, res) => {
    try {
        const { nombre, username, password, sucursalId, rol, ventanilla, codigoEmpleado } = req.body;
        
        if (!/^\d{5}$/.test(codigoEmpleado)) {
            return res.status(400).json({ success: false, msg: 'El codigo de empleado debe ser numerico de 5 digitos (00001-99999)' });
        }
        const existe = await Usuario.findOne({ username });
        if(existe) return res.status(400).json({ success: false, msg: 'El usuario ya existe.' });

        const nuevo = new Usuario({
            codigoEmpleado,
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
        
        if (sheetId && !sheetId.startsWith('https://script.google.com/')) {
            return res.status(400).json({ success: false, msg: 'La URL de Google Sheets debe ser una URL válida de Google Apps Script (https://script.google.com/...).' });
        }

        await Sucursal.findByIdAndUpdate(sucursalId, {
            googleSheetId: sheetId,
            frecuenciaExportacion: frecuencia,
            ultimaExportacion: null
        });

        res.json({ success: true });
    } catch (e) { res.status(500).send('Error guardando configuración'); }
};

exports.editarUsuario = async (req, res) => {
    try {
        const { id, nombre, username, rol, sucursalId, codigoEmpleado } = req.body;
        
        if (!/^\d{5}$/.test(codigoEmpleado)) {
            return res.status(400).json({ success: false, msg: 'El codigo de empleado debe ser numerico de 5 digitos (00001-99999)' });
        }
        
        const existe = await Usuario.findOne({ username, _id: { $ne: id } });
        if(existe) return res.status(400).json({ success: false, msg: 'El nombre de usuario ya está en uso por otra persona.' });

        await Usuario.findByIdAndUpdate(id, {
            codigoEmpleado,
            nombre,
            username,
            rol,
            sucursal: sucursalId || null
        });

        res.json({ success: true, msg: 'Usuario actualizado correctamente.' });
    } catch(e) { 
        console.error(e);
        res.status(500).json({ success: false, msg: 'Error al actualizar usuario.' }); 
    }
};