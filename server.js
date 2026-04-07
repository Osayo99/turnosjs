require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const connectDB = require('./src/config/db');
const path = require('path');
const multer = require('multer');
const fs = require('fs');
const Sucursal = require('./src/models/Sucursal');
const { initCronJobs } = require('./src/services/cronService');

// Configuración de almacenamiento de video
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        // Asegurar que exista carpeta uploads
        const dir = './public/uploads';
        if (!fs.existsSync(dir)){
            fs.mkdirSync(dir);
        }
        cb(null, dir);
    },
    filename: function (req, file, cb) {
        // Guardar como 'video-SUCURSALID.mp4' para reemplazar el anterior automáticamente
        // Ojo: Esto requiere que mandemos el sucursalId en el body del upload
        const sucursalId = req.body.sucursalId || 'default';
        cb(null, `video-${sucursalId}.mp4`); 
    }
});
const upload = multer({ storage: storage });

// 1. Inicializar App y Conexión DB
const app = express();
connectDB();

// 2. Middlewares (Permiten leer JSON y conexiones externas)
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Definir Rutas
app.use('/api/usuarios', require('./src/routes/usuarios'));
app.use('/api/tickets', require('./src/routes/tickets'));
app.use('/api/sucursales', require('./src/routes/sucursales'));
app.use('/api/admin', require('./src/routes/admin'));
app.use('/api/guias', require('./src/routes/guias'));

// 3. Crear Servidor HTTP y Socket.io
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*", // Permitir acceso desde cualquier frontend (por ahora)
        methods: ["GET", "POST"]
    }
});

// 4. Lógica de Socket.io (Eventos en Tiempo Real)
io.on('connection', (socket) => {
    console.log(`⚡ Cliente conectado: ${socket.id}`);

    // Evento: Un monitor o ventanilla se une a una sala específica de sucursal
    // Así, la sucursal 1 no ve los tickets de la sucursal 2
    socket.on('unirse_sucursal', (sucursalId) => {
        socket.join(sucursalId);
        console.log(`Socket ${socket.id} se unió a la sala: ${sucursalId}`);
    });

    socket.on('disconnect', () => {
        console.log('Cliente desconectado');
    });
});

// Hacemos global la variable 'io' para poder usarla luego en los controladores
app.set('io', io);

// 5. Ruta de prueba
app.get('/', (req, res) => {
    res.send('API Sistema de Turnos ANDA - Funcionando 🚀');
});

// Ruta para subir video
app.post('/api/upload-video', upload.single('videoFile'), async (req, res) => {
    try {
        const { sucursalId } = req.body;
        const filename = req.file.filename;
        const publicUrl = `/uploads/${filename}`;

        // 1. Guardar en Base de Datos para persistencia
        await Sucursal.findByIdAndUpdate(sucursalId, { videoUrl: publicUrl });

        // 2. Avisar en tiempo real
        const io = req.app.get('io');
        io.to(sucursalId).emit('video_actualizado', { url: `${publicUrl}?t=${Date.now()}` });

        res.json({ success: true, url: publicUrl });
    } catch (e) {
        console.error(e);
        res.status(500).send("Error subiendo video");
    }
});

// 6. Arrancar Servidor
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`\n🚀 Servidor corriendo en http://localhost:${PORT}`);
    console.log(`📡 Socket.io listo para conexiones\n`);
});