// Servicio de tareas programadas con node-cron. Exporta tickets automáticamente según la frecuencia configurada por sucursal.
const cron = require('node-cron');
const Sucursal = require('../models/Sucursal');
const { exportarSucursal } = require('./googleSheetService');

const initCronJobs = () => {
    console.log('Sistema de exportación automática INICIADO');

    cron.schedule('0 * * * *', async () => {
        const sucursales = await Sucursal.find({ frecuenciaExportacion: '1h' });
        if(sucursales.length > 0) console.log(`Ejecutando reporte horario (${sucursales.length} sucursales)...`);
        for (const s of sucursales) await exportarSucursal(s._id);
    });

    cron.schedule('0 23 * * *', async () => {
        const sucursales = await Sucursal.find({ frecuenciaExportacion: '24h' });
        if(sucursales.length > 0) console.log(`Ejecutando reporte diario...`);
        for (const s of sucursales) await exportarSucursal(s._id);
    });

    cron.schedule('0 23 * * 0', async () => {
        const sucursales = await Sucursal.find({ frecuenciaExportacion: '7d' });
        for (const s of sucursales) await exportarSucursal(s._id);
    });

    cron.schedule('*/5 * * * *', async () => {
        const sucursales = await Sucursal.find({ frecuenciaExportacion: '5m' });
        if(sucursales.length > 0) console.log(`Ejecutando reporte cada 5min (${sucursales.length} sucursales)...`);
        for (const s of sucursales) {
            await exportarSucursal(s._id);
        }
    });

    cron.schedule('* * * * *', async () => {
        const sucursales = await Sucursal.find({ frecuenciaExportacion: '1m' });
        if(sucursales.length > 0) console.log(`[DEV] Ejecutando reporte cada 1min (${sucursales.length} sucursales)...`);
        for (const s of sucursales) {
            await exportarSucursal(s._id);
        }
    });
};

module.exports = { initCronJobs };