const mongoose = require('mongoose');
const Sucursal = require('../models/Sucursal'); 
const { initCronJobs } = require('../services/cronService');

const connectDB = async () => {
    try {
        // Conexión local a MongoDB. Si no existe la DB 'anda_turnos', Mongo la crea sola.
        await mongoose.connect('mongodb://127.0.0.1:27017/anda_turnos');
        console.log('✅ MongoDB Conectado Exitosamente');
        initCronJobs();
    } catch (error) {
        console.error('❌ Error de conexión a MongoDB:', error);
        process.exit(1); // Detener la app si no hay base de datos
    }
};

module.exports = connectDB;