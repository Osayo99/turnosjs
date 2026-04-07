const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UsuarioSchema = new mongoose.Schema({
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

    // --- CAMBIO IMPORTANTE: ESTRUCTURA DE PRIORIDADES ---
    // Antes: skills: ["PAGOS", "CONSULTAS"]
    // Ahora: skills: [{ tipo: "PAGOS", prioridad: 1 }, { tipo: "CONSULTAS", prioridad: 2 }]
    skills: [{
        tipo: { type: String, required: true },
        prioridad: { type: Number, default: 1 } // 1: Alta, 2: Media, 3: Baja
    }],

    // Campos de estado y sesión
    enLinea: { type: Boolean, default: false },
    socketId: { type: String },
    estado: { 
        type: String, 
        enum: ['disponible', 'ocupado', 'pausa', 'desconectado'], 
        default: 'desconectado' 
    },
    ticket: { type: mongoose.Schema.Types.ObjectId, ref: 'Ticket' }
});

// --- HOOK: Encriptar contraseña ---
UsuarioSchema.pre('save', async function() {
    if (!this.isModified('password')) return;
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
});

// --- MÉTODO: Comparar contraseña ---
UsuarioSchema.methods.compararPassword = async function(candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('Usuario', UsuarioSchema);