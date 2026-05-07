const Ticket = require('../models/Ticket');
const Sucursal = require('../models/Sucursal');

const exportarSucursal = async (sucursalId) => {
    try {
        const sucursal = await Sucursal.findById(sucursalId);
        
        if (!sucursal || !sucursal.googleSheetId || !sucursal.googleSheetId.startsWith('http')) {
            return; 
        }

        const filtro = { sucursal: sucursalId, estado: 'finalizado' };
        
        if (sucursal.ultimaExportacion) {
            filtro.finalizadoEn = { $gt: sucursal.ultimaExportacion };
        }

        const tickets = await Ticket.find(filtro)
            .populate('ventanillaAtendio', 'nombre')
            .populate('derivadoPor', 'nombre')
            .sort({ finalizadoEn: 1 });

        if (tickets.length === 0) {
            sucursal.ultimaExportacion = new Date();
            await sucursal.save();
            return;
        }

        const registros = tickets.map(t => [
            t.codigo,
            t.tipoTramite,
            t.documentoCliente || 'N/A',
            t.creadoEn.toLocaleString('es-SV'),     
            t.finalizadoEn.toLocaleString('es-SV'), 
            convertirSegundos(t.tiempoTotalAtencion),
            t.ventanillaAtendio?.nombre || 'N/A',
            t.notasAtencion || '',
            t.derivadoPor ? `Derivado: ${t.motivoDerivacion}` : 'No'
        ]);

        console.log(`📤 [Export] Intentando enviar ${tickets.length} tickets a Google Sheets...`);

        const response = await fetch(sucursal.googleSheetId, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                sucursal: sucursal.nombre, 
                registros: registros
            })
        });

        const responseText = await response.text();
        let resultado;

        try {
            resultado = JSON.parse(responseText);
        } catch (parseError) {
            console.error(`❌ [Export Error] Google no devolvió un JSON válido.`);
            console.error(`🔍 [Debug] Respuesta recibida (primeros 150 caracteres):`, responseText.substring(0, 150));
            return;
        }

        if (resultado.status === 'success') {
            sucursal.ultimaExportacion = new Date();
            await sucursal.save();
            console.log(`✅ [Export] ${sucursal.nombre}: ${tickets.length} tickets enviados y procesados correctamente.`);
        } else {
            console.error(`❌ [Export Error] Google procesó la petición pero rechazó los datos:`, resultado);
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