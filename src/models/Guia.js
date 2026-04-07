const mongoose = require('mongoose');

const GuiaSchema = new mongoose.Schema({
    titulo: { type: String, required: true },
    contenido: { type: String, required: true }, // El "tutorial" o paso a paso
    creadoEn: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Guia', GuiaSchema);