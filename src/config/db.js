// Configuración de conexión a MongoDB con reintentos automáticos. Inicializa tareas programadas tras establecer la conexión.
const mongoose = require('mongoose');
const Sucursal = require('../models/Sucursal'); 
const { initCronJobs } = require('../services/cronService');

const MAX_RETRIES = parseInt(process.env.DB_MAX_RETRIES) || 3;
const RETRY_DELAY = parseInt(process.env.DB_RETRY_DELAY) || 3000;

const connectDB = async (retryCount = 0) => {
    try {
        const uri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/anda_turnos';
        await mongoose.connect(uri);
        console.log('MongoDB Conectado Exitosamente');
        initCronJobs();
    } catch (error) {
        console.error(`Error de conexión a MongoDB (intento ${retryCount + 1}/${MAX_RETRIES}):`, error.message);
        if (retryCount < MAX_RETRIES - 1) {
            console.log(`Reintentando en ${RETRY_DELAY / 1000}s...`);
            await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
            return connectDB(retryCount + 1);
        }
        console.error('No se pudo conectar a MongoDB después de varios intentos.');
        process.exit(1);
    }
};

module.exports = connectDB;