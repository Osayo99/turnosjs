const mongoose = require('mongoose');
const Ticket = require('./src/models/Ticket'); // Asegúrate que la ruta sea correcta
require('dotenv').config();

const limpiar = async () => {
    try {
        // Conexión
        await mongoose.connect('mongodb://127.0.0.1:27017/anda_turnos');
        console.log('🧹 Conectado a la Base de Datos...');

        // 1. Buscar tickets "pegados" (Cualquiera que NO esté finalizado)
        const filtro = { estado: { $ne: 'finalizado' } };
        
        const ticketsSucios = await Ticket.find(filtro);
        console.log(`🔍 Se encontraron ${ticketsSucios.length} tickets activos/pegados.`);

        if (ticketsSucios.length > 0) {
            // 2. Actualizar masivamente
            const resultado = await Ticket.updateMany(
                filtro, 
                { 
                    $set: { 
                        estado: 'finalizado',
                        finalizadoEn: new Date(),
                        notasAtencion: 'Cierre automático por limpieza de sistema.'
                    } 
                }
            );
            console.log(`✅ Se finalizaron forzosamente ${resultado.modifiedCount} tickets.`);
        } else {
            console.log('✨ El sistema ya estaba limpio.');
        }

        console.log('Tablero reseteado. Los agentes ahora aparecerán DISPONIBLES.');
        process.exit();

    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
};

limpiar();