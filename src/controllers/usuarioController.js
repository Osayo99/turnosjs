const Usuario = require('../models/Usuario');

// LOGIN (MODIFICADO)
exports.login = async (req, res) => {
    const { username, password, sucursalId } = req.body;
    try {
        // Buscamos el usuario
        // Nota: Quitamos sucursalId del filtro inicial para dar un mejor mensaje de error
        // si el usuario existe pero no pertenece a esa sucursal, aunque es opcional.
        // Mantengo tu lógica original de filtro estricto:
        const user = await Usuario.findOne({ username, sucursal: sucursalId });
        
        if(!user) return res.status(404).json({ success: false, msg: 'Usuario no existe o no pertenece a esta sucursal' });
        
        // --- CAMBIO AQUÍ: Usar el método del modelo para comparar ---
        const isMatch = await user.compararPassword(password);
        
        if(!isMatch) return res.status(401).json({ success: false, msg: 'Contraseña incorrecta' });

        // Si pasa, devolvemos el usuario (sin el hash por seguridad)
        user.password = undefined; 
        res.json({ success: true, user });

    } catch (e) { 
        console.error(e);
        res.status(500).send('Error'); 
    }
};

// CREAR USUARIO (SIN CAMBIOS, PERO AHORA FUNCIONA SEGURO)
// Gracias al 'pre save' del modelo, al hacer nuevoUsuario.save(), se encriptará solo.
exports.crearUsuario = async (req, res) => {
    try {
        const { nombre, username, password, sucursalId, skills, numeroVentanilla, rol } = req.body;
        
        const existe = await Usuario.findOne({ username }); // Mejor validar globalmente el username
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

        await nuevoUsuario.save(); // <--- AQUÍ SE DISPARA LA ENCRIPTACIÓN AUTOMÁTICA
        
        res.json({ success: true, user: nuevoUsuario });
    } catch (e) {
        res.status(500).json({ success: false, msg: e.message });
    }
};

// --- MIGRACIÓN DE SEGURIDAD (EJECUTAR UNA VEZ) ---
exports.migrarPasswords = async (req, res) => {
    try {
        const usuarios = await Usuario.find();
        let cont = 0;

        for (const u of usuarios) {
            // Si la contraseña no empieza con $2a$ o $2b$, es texto plano (insegura)
            if (!u.password.startsWith('$2')) {
                // Forzamos a Mongoose a saber que el campo cambió
                u.markModified('password'); 
                // Al guardar, el modelo la encriptará
                await u.save(); 
                cont++;
            }
        }
        res.json({ success: true, msg: `Se encriptaron ${cont} usuarios antiguos.` });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// 1. LISTAR COLABORADORES (Para que el Jefe vea a sus empleados)
exports.listarPorSucursal = async (req, res) => {
    try {
        const { sucursalId } = req.params;
        // Traer todos los usuarios de esa sucursal (excluyendo al que pide si quieres, aqui traemos todos)
        const usuarios = await Usuario.find({ sucursal: sucursalId }).select('-password'); 
        res.json(usuarios);
    } catch (error) { res.status(500).send('Error al listar'); }
};

// 2. CAMBIAR PROPIA CONTRASEÑA (Para cualquier usuario logueado)
exports.cambiarPasswordPropio = async (req, res) => {
    try {
        const { usuarioId, actual, nueva } = req.body;
        const usuario = await Usuario.findById(usuarioId);
        
        // En producción aquí deberías usar bcrypt.compare
        if(usuario.password !== actual) {
            return res.status(400).json({ success: false, msg: 'La contraseña actual es incorrecta' });
        }

        usuario.password = nueva; // En prod: await bcrypt.hash(nueva, 10)
        await usuario.save();
        
        res.json({ success: true });
    } catch (e) { res.status(500).send('Error'); }
};

// 3. RESTABLECER CONTRASEÑA (Administrativo: Jefe -> Ejecutivo o Admin -> Jefe)
exports.adminResetPassword = async (req, res) => {
    try {
        const { targetUserId, nuevaPassword } = req.body;
        
        const usuario = await Usuario.findById(targetUserId);
        if(!usuario) return res.status(404).json({ msg: 'Usuario no encontrado' });

        usuario.password = nuevaPassword; // En prod: hash
        await usuario.save();

        res.json({ success: true });
    } catch (e) { res.status(500).send('Error'); }
};

// 4. ACTUALIZAR USUARIO (Skills, Ventanilla, Nombre y Username)
exports.actualizarUsuario = async (req, res) => {
    try {
        const { id, nombre, username, skills, numeroVentanilla } = req.body;
        
        // Verificar si el nuevo username ya le pertenece a OTRO usuario distinto
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

// NUEVA FUNCIÓN: ELIMINAR USUARIO POR JEFE
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

// --- MIGRACIÓN DE SKILLS (Ejecutar una vez) ---
// Convierte ["PAGOS"] a [{ tipo: "PAGOS", prioridad: 1 }]
exports.migrarSkills = async (req, res) => {
    try {
        // Usamos lean() para obtener objetos JS puros y evitar errores de validación de Mongoose
        const usuarios = await Usuario.find().lean(); 
        let cont = 0;

        for (const u of usuarios) {
            // Verificamos si tiene skills y si el primer elemento es un String (formato viejo)
            if (u.skills && u.skills.length > 0 && typeof u.skills[0] === 'string') {
                
                // Convertimos al nuevo formato
                const nuevasSkills = u.skills.map(skillString => ({
                    tipo: skillString,
                    prioridad: 1 // Por defecto prioridad Alta a lo que ya tenían
                }));

                // Actualizamos directamente en la base de datos
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