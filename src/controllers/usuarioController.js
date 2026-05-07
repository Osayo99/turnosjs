const Usuario = require('../models/Usuario');
const jwt = require('jsonwebtoken');

// Controlador para la gestión de usuarios (Admin, Jefatura y Ventanilla)

// LOGIN
exports.login = async (req, res) => {
    const { username, password, sucursalId } = req.body;
    try {
        const user = await Usuario.findOne({ username, sucursal: sucursalId });
        
        if(!user) return res.status(404).json({ success: false, msg: 'Usuario no existe o no pertenece a esta sucursal' });
        
        const isMatch = await user.compararPassword(password);
        
        if(!isMatch) return res.status(401).json({ success: false, msg: 'Contraseña incorrecta' });

        // 1. Crear el payload del Token con los datos esenciales
        const payload = {
            id: user._id,
            username: user.username,
            rol: user.rol,
            sucursal: user.sucursal
        };

        // 2. Firmar el Token (Expiración de 8 horas para una jornada laboral estándar)
        const token = jwt.sign(
            payload, 
            process.env.JWT_SECRET || 'anda_super_secret_key_2026', 
            { expiresIn: '8h' }
        );

        // 3. Enviar el token en una cookie HttpOnly
        res.cookie('anda_token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 8 * 60 * 60 * 1000
        });

        // 4. Devolver el usuario limpio al frontend para la interfaz gráfica
        user.password = undefined; 
        res.json({ success: true, user });

    } catch (e) { 
        console.error(e);
        res.status(500).json({ success: false, msg: 'Error interno del servidor' }); 
    }
};

// LOGOUT
exports.logout = (req, res) => {
    res.clearCookie('anda_token');
    res.json({ success: true, msg: 'Sesión cerrada correctamente' });
};

// CREAR USUARIO
exports.crearUsuario = async (req, res) => {
    try {
        const { nombre, username, password, sucursalId, skills, numeroVentanilla, rol } = req.body;
        
        const existe = await Usuario.findOne({ username }); 
        if(existe) return res.status(400).json({ success: false, msg: 'El usuario ya existe' });

        const nuevoUsuario = new Usuario({
            nombre,
            username,
            password: password || '123', 
            sucursal: sucursalId,
            skills: skills || [],
            numeroVentanilla: numeroVentanilla || 0,
            rol: rol || 'ejecutivo'
        });

        await nuevoUsuario.save(); 
        
        res.json({ success: true, user: nuevoUsuario });
    } catch (e) {
        res.status(500).json({ success: false, msg: e.message });
    }
};

// MIGRACIÓN DE SEGURIDAD
exports.migrarPasswords = async (req, res) => {
    try {
        const usuarios = await Usuario.find();
        let cont = 0;

        for (const u of usuarios) {
            if (!u.password.startsWith('$2')) {
                u.markModified('password'); 
                await u.save(); 
                cont++;
            }
        }
        res.json({ success: true, msg: `Se encriptaron ${cont} usuarios antiguos.` });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// 1. LISTAR USUARIOS
exports.listarPorSucursal = async (req, res) => {
    try {
        const { sucursalId } = req.params;
        const usuarios = await Usuario.find({ sucursal: sucursalId }).select('-password'); 
        res.json(usuarios);
    } catch (error) { res.status(500).send('Error al listar'); }
};

// 2. CAMBIAR PROPIA CONTRASEÑA
exports.cambiarPasswordPropio = async (req, res) => {
    try {
        const { usuarioId, actual, nueva } = req.body;
        const usuario = await Usuario.findById(usuarioId);
        
        const isMatch = await usuario.compararPassword(actual);
        if(!isMatch) {
            return res.status(400).json({ success: false, msg: 'La contraseña actual es incorrecta' });
        }

        usuario.password = nueva; 
        await usuario.save();
        
        res.json({ success: true });
    } catch (e) { res.status(500).send('Error'); }
};

// 3. RESTABLECER CONTRASEÑA
exports.adminResetPassword = async (req, res) => {
    try {
        const { targetUserId, nuevaPassword } = req.body;
        
        const usuario = await Usuario.findById(targetUserId);
        if(!usuario) return res.status(404).json({ msg: 'Usuario no encontrado' });

        usuario.password = nuevaPassword; 
        await usuario.save();

        res.json({ success: true });
    } catch (e) { res.status(500).send('Error'); }
};

// 4. ACTUALIZAR USUARIO
exports.actualizarUsuario = async (req, res) => {
    try {
        const { id, nombre, username, skills, numeroVentanilla } = req.body;
        
        if (username) {
            const existe = await Usuario.findOne({ username, _id: { $ne: id } });
            if(existe) return res.status(400).json({ success: false, msg: 'El nombre de usuario ya está en uso.' });
        }
        
        await Usuario.findByIdAndUpdate(id, { 
            nombre,
            username,
            skills,
            numeroVentanilla
        });

        res.json({ success: true });
    } catch (e) { 
        console.error(e);
        res.status(500).send('Error al actualizar'); 
    }
};

// ELIMINAR USUARIO POR JEFE
exports.eliminarUsuarioJefe = async (req, res) => {
    try {
        const { id } = req.params;
        const usuarioEliminado = await Usuario.findByIdAndDelete(id);
        
        if (!usuarioEliminado) {
            return res.status(404).json({ success: false, msg: 'Usuario no encontrado' });
        }

        res.json({ success: true, msg: 'Usuario eliminado correctamente' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, msg: 'Error al eliminar el usuario' });
    }
};

// ACTUALIZACIÓN DE SKILLS
exports.migrarSkills = async (req, res) => {
    try {
        const usuarios = await Usuario.find().lean(); 
        let cont = 0;

        for (const u of usuarios) {
            if (u.skills && u.skills.length > 0 && typeof u.skills[0] === 'string') {
                const nuevasSkills = u.skills.map(skillString => ({
                    tipo: skillString,
                    prioridad: 1 
                }));

                await Usuario.updateOne({ _id: u._id }, { $set: { skills: nuevasSkills } });
                cont++;
            }
        }
        res.json({ success: true, msg: `Se actualizaron las skills de ${cont} usuarios.` });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
};