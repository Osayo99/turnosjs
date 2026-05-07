const Sucursal = require('../models/Sucursal');

// Controlador para la gestión de sucursales (Admin y Jefatura)

exports.crearSucursal = async (req, res) => {
    try {
        const { nombre, codigo, direccion } = req.body;
        
        const nuevaSucursal = new Sucursal({
            nombre,
            codigo,
            direccion
        });

        await nuevaSucursal.save();
        res.status(201).json(nuevaSucursal);
    } catch (error) {
        console.error(error);
        res.status(500).send('Error al crear sucursal');
    }
};

exports.obtenerSucursales = async (req, res) => {
    try {
        const sucursales = await Sucursal.find();
        res.json(sucursales);
    } catch (error) {
        res.status(500).send('Error al obtener sucursales');
    }
};

exports.obtenerSucursalPorId = async (req, res) => {
    try {
        const sucursal = await Sucursal.findById(req.params.id);
        if (!sucursal) return res.status(404).send('Sucursal no encontrada');
        res.json(sucursal);
    } catch (error) {
        res.status(500).send('Error');
    }
};

//Datos en vivo para Jefatura 
exports.obtenerEstadoJefatura = async (req, res) => {
    try {
        const { id } = req.params;
        const hoy = new Date();
        const inicioDia = new Date(hoy.setHours(0, 0, 0, 0));

        // 1. Estadísticas rápidas
        const total = await Ticket.countDocuments({ sucursal: id, creadoEn: { $gte: inicioDia } });
        const espera = await Ticket.countDocuments({ sucursal: id, estado: 'pendiente', creadoEn: { $gte: inicioDia } });
        const atendidos = await Ticket.countDocuments({ sucursal: id, estado: 'finalizado', creadoEn: { $gte: inicioDia } });
        const derivados = await Ticket.countDocuments({ sucursal: id, estado: 'derivado', creadoEn: { $gte: inicioDia } });

        // 2. Estado de Ventanillas (Usuarios Logueados)
        const usuarios = await Usuario.find({ 
            sucursal: id,
            rol: { $in: ['ventanilla', 'ejecutivo'] }
        }).populate('ticket');

        // Formatear para el frontend
        const ventanillas = usuarios.map(u => ({
            _id: u._id,
            nombre: u.nombre,
            numeroVentanilla: u.numeroVentanilla || '?',
            estado: u.estado,
            ticket: u.ticket ? {
                codigo: u.ticket.codigo,
                tipoTramite: u.ticket.tipoTramite,
                actualizadoEn: u.ticket.actualizadoEn || u.ticket.creadoEn
            } : null
        }));

        res.json({
            stats: { total, espera, atendidos, derivados },
            ventanillas
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ msg: 'Error obteniendo estado' });
    }
};

//Editar sucursal
exports.actualizarSucursal = async (req, res) => {
    try {
        const { nombre, codigo, direccion } = req.body;
        
        const sucursalActualizada = await Sucursal.findByIdAndUpdate(
            req.params.id,
            { nombre, codigo, direccion },
            { new: true }
        );

        if (!sucursalActualizada) {
            return res.status(404).json({ success: false, msg: 'Sucursal no encontrada' });
        }

        res.json({ success: true, sucursal: sucursalActualizada });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, msg: 'Error al actualizar la sucursal' });
    }
};

//Eliminar sucursal
exports.eliminarSucursal = async (req, res) => {
    try {
        const sucursalEliminada = await Sucursal.findByIdAndDelete(req.params.id);
        
        if (!sucursalEliminada) {
            return res.status(404).json({ success: false, msg: 'Sucursal no encontrada' });
        }

        res.json({ success: true, msg: 'Sucursal eliminada correctamente' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, msg: 'Error al eliminar la sucursal' });
    }
};