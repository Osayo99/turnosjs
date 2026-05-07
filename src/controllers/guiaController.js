const Guia = require('../models/Guia');

// Controlador para la gestión de guías de usuario (Super Admin y Ventanilla)

// Para el Super Admin (Crear una guia)
exports.crearGuia = async (req, res) => {
    try {
        const { titulo, contenido } = req.body;
        const nuevaGuia = new Guia({ titulo, contenido });
        await nuevaGuia.save();
        res.json({ success: true, guia: nuevaGuia });
    } catch (error) {
        res.status(500).json({ success: false, msg: 'Error al crear guía' });
    }
};

// Para el Super Admin (Borrar una guia)
exports.eliminarGuia = async (req, res) => {
    try {
        await Guia.findByIdAndDelete(req.params.id);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false });
    }
};

// Para el Super Admin (Actualizar una guia)
exports.actualizarGuia = async (req, res) => {
    try {
        const { titulo, contenido } = req.body;
        const guiaActualizada = await Guia.findByIdAndUpdate(
            req.params.id, 
            { titulo, contenido },
            { new: true }
        );
        res.json({ success: true, guia: guiaActualizada });
    } catch (error) {
        res.status(500).json({ success: false, msg: 'Error al actualizar' });
    }
};

// Para Ventanilla y Admin (Leer todas)
exports.obtenerGuias = async (req, res) => {
    try {
        const guias = await Guia.find().sort({ creadoEn: -1 });
        res.json(guias);
    } catch (error) {
        res.status(500).send('Error obteniendo guias');
    }
};
