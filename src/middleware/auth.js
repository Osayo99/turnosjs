// Middleware de autenticación JWT y autorización por roles. Verifica tokens en cookies y restringe acceso a rutas protegidas.
const jwt = require('jsonwebtoken');

const verificarToken = (req, res, next) => {
    const token = req.cookies.anda_token;

    if (!token) {
        return res.status(401).json({ 
            success: false, 
            msg: 'Acceso denegado. No hay sesión activa o el token no existe.' 
        });
    }

    try {
        if (!process.env.JWT_SECRET) {
            console.error('JWT_SECRET no está definido en .env');
            return res.status(500).json({ msg: 'Error de configuración del servidor.' });
        }
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        req.usuario = decoded;
        
        next();
    } catch (error) {
        return res.status(401).json({ 
            success: false, 
            msg: 'Sesión inválida o expirada. Por favor, inicie sesión nuevamente.' 
        });
    }
};

const verificarRol = (rolesPermitidos) => {
    return (req, res, next) => {
        if (!req.usuario || !req.usuario.rol) {
            return res.status(401).json({ 
                success: false, 
                msg: 'Error de autenticación previo a la validación de rol.' 
            });
        }
        
        if (!rolesPermitidos.includes(req.usuario.rol)) {
            return res.status(403).json({ 
                success: false, 
                msg: 'Acceso prohibido. No tienes los permisos necesarios para realizar esta acción.' 
            });
        }
        
        next();
    };
};

module.exports = { verificarToken, verificarRol };