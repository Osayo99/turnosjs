// Modelo Mongoose para sucursales. Define campos de identificación, exportación a Google Sheets y video institucional.
const mongoose = require('mongoose');

const SucursalSchema = new mongoose.Schema({
    nombre: { type: String, required: true },
    codigo: { type: String, required: true },
    direccion: { type: String },
    videoUrl: { type: String },
    googleSheetId: { type: String, default: '' },
    frecuenciaExportacion: { 
        type: String, 
        enum: ['none', '1m', '5m', '1h', '24h', '7d'], 
        default: 'none' 
    },
    ultimaExportacion: { type: Date, default: null }
});

module.exports = mongoose.model('Sucursal', SucursalSchema);