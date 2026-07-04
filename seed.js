const mongoose = require('mongoose');
const Sucursal = require('./src/models/Sucursal');
const Usuario = require('./src/models/Usuario');
const Ticket = require('./src/models/Ticket');
const Guia = require('./src/models/Guia');

require('dotenv').config({ quiet: true });
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/anda_turnos';

const seed = async () => {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('Conectado a MongoDB');

        // Limpiar colecciones existentes
        await Promise.all([
            Sucursal.deleteMany({}),
            Usuario.deleteMany({}),
            Ticket.deleteMany({}),
            Guia.deleteMany({})
        ]);
        console.log('Colecciones limpiadas');

        // ─── SUCURSALES ───
        const sucursalesData = [
            { nombre: 'San Salvador Centro', codigo: 'SSC', direccion: 'Av. Cuscatancingo #123, San Salvador', videoUrl: '/uploads/video-default.mp4', googleSheetId: '', frecuenciaExportacion: 'none' },
            { nombre: 'Santa Ana', codigo: 'SA', direccion: '5a Av. Sur #456, Santa Ana', videoUrl: '/uploads/video-default.mp4', googleSheetId: '', frecuenciaExportacion: 'none' },
            { nombre: 'San Miguel', codigo: 'SM', direccion: 'Barrio El Centro #789, San Miguel', videoUrl: '/uploads/video-default.mp4', googleSheetId: '', frecuenciaExportacion: 'none' }
        ];
        const sucursales = await Sucursal.insertMany(sucursalesData);
        const [ssc, sa, sm] = sucursales;
        console.log(`3 sucursales creadas`);

        // ─── USUARIOS ───
        const usuariosData = [
            // Super Admin
            { nombre: 'Administrador Principal', username: 'superanda', password: '123', rol: 'super_admin', sucursal: null, skills: [], numeroVentanilla: 0, codigoEmpleado: '00001' },
            // Jefes de sucursal
            { nombre: 'María García', username: 'jefe.ssc', password: '123', rol: 'jefe_sucursal', sucursal: ssc._id, skills: [{ tipo: 'CONSULTAS', prioridad: 1 }, { tipo: 'PAGOS', prioridad: 1 }, { tipo: 'RECLAMOS', prioridad: 1 }, { tipo: 'NUEVOS', prioridad: 1 }], numeroVentanilla: 0, codigoEmpleado: '00002' },
            { nombre: 'Carlos López', username: 'jefe.sa', password: '123', rol: 'jefe_sucursal', sucursal: sa._id, skills: [{ tipo: 'CONSULTAS', prioridad: 1 }, { tipo: 'PAGOS', prioridad: 1 }, { tipo: 'RECLAMOS', prioridad: 1 }, { tipo: 'NUEVOS', prioridad: 1 }], numeroVentanilla: 0, codigoEmpleado: '00003' },
            { nombre: 'Ana Martínez', username: 'jefe.sm', password: '123', rol: 'jefe_sucursal', sucursal: sm._id, skills: [{ tipo: 'CONSULTAS', prioridad: 1 }, { tipo: 'PAGOS', prioridad: 1 }, { tipo: 'RECLAMOS', prioridad: 1 }, { tipo: 'NUEVOS', prioridad: 1 }], numeroVentanilla: 0, codigoEmpleado: '00004' },
            // Ventanillas SSC
            { nombre: 'Pedro Hernández', username: 'ventanilla1.ssc', password: '123', rol: 'ventanilla', sucursal: ssc._id, skills: [{ tipo: 'PAGOS', prioridad: 1 }, { tipo: 'CONSULTAS', prioridad: 2 }], numeroVentanilla: 1, codigoEmpleado: '00005' },
            { nombre: 'Lucía Ramírez', username: 'ventanilla2.ssc', password: '123', rol: 'ventanilla', sucursal: ssc._id, skills: [{ tipo: 'RECLAMOS', prioridad: 1 }, { tipo: 'NUEVOS', prioridad: 2 }], numeroVentanilla: 2, codigoEmpleado: '00006' },
            { nombre: 'José Rivera', username: 'ventanilla3.ssc', password: '123', rol: 'ventanilla', sucursal: ssc._id, skills: [{ tipo: 'CONSULTAS', prioridad: 1 }, { tipo: 'PAGOS', prioridad: 1 }, { tipo: 'RECLAMOS', prioridad: 2 }], numeroVentanilla: 3, codigoEmpleado: '00007' },
            // Ventanillas SA
            { nombre: 'Rosa Mendoza', username: 'ventanilla1.sa', password: '123', rol: 'ventanilla', sucursal: sa._id, skills: [{ tipo: 'PAGOS', prioridad: 1 }, { tipo: 'CONSULTAS', prioridad: 1 }], numeroVentanilla: 1, codigoEmpleado: '00008' },
            { nombre: 'Jorge Flores', username: 'ventanilla2.sa', password: '123', rol: 'ventanilla', sucursal: sa._id, skills: [{ tipo: 'RECLAMOS', prioridad: 1 }, { tipo: 'NUEVOS', prioridad: 2 }], numeroVentanilla: 2, codigoEmpleado: '00009' },
            // Ventanillas SM
            { nombre: 'Diana Reyes', username: 'ventanilla1.sm', password: '123', rol: 'ventanilla', sucursal: sm._id, skills: [{ tipo: 'PAGOS', prioridad: 1 }, { tipo: 'CONSULTAS', prioridad: 2 }], numeroVentanilla: 1, codigoEmpleado: '00010' },
            { nombre: 'Roberto Sánchez', username: 'ventanilla2.sm', password: '123', rol: 'ventanilla', sucursal: sm._id, skills: [{ tipo: 'RECLAMOS', prioridad: 1 }, { tipo: 'NUEVOS', prioridad: 1 }, { tipo: 'CONSULTAS', prioridad: 3 }], numeroVentanilla: 2, codigoEmpleado: '00011' },
        ];

        const usuarios = await Usuario.create(usuariosData);
        console.log(`${usuarios.length} usuarios creados`);

        // ─── TICKETS ───
        const now = new Date();
        const startOfDay = new Date(now);
        startOfDay.setHours(0, 0, 0, 0);

        const ticketsData = [
            // SSC - Pendientes
            { numero: 1, letra: 'G', codigo: 'G-1', tipoTramite: 'PAGOS', sucursal: ssc._id, estado: 'pendiente', creadoEn: new Date(startOfDay.getTime() + 5 * 60000) },
            { numero: 2, letra: 'C', codigo: 'C-2', tipoTramite: 'CONSULTAS', sucursal: ssc._id, estado: 'pendiente', creadoEn: new Date(startOfDay.getTime() + 10 * 60000) },
            { numero: 3, letra: 'C', codigo: 'C-3', tipoTramite: 'CONSULTAS', sucursal: ssc._id, estado: 'pendiente', creadoEn: new Date(startOfDay.getTime() + 15 * 60000) },
            { numero: 4, letra: 'R', codigo: 'R-4', tipoTramite: 'RECLAMOS', sucursal: ssc._id, estado: 'pendiente', creadoEn: new Date(startOfDay.getTime() + 20 * 60000) },
            { numero: 5, letra: 'N', codigo: 'N-5', tipoTramite: 'NUEVOS', sucursal: ssc._id, estado: 'pendiente', creadoEn: new Date(startOfDay.getTime() + 25 * 60000), esPrioritario: true, condicionesEspeciales: ['Adulto mayor'] },
            // SSC - Finalizados
            { numero: 1, letra: 'G', codigo: 'G-1', tipoTramite: 'PAGOS', sucursal: ssc._id, estado: 'finalizado', documentoCliente: 'DNI001', ventanillaAtendio: usuarios[3]._id, ventanillaNumero: 1, creadoEn: new Date(startOfDay.getTime() + 2 * 60000), llamadoEn: new Date(startOfDay.getTime() + 3 * 60000), inicioAtencionEn: new Date(startOfDay.getTime() + 4 * 60000), finalizadoEn: new Date(startOfDay.getTime() + 8 * 60000), tiempoTotalAtencion: 4, notasAtencion: 'Atendido sin novedad' },
            { numero: 2, letra: 'C', codigo: 'C-2', tipoTramite: 'CONSULTAS', sucursal: ssc._id, estado: 'finalizado', documentoCliente: 'DNI002', ventanillaAtendio: usuarios[4]._id, ventanillaNumero: 2, creadoEn: new Date(startOfDay.getTime() + 3 * 60000), llamadoEn: new Date(startOfDay.getTime() + 4 * 60000), inicioAtencionEn: new Date(startOfDay.getTime() + 5 * 60000), finalizadoEn: new Date(startOfDay.getTime() + 12 * 60000), tiempoTotalAtencion: 7, notasAtencion: 'Consulta resuelta' },
            // SA - Pendientes
            { numero: 1, letra: 'G', codigo: 'G-1', tipoTramite: 'PAGOS', sucursal: sa._id, estado: 'pendiente', creadoEn: new Date(startOfDay.getTime() + 8 * 60000) },
            { numero: 2, letra: 'C', codigo: 'C-2', tipoTramite: 'CONSULTAS', sucursal: sa._id, estado: 'pendiente', creadoEn: new Date(startOfDay.getTime() + 12 * 60000) },
            { numero: 3, letra: 'R', codigo: 'R-3', tipoTramite: 'RECLAMOS', sucursal: sa._id, estado: 'pendiente', creadoEn: new Date(startOfDay.getTime() + 18 * 60000) },
            // SA - Finalizados
            { numero: 1, letra: 'G', codigo: 'G-1', tipoTramite: 'PAGOS', sucursal: sa._id, estado: 'finalizado', documentoCliente: 'DNI003', ventanillaAtendio: usuarios[6]._id, ventanillaNumero: 1, creadoEn: new Date(startOfDay.getTime() + 1 * 60000), llamadoEn: new Date(startOfDay.getTime() + 2 * 60000), inicioAtencionEn: new Date(startOfDay.getTime() + 3 * 60000), finalizadoEn: new Date(startOfDay.getTime() + 9 * 60000), tiempoTotalAtencion: 6, notasAtencion: 'Pago exitoso' },
            // SM - Pendientes
            { numero: 1, letra: 'N', codigo: 'N-1', tipoTramite: 'NUEVOS', sucursal: sm._id, estado: 'pendiente', creadoEn: new Date(startOfDay.getTime() + 7 * 60000) },
            { numero: 2, letra: 'C', codigo: 'C-2', tipoTramite: 'CONSULTAS', sucursal: sm._id, estado: 'pendiente', creadoEn: new Date(startOfDay.getTime() + 14 * 60000) },
            { numero: 3, letra: 'R', codigo: 'R-3', tipoTramite: 'RECLAMOS', sucursal: sm._id, estado: 'pendiente', creadoEn: new Date(startOfDay.getTime() + 22 * 60000) },
            // SM - Finalizados
            { numero: 1, letra: 'G', codigo: 'G-1', tipoTramite: 'PAGOS', sucursal: sm._id, estado: 'finalizado', documentoCliente: 'DNI004', ventanillaAtendio: usuarios[8]._id, ventanillaNumero: 1, creadoEn: new Date(startOfDay.getTime() + 4 * 60000), llamadoEn: new Date(startOfDay.getTime() + 5 * 60000), inicioAtencionEn: new Date(startOfDay.getTime() + 6 * 60000), finalizadoEn: new Date(startOfDay.getTime() + 10 * 60000), tiempoTotalAtencion: 4, notasAtencion: 'Pago de factura' },
        ];

        const tickets = await Ticket.insertMany(ticketsData);
        console.log(`${tickets.length} tickets creados`);

        // ─── GUÍAS ───
        const guiasData = [
            { titulo: 'Guía de Uso - Kiosco', contenido: 'Bienvenido al sistema de turnos ANDA.\n\n1. Seleccione el tipo de trámite que desea realizar.\n2. Ingrese su número de documento.\n3. Espere su turno en la sala de espera.\n4. Cuando su número aparezca en pantalla, diríjase a la ventanilla indicada.' },
            { titulo: 'Guía de Uso - Ventanilla', contenido: 'Bienvenido al módulo de ventanilla.\n\n1. Inicie sesión con su usuario y contraseña.\n2. Seleccione "Llamar siguiente" para atender al próximo cliente.\n3. Atienda al cliente y finalice el ticket cuando termine.\n4. Puede derivar tickets a jefatura si es necesario.' },
            { titulo: 'Guía de Uso - Jefatura', contenido: 'Panel de jefatura.\n\n1. Monitoree el estado de las ventanillas.\n2. Revise tickets derivados pendientes.\n3. Consulte estadísticas del día.\n4. Gestione usuarios de su sucursal.' },
            { titulo: 'Guía de Uso - Administración', contenido: 'Panel de administración general.\n\n1. Gestión de sucursales: crear, editar y eliminar.\n2. Gestión de usuarios: crear jefes de sucursal.\n3. Configuración de exportación a Google Sheets.\n4. Auditoría de tickets por sucursal y fecha.' }
        ];
        const guias = await Guia.insertMany(guiasData);
        console.log(`${guias.length} guías creadas`);

        console.log('\n=== Datos de muestra insertados exitosamente ===\n');
        console.log('Resumen:');
        console.log(`  Sucursales: ${sucursales.length}`);
        console.log(`  Usuarios: ${usuarios.length}`);
        console.log(`  Tickets: ${tickets.length}`);
        console.log(`  Guías: ${guias.length}`);
        console.log('\nUsuarios creados:');
        usuarios.forEach(u => console.log(`  ${u.username} / ${u.rol} / clave: 123`));

        await mongoose.connection.close();
        process.exit(0);
    } catch (error) {
        console.error('Error en seed:', error);
        await mongoose.connection.close();
        process.exit(1);
    }
};

seed();
