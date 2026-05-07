const mongoose = require('mongoose');

// Esquema para la colección de tickets

const TicketSchema = new mongoose.Schema({
    numero: { type: Number, required: true },
    letra: { type: String, required: true },
    codigo: { type: String }, 
    documentoCliente: { type: String },
    tipoTramite: { type: String, required: true },
    esPrioritario: { type: Boolean, default: false },
    condicionesEspeciales: [{ type: String }],
    estado: { 
        type: String, 
        enum: ['pendiente', 'llamando', 'atendiendo', 'derivado', 'finalizado', 'ausente'], 
        default: 'pendiente' 
    },
    sucursal: { type: mongoose.Schema.Types.ObjectId, ref: 'Sucursal', required: true },
    ventanillaAtendio: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario' },
    ventanillaNumero: { type: Number },
    creadoEn: { type: Date, default: Date.now },
    llamadoEn: { type: Date },
    inicioAtencionEn: { type: Date },
    finalizadoEn: { type: Date },
    tiempoTotalAtencion: { type: Number, default: 0 },
    notasAtencion: { type: String },
    motivoDerivacion: { type: String },
    derivadoPor: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario' }
});

// Índices de base de datos, para optimizar consultas frecuentes y reportes

// Índice para llamar al siguiente ticket de forma instantánea (Optimiza llamarTicket)
TicketSchema.index({ sucursal: 1, estado: 1, tipoTramite: 1, esPrioritario: -1, creadoEn: 1 });

// Índice para la generación del correlativo diario rápido (Optimiza crearTicket)
TicketSchema.index({ sucursal: 1, letra: 1, creadoEn: -1 });

// Índice para reportería y dashboards históricos (Optimiza exportarSucursal e infoJefatura)
TicketSchema.index({ sucursal: 1, estado: 1, creadoEn: -1 });

// Índice para recuperar la sesión activa de un ejecutivo en ventanilla
TicketSchema.index({ ventanillaAtendio: 1, estado: 1 });

module.exports = mongoose.model('Ticket', TicketSchema);