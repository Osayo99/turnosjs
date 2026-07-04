// Archivo principal del servidor Express. Configura middlewares, WebSockets, subida de archivos y rutas de la API.
require('dotenv').config({ quiet: true });
const express = require('express');
const cookieParser = require('cookie-parser');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const connectDB = require('./src/config/db');
const path = require('path');
const multer = require('multer');
const fs = require('fs');
const mongoose = require('mongoose');
const Sucursal = require('./src/models/Sucursal');
const { initCronJobs } = require('./src/services/cronService');
const { verificarToken, verificarRol } = require('./src/middleware/auth');

process.on('unhandledRejection', (reason, promise) => {
    console.error('Promesa rechazada no manejada:', reason?.message || reason);
});
process.on('uncaughtException', (err) => {
    console.error('Excepción no capturada:', err?.message || err);
});

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: process.env.CORS_ORIGIN || '*',
        methods: ["GET", "POST"]
    }
});

app.set('io', io);

io.on('connection', (socket) => {
    console.log(`Cliente conectado: ${socket.id}`);
    
    socket.on('unirse_sucursal', async (sucursalId) => {
        if (sucursalId && mongoose.Types.ObjectId.isValid(sucursalId)) {
            const existe = await Sucursal.findById(sucursalId);
            if (existe) {
                socket.join(sucursalId);
            }
        }
    });

    socket.on('disconnect', () => {
        console.log(`Cliente desconectado: ${socket.id}`);
    });
});

connectDB(); 

app.use(cors());
app.use(express.json({ limit: process.env.MAX_BODY_SIZE || '5mb' }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const dir = process.env.UPLOAD_DIR || './public/uploads';
        if (!fs.existsSync(dir)){
            fs.mkdirSync(dir, { recursive: true });
        }
        cb(null, dir);
    },
    filename: function (req, file, cb) {
        const sucursalId = req.body.sucursalId ? req.body.sucursalId.replace(/[^a-zA-Z0-9]/g, '') : 'default';
        cb(null, `video-${sucursalId}.mp4`); 
    }
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: parseInt(process.env.MAX_UPLOAD_SIZE) || 50 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'video/mp4') {
            cb(null, true);
        } else {
            cb(new Error('Solo se permiten archivos MP4.'));
        }
    }
});

app.get('/', (req, res) => {
    res.send('API Sistema de Turnos ANDA - Lista para Producción');
});

app.post('/api/upload-video', verificarToken, verificarRol(['jefe_sucursal', 'super_admin']), upload.single('videoFile'), async (req, res, next) => {
    try {
        if (!req.file) return res.status(400).json({ success: false, msg: 'No se subió ningún archivo o formato inválido.' });

        const { sucursalId } = req.body;
        const filename = req.file.filename;
        const publicUrl = `/uploads/${filename}`;
        
        await Sucursal.findByIdAndUpdate(sucursalId, { videoUrl: publicUrl });
        
        io.to(sucursalId).emit('video_actualizado', { url: `${publicUrl}?t=${Date.now()}` });
        res.json({ success: true, url: publicUrl });
    } catch (e) {
        next(e); 
    }
});

app.use('/api/usuarios', require('./src/routes/usuarios'));
app.use('/api/tickets', require('./src/routes/tickets'));
app.use('/api/sucursales', require('./src/routes/sucursales'));
app.use('/api/admin', require('./src/routes/admin'));
app.use('/api/guias', require('./src/routes/guias'));

app.use((err, req, res, next) => {
    console.error('Error Crítico Capturado:', err.message || err);
    
    if (err instanceof multer.MulterError) {
        return res.status(400).json({ success: false, msg: `Error de archivo: ${err.message}` });
    }

    res.status(500).json({ 
        success: false, 
        msg: err.message === 'Solo se permiten archivos MP4.' ? err.message : 'Ha ocurrido un error interno en el servidor.'
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`\n=================================================`);
    console.log(`Servidor ANDA corriendo en http://localhost:${PORT}`);
    console.log(`Modo: Produccion / Optimizaciones Activas`);
    console.log(`WebSockets listos y asegurados`);
    console.log(`=================================================\n`);
});