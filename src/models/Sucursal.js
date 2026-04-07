const mongoose = require('mongoose');

const SucursalSchema = new mongoose.Schema({
    nombre: { type: String, required: true },
    codigo: { type: String, required: true },
    direccion: { type: String },
    videoUrl: { type: String },
    
    // --- NUEVO: CONFIGURACIÓN EXPORTACIÓN ---
    googleSheetId: { type: String, default: '' }, // AQUÍ guardaremos la URL del Webhook
    frecuenciaExportacion: { 
        type: String, 
        enum: ['none', '1h', '24h', '7d', '5m'], 
        default: 'none' 
    },
    ultimaExportacion: { type: Date, default: null } // Para no repetir tickets
});

module.exports = mongoose.model('Sucursal', SucursalSchema);