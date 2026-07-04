// Modelo Mongoose para usuarios del sistema. Incluye autenticación con bcrypt, roles y habilidades para asignación de tickets.
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UsuarioSchema = new mongoose.Schema({
    codigoEmpleado: { 
        type: String, 
        required: true, 
        unique: true,
        match: [/^\d{5}$/, 'El codigo de empleado debe ser numerico de 5 digitos (00001-99999)']
    },
    nombre: { type: String, required: true },
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    
    sucursal: { type: mongoose.Schema.Types.ObjectId, ref: 'Sucursal' }, 

    rol: { 
        type: String, 
        enum: ['ejecutivo', 'jefe_sucursal', 'super_admin', 'ventanilla'], 
        default: 'ejecutivo' 
    },
    
    numeroVentanilla: { type: Number, default: 0 },

    skills: [{
        tipo: { type: String, required: true },
        prioridad: { type: Number, default: 1 }
    }],

    enLinea: { type: Boolean, default: false },
    socketId: { type: String },
    estado: { 
        type: String, 
        enum: ['disponible', 'ocupado', 'pausa', 'desconectado'], 
        default: 'desconectado' 
    },
    ticket: { type: mongoose.Schema.Types.ObjectId, ref: 'Ticket' }
});

UsuarioSchema.pre('save', async function() {
    if (!this.isModified('password')) return;
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
});

UsuarioSchema.methods.compararPassword = async function(candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('Usuario', UsuarioSchema);