require('dotenv').config();
const express = require('express');
const cookieParser = require('cookie-parser');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const connectDB = require('./src/config/db');
const path = require('path');
const multer = require('multer');
const fs = require('fs');
const Sucursal = require('./src/models/Sucursal');
const { initCronJobs } = require('./src/services/cronService');

// 1. Inicialización
const app = express();
const server = http.createServer(app);

// 2. Configuración de WebSockets (Socket.io)
const io = new Server(server, {
    cors: {
        origin: "*", // En producción real, cambia "*" por la IP o dominio de tu frontend
        methods: ["GET", "POST"]
    }
});

// Almacenar io en express para usarlo libremente en los controladores
app.set('io', io);

io.on('connection', (socket) => {
    console.log(`⚡ Cliente conectado: ${socket.id}`);
    
    socket.on('unirse_sucursal', (sucursalId) => {
        if(sucursalId) {
            socket.join(sucursalId);
            console.log(`Socket ${socket.id} se unió a la sucursal: ${sucursalId}`);
        }
    });

    socket.on('disconnect', () => {
        // Limpiamos el log para no saturar la consola, mantenemos tracking
        console.log(`❌ Cliente desconectado: ${socket.id}`);
    });
});

// 3. Conexión a Base de Datos y Cron Jobs
// (El initCronJobs ya se llama dentro de connectDB en tu config)
connectDB(); 

// 4. Middlewares de Express (¡El orden es vital!)
app.use(cors());
app.use(express.json({ limit: '5mb' })); // Limitar el tamaño del body (JSON) para evitar sobrecarga de memoria
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// 5. Configuración Segura de Multer (Subida de Videos)
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const dir = './public/uploads';
        if (!fs.existsSync(dir)){
            fs.mkdirSync(dir, { recursive: true });
        }
        cb(null, dir);
    },
    filename: function (req, file, cb) {
        // Sanitizar el ID de la sucursal para evitar inyección de rutas (Path Traversal)
        const sucursalId = req.body.sucursalId ? req.body.sucursalId.replace(/[^a-zA-Z0-9]/g, '') : 'default';
        cb(null, `video-${sucursalId}.mp4`); 
    }
});

// Limitar subida estricta a 50MB y forzar a que solo sea MP4
const upload = multer({ 
    storage: storage,
    limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'video/mp4') {
            cb(null, true);
        } else {
            cb(new Error('Solo se permiten archivos MP4.'));
        }
    }
});

// 6. Rutas de la API
app.get('/', (req, res) => {
    res.send('API Sistema de Turnos ANDA - Lista para Producción 🚀');
});

app.post('/api/upload-video', upload.single('videoFile'), async (req, res, next) => {
    try {
        if (!req.file) return res.status(400).json({ success: false, msg: 'No se subió ningún archivo o formato inválido.' });

        const { sucursalId } = req.body;
        const filename = req.file.filename;
        const publicUrl = `/uploads/${filename}`;
        
        await Sucursal.findByIdAndUpdate(sucursalId, { videoUrl: publicUrl });
        
        io.to(sucursalId).emit('video_actualizado', { url: `${publicUrl}?t=${Date.now()}` });
        res.json({ success: true, url: publicUrl });
    } catch (e) {
        // Pasamos el error al manejador global en lugar de hacer que crashee
        next(e); 
    }
});

app.use('/api/usuarios', require('./src/routes/usuarios'));
app.use('/api/tickets', require('./src/routes/tickets'));
app.use('/api/sucursales', require('./src/routes/sucursales'));
app.use('/api/admin', require('./src/routes/admin'));
app.use('/api/guias', require('./src/routes/guias'));

// 7. MIDDLEWARE GLOBAL DE MANEJO DE ERRORES (El escudo final)
// Si cualquier ruta falla internamente y rompe el código, cae aquí como red de seguridad
app.use((err, req, res, next) => {
    console.error('🔥 Error Crítico Capturado:', err.message || err);
    
    // Interceptar errores de Multer (ej. archivo muy grande)
    if (err instanceof multer.MulterError) {
        return res.status(400).json({ success: false, msg: `Error de archivo: ${err.message}` });
    }

    res.status(500).json({ 
        success: false, 
        msg: err.message === 'Solo se permiten archivos MP4.' ? err.message : 'Ha ocurrido un error interno en el servidor.'
    });
});

// 8. Inicialización del Servidor
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`\n=================================================`);
    console.log(`🚀 Servidor ANDA corriendo en http://localhost:${PORT}`);
    console.log(`🛡️  Modo: Producción / Optimizaciones Activas`);
    console.log(`📡 WebSockets listos y asegurados`);
    console.log(`=================================================\n`);
});