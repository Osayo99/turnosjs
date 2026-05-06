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
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const dir = './public/uploads';
        if (!fs.existsSync(dir)){
            fs.mkdirSync(dir);
        }
        cb(null, dir);
    },
    filename: function (req, file, cb) {
        const sucursalId = req.body.sucursalId || 'default';
        cb(null, `video-${sucursalId}.mp4`); 
    }
});
const upload = multer({ storage: storage });
const app = express();
connectDB();


app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/api/usuarios', require('./src/routes/usuarios'));
app.use('/api/tickets', require('./src/routes/tickets'));
app.use('/api/sucursales', require('./src/routes/sucursales'));
app.use('/api/admin', require('./src/routes/admin'));
app.use('/api/guias', require('./src/routes/guias'));

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

io.on('connection', (socket) => {
    console.log(`⚡ Cliente conectado: ${socket.id}`);
    socket.on('unirse_sucursal', (sucursalId) => {
        socket.join(sucursalId);
        console.log(`Socket ${socket.id} se unió a la sala: ${sucursalId}`);
    });

    socket.on('disconnect', () => {
        console.log('Cliente desconectado');
    });
});

app.set('io', io);

app.get('/', (req, res) => {
    res.send('API Sistema de Turnos ANDA - Funcionando 🚀');
});

app.post('/api/upload-video', upload.single('videoFile'), async (req, res) => {
    try {
        const { sucursalId } = req.body;
        const filename = req.file.filename;
        const publicUrl = `/uploads/${filename}`;
        await Sucursal.findByIdAndUpdate(sucursalId, { videoUrl: publicUrl });
        const io = req.app.get('io');
        io.to(sucursalId).emit('video_actualizado', { url: `${publicUrl}?t=${Date.now()}` });
        res.json({ success: true, url: publicUrl });
    } catch (e) {
        console.error(e);
        res.status(500).send("Error subiendo video");
    }
});
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`\n🚀 Servidor corriendo en http://localhost:${PORT}`);
    console.log(`📡 Socket.io listo para conexiones\n`);
});