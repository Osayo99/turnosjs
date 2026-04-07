const mongoose = require('mongoose');

const TicketSchema = new mongoose.Schema({
    // Datos Básicos
    numero: { type: Number, required: true },
    letra: { type: String, required: true },
    codigo: { type: String }, 
    documentoCliente: { type: String },
    tipoTramite: { type: String, required: true },
    
    // --- NUEVO: Prioridades ---
    esPrioritario: { type: Boolean, default: false },
    condicionesEspeciales: [{ type: String }], // Ej: ['EMBARAZADA']

    // Estado
    estado: { 
        type: String, 
        enum: ['pendiente', 'llamando', 'atendiendo', 'derivado', 'finalizado', 'ausente'], 
        default: 'pendiente' 
    },

    sucursal: { type: mongoose.Schema.Types.ObjectId, ref: 'Sucursal', required: true },
    
    // --- NUEVO: Gestión de Atención ---
    ventanillaAtendio: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario' },
    ventanillaNumero: { type: Number },
    
    // Tiempos
    creadoEn: { type: Date, default: Date.now },
    llamadoEn: { type: Date },
    inicioAtencionEn: { type: Date }, // Para el timer
    finalizadoEn: { type: Date },
    tiempoTotalAtencion: { type: Number, default: 0 }, // Segundos
    
    // Datos Extra
    notasAtencion: { type: String },
    motivoDerivacion: { type: String },
    derivadoPor: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario' }
});

module.exports = mongoose.model('Ticket', TicketSchema);