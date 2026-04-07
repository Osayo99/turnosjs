const mongoose = require('mongoose');
const Usuario = require('./src/models/Usuario'); // Asegúrate que la ruta al modelo sea correcta

// Configuración directa para este script (O usa dotenv si prefieres)
const MONGO_URI = 'mongodb://127.0.0.1:27017/anda_turnos';

const crearSuperAdmin = async () => {
    try {
        // 1. Conectar a la Base de Datos
        await mongoose.connect(MONGO_URI);
        console.log('✅ Conectado a MongoDB');

        // 2. Datos del Super Admin
        const adminData = {
            nombre: "Administrador Principal",
            username: "admin",      // <--- Tu usuario para entrar
            password: "123",        // <--- Tu contraseña
            rol: "super_admin",
            sucursal: null          // El super admin no pertenece a ninguna sucursal específica
        };

        // 3. Verificar si ya existe para no duplicar
        const existe = await Usuario.findOne({ username: adminData.username });
        if (existe) {
            console.log('⚠️ El usuario '+ adminData.username + ' ya existe. No se creó nada.');
        } else {
            // 4. Crear y Guardar
            const nuevoAdmin = new Usuario(adminData);
            await nuevoAdmin.save();
            console.log('🎉 ¡Super Admin creado con éxito!');
            console.log('👤 Usuario: ' + adminData.username);
            console.log('🔑 Clave: ' + adminData.password);
        }

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        // 5. Cerrar conexión
        mongoose.connection.close();
    }
};

crearSuperAdmin();