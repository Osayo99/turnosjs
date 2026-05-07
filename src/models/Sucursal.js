const mongoose = require('mongoose');

// Esquema para la colección de sucursales

const SucursalSchema = new mongoose.Schema({
    nombre: { type: String, required: true },
    codigo: { type: String, required: true },
    direccion: { type: String },
    videoUrl: { type: String },
    googleSheetId: { type: String, default: '' },
    frecuenciaExportacion: { 
        type: String, 
        enum: ['none', '1h', '24h', '7d', '5m'], 
        default: 'none' 
    },
    ultimaExportacion: { type: Date, default: null }
});

module.exports = mongoose.model('Sucursal', SucursalSchema);