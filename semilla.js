const mongoose = require('mongoose');
const Sucursal = require('./src/models/Sucursal');
const Usuario = require('./src/models/Usuario');
require('dotenv').config();

const importarDatos = async () => {
    try {
        // Conectar directo para el script
        await mongoose.connect('mongodb://127.0.0.1:27017/anda_turnos');
        console.log('Conectado a Mongo para sembrar datos...');

        // Limpiar DB previa
        await Sucursal.deleteMany();
        await Usuario.deleteMany();

        // 1. Crear Sucursal
        const agencia = await Sucursal.create({
            codigo: 'SUC-001',
            nombre: 'Agencia Central - Metrosur',
            direccion: 'San Salvador'
        });
        
        console.log(`✅ Sucursal Creada: ${agencia.nombre} (ID: ${agencia._id})`);

        // 2. Crear un Usuario Ventanilla
        await Usuario.create({
            username: 'j.lopez',
            password: '123',
            nombre: 'Juan Lopez',
            rol: 'ventanilla',
            sucursal: agencia._id,
            numeroVentanilla: 1,
            skills: ['PAGOS', 'CONSULTAS']
        });

        console.log('✅ Usuario de prueba creado');
        process.exit();

    } catch (error) {
        console.error(error);
        process.exit(1);
    }
};

importarDatos();