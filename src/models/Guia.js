const mongoose = require('mongoose');

// Esquema para la colección de guías

const GuiaSchema = new mongoose.Schema({
    titulo: { type: String, required: true },
    contenido: { type: String, required: true },
    creadoEn: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Guia', GuiaSchema);