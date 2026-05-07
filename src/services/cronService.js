const cron = require('node-cron');
const Sucursal = require('../models/Sucursal');
const { exportarSucursal } = require('./googleSheetService');

const initCronJobs = () => {
    console.log('⏰ Sistema de exportación automática INICIADO');

    // TAREA 1: CADA HORA
    cron.schedule('0 * * * *', async () => {
        const sucursales = await Sucursal.find({ frecuenciaExportacion: '1h' });
        if(sucursales.length > 0) console.log(`⏰ Ejecutando reporte horario (${sucursales.length} sucursales)...`);
        for (const s of sucursales) await exportarSucursal(s._id);
    });

    // TAREA 2: DIARIA (11:00 PM)
    cron.schedule('0 23 * * *', async () => {
        const sucursales = await Sucursal.find({ frecuenciaExportacion: '24h' });
        if(sucursales.length > 0) console.log(`⏰ Ejecutando reporte diario...`);
        for (const s of sucursales) await exportarSucursal(s._id);
    });

    // TAREA 3: SEMANAL (Domingos 11:00 PM)
    cron.schedule('0 23 * * 0', async () => {
        const sucursales = await Sucursal.find({ frecuenciaExportacion: '7d' });
        for (const s of sucursales) await exportarSucursal(s._id);
    });

    // TAREA 4: 5 MINUTOS (Para pruebas y monitoreo rápido)
    cron.schedule('*/5 * * * *', async () => {
        const sucursales = await Sucursal.find({ frecuenciaExportacion: '5m' });
        if(sucursales.length > 0) console.log(`🚀 [TEST] Ejecutando reporte rápido (${sucursales.length} sucursales)...`);
        for (const s of sucursales) {
            await exportarSucursal(s._id);
        }
    });
};

module.exports = { initCronJobs };