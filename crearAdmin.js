const mongoose = require('mongoose');
const Usuario = require('./src/models/Usuario');
const MONGO_URI = 'mongodb://127.0.0.1:27017/anda_turnos';

const crearSuperAdmin = async () => {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('✅ Conectado a MongoDB');
        const adminData = {
            nombre: "Administrador Principal",
            username: "admin",      
            password: "123",        
            rol: "super_admin",
            sucursal: null 
        };
        const existe = await Usuario.findOne({ username: adminData.username });
        if (existe) {
            console.log('⚠️ El usuario '+ adminData.username + ' ya existe. No se creó nada.');
        } else {
            const nuevoAdmin = new Usuario(adminData);
            await nuevoAdmin.save();
            console.log('🎉 ¡Super Admin creado con éxito!');
            console.log('👤 Usuario: ' + adminData.username);
            console.log('🔑 Clave: ' + adminData.password);
        }

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        mongoose.connection.close();
    }
};

crearSuperAdmin();