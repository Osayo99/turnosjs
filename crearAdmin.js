const mongoose = require('mongoose');
const Usuario = require('./src/models/Usuario');
const MONGO_URI = 'mongodb://127.0.0.1:27017/anda_turnos';

// Script para crear un super admin con username "admin" y password "123"
// Una vez creado el admin y con acceso a la interfaz, se recomienda cambiar la contraseña por una más segura.
// De ser posible tambien cambiar los valores a otros diferentes en este archivo

const crearSuperAdmin = async () => {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('✅ Conectado a MongoDB');
        const adminData = {
            nombre: "Administrador Principal",
            username: "superanda",      
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