const Ticket = require('../models/Ticket');
const Sucursal = require('../models/Sucursal');

const exportarSucursal = async (sucursalId) => {
    try {
        const sucursal = await Sucursal.findById(sucursalId);
        
        // Verificamos si tiene configurada la URL del Webhook
        if (!sucursal || !sucursal.googleSheetId || !sucursal.googleSheetId.startsWith('http')) {
            return; // No hay configuración, no hacemos nada
        }

        // 1. Buscar tickets NUEVOS (Finalizados después de la última exportación)
        const filtro = { sucursal: sucursalId, estado: 'finalizado' };
        
        if (sucursal.ultimaExportacion) {
            filtro.finalizadoEn = { $gt: sucursal.ultimaExportacion };
        }

        const tickets = await Ticket.find(filtro)
            .populate('ventanillaAtendio', 'nombre')
            .populate('derivadoPor', 'nombre')
            .sort({ finalizadoEn: 1 });

        if (tickets.length === 0) {
            // Actualizamos la fecha para que el próximo chequeo sea desde ahora
            sucursal.ultimaExportacion = new Date();
            await sucursal.save();
            return;
        }

        // 2. Preparar los datos para enviar
        const registros = tickets.map(t => [
            t.codigo,
            t.tipoTramite,
            t.documentoCliente || 'N/A',
            t.creadoEn.toLocaleString('es-SV'),     // Fecha Llegada
            t.finalizadoEn.toLocaleString('es-SV'), // Fecha Fin
            convertirSegundos(t.tiempoTotalAtencion),
            t.ventanillaAtendio?.nombre || 'N/A',
            t.notasAtencion || '',
            t.derivadoPor ? `Derivado: ${t.motivoDerivacion}` : 'No'
        ]);

        // 3. ENVIAR AL WEBHOOK (La URL que tienes)
        const response = await fetch(sucursal.googleSheetId, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                sucursal: sucursal.nombre, // Esto será el nombre de la pestaña en Excel
                registros: registros
            })
        });

        const resultado = await response.json();

        if (resultado.status === 'success') {
            // 4. Si Google dice "OK", guardamos la fecha de corte
            sucursal.ultimaExportacion = new Date();
            await sucursal.save();
            console.log(`✅ [Export] ${sucursal.nombre}: ${tickets.length} tickets enviados.`);
        } else {
            console.error(`❌ [Export Error] Google rechazó los datos:`, resultado);
        }

    } catch (error) {
        console.error(`❌ [Export Error] Sucursal ${sucursalId}:`, error.message);
    }
};

function convertirSegundos(seg) {
    if (!seg) return "00:00";
    const m = Math.floor(seg / 60).toString().padStart(2, '0');
    const s = (seg % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
}

module.exports = { exportarSucursal };