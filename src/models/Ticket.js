// Modelo Mongoose para tickets de atención al cliente. Define flujo de estados, índices y relaciones con sucursales y usuarios.
const mongoose = require('mongoose');

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

TicketSchema.index({ sucursal: 1, estado: 1, tipoTramite: 1, esPrioritario: -1, creadoEn: 1 });
TicketSchema.index({ sucursal: 1, letra: 1, creadoEn: -1 });
TicketSchema.index({ sucursal: 1, estado: 1, creadoEn: -1 });
TicketSchema.index({ ventanillaAtendio: 1, estado: 1 });

module.exports = mongoose.model('Ticket', TicketSchema);