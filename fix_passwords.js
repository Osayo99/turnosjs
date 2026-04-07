const mongoose = require('mongoose');
const Usuario = require('./src/models/Usuario');
require('dotenv').config();

const arreglar = async () => {
    try {
        await mongoose.connect('mongodb://127.0.0.1:27017/anda_turnos');
        console.log('Conectado a DB...');

        // Buscar usuarios sin contraseña o con contraseña vacía
        const usuarios = await Usuario.find({ 
            $or: [{ password: { $exists: false } }, { password: "" }] 
        });

        console.log(`Encontrados ${usuarios.length} usuarios sin clave.`);

        for (const u of usuarios) {
            u.password = '1234'; // Clave por defecto
            // Si no tiene rol, lo hacemos ejecutivo
            if (!u.rol) u.rol = 'ejecutivo';
            await u.save();
            console.log(`✅ Usuario ${u.username} actualizado.`);
        }

        console.log('Proceso terminado.');
        process.exit();
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
};

arreglar();