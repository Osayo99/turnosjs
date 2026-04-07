const Guia = require('../models/Guia');

// Para el Super Admin (Crear)
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

// Para el Super Admin (Borrar)
exports.eliminarGuia = async (req, res) => {
    try {
        await Guia.findByIdAndDelete(req.params.id);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false });
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

// NUEVA FUNCIÓN: Actualizar
exports.actualizarGuia = async (req, res) => {
    try {
        const { titulo, contenido } = req.body;
        const guiaActualizada = await Guia.findByIdAndUpdate(
            req.params.id, 
            { titulo, contenido },
            { new: true } // Para que devuelva el objeto ya editado
        );
        res.json({ success: true, guia: guiaActualizada });
    } catch (error) {
        res.status(500).json({ success: false, msg: 'Error al actualizar' });
    }
};