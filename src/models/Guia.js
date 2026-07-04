// Modelo Mongoose para guías de usuario del sistema. Almacena título, contenido y fecha de creación.
const mongoose = require('mongoose');

const GuiaSchema = new mongoose.Schema({
    titulo: { type: String, required: true },
    contenido: { type: String, required: true },
    creadoEn: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Guia', GuiaSchema);