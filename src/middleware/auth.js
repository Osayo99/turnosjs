const jwt = require('jsonwebtoken');

// Middleware para verificar que el usuario esté autenticado
const verificarToken = (req, res, next) => {
    // Obtenemos el token de las cookies (requiere cookie-parser, que ya tienes instalado y configurado)
    const token = req.cookies.anda_token;

    if (!token) {
        return res.status(401).json({ 
            success: false, 
            msg: 'Acceso denegado. No hay sesión activa o el token no existe.' 
        });
    }

    try {
        // Verificamos el token usando la misma clave secreta que en el login
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'anda_super_secret_key_2026');
        
        // Inyectamos los datos del usuario decodificados en la petición actual
        // Así, cualquier controlador que se ejecute después, sabrá quién es req.usuario
        req.usuario = decoded;
        
        // Todo está correcto, dejamos que la petición continúe su camino
        next();
    } catch (error) {
        // Si el token fue modificado, es falso, o expiró (pasaron las 8 horas)
        return res.status(401).json({ 
            success: false, 
            msg: 'Sesión inválida o expirada. Por favor, inicie sesión nuevamente.' 
        });
    }
};

// Middleware para autorización basada en roles
// Uso: router.post('/ruta', verificarToken, verificarRol(['super_admin', 'jefe_sucursal']), controlador)
const verificarRol = (rolesPermitidos) => {
    return (req, res, next) => {
        // Por seguridad, verificamos que el middleware verificarToken ya haya pasado
        if (!req.usuario || !req.usuario.rol) {
            return res.status(401).json({ 
                success: false, 
                msg: 'Error de autenticación previo a la validación de rol.' 
            });
        }
        
        // Comparamos el rol del token con los roles permitidos en la ruta
        if (!rolesPermitidos.includes(req.usuario.rol)) {
            return res.status(403).json({ 
                success: false, 
                msg: 'Acceso prohibido. No tienes los permisos necesarios para realizar esta acción.' 
            });
        }
        
        // El usuario tiene el rol correcto, continúa
        next();
    };
};

module.exports = { verificarToken, verificarRol };