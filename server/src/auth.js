import jwt from 'jsonwebtoken';
import { config } from './config.js';
import { queryOne } from './db.js';

export const COOKIE_NAME = 'inventario_ti_sesion';

export function crearToken(usuario) {
  return jwt.sign({ id: usuario.id }, config.jwtSecret, { expiresIn: `${config.sessionHours}h` });
}

export function opcionesCookie() {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: config.cookieSecure,
    maxAge: config.sessionHours * 60 * 60 * 1000,
    path: '/',
  };
}

/**
 * Exige sesión válida. Vuelve a leer al usuario de la BD en cada petición para que
 * desactivar o cambiar el perfil de alguien tenga efecto inmediato.
 */
export async function requireAuth(req, res, next) {
  try {
    const token = req.cookies?.[COOKIE_NAME];
    if (!token) return res.status(401).json({ status: 'error', message: 'Sesión no iniciada' });

    const payload = jwt.verify(token, config.jwtSecret);
    const usuario = await queryOne(
      `SELECT u.id, u.region_id, u.nombre, u.usuario, u.perfil, u.foto, u.estado, r.clave AS region_clave, r.nombre AS region_nombre
       FROM usuarios u JOIN regiones r ON r.id = u.region_id WHERE u.id = ?`,
      [payload.id]
    );
    if (!usuario || Number(usuario.estado) !== 1) {
      res.clearCookie(COOKIE_NAME, { path: '/' });
      return res.status(401).json({ status: 'error', message: 'Sesión no válida' });
    }
    req.user = usuario;
    // Planta de la sesión: TODAS las consultas de inventario se filtran por este valor
    req.region = usuario.region_id;
    next();
  } catch {
    res.clearCookie(COOKIE_NAME, { path: '/' });
    return res.status(401).json({ status: 'error', message: 'Sesión expirada' });
  }
}

export function requireAdmin(req, res, next) {
  if (req.user?.perfil !== 'Administrador') {
    return res.status(403).json({ status: 'error', message: 'Solo los administradores pueden hacer esto' });
  }
  next();
}

/** Perfiles que pueden usar los módulos de inventario (igual que el menú PHP). */
export function requireInventario(req, res, next) {
  if (!['Administrador', 'Usuario'].includes(req.user?.perfil)) {
    return res.status(403).json({ status: 'error', message: 'Tu perfil no tiene acceso a este módulo' });
  }
  next();
}

/**
 * El perfil "Usuario" solo puede consultar: cualquier petición que no sea de lectura
 * (agregar, editar, eliminar, subir, mover, renombrar…) se rechaza. El Administrador puede todo.
 */
export function soloAdminModifica(req, res, next) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method) || req.user?.perfil === 'Administrador') return next();
  return res.status(403).json({ status: 'error', message: 'Tu perfil solo permite consultar la información' });
}
