import jwt from 'jsonwebtoken';
import { config } from './config.js';
import { query, queryOne } from './db.js';

export const COOKIE_NAME = 'inventario_ti_sesion';

/** El token guarda el usuario y la planta en la que está trabajando. */
export function crearToken(usuario, regionId) {
  return jwt.sign({ id: usuario.id, region: regionId ?? usuario.region_id }, config.jwtSecret, {
    expiresIn: `${config.sessionHours}h`,
  });
}

/**
 * Plantas a las que puede entrar un usuario:
 *  - Administrador: todas
 *  - Usuario: su planta + las que el administrador le asignó (tabla usuario_regiones)
 */
export async function plantasDeUsuario(u) {
  if (u.perfil === 'Administrador') return query('SELECT id, clave, nombre FROM regiones ORDER BY id');
  return query(
    `SELECT r.id, r.clave, r.nombre FROM regiones r
     WHERE r.id = ? OR r.id IN (SELECT region_id FROM usuario_regiones WHERE usuario_id = ?)
     ORDER BY r.id`,
    [u.region_id, u.id]
  );
}

export async function puedeEntrar(u, regionId) {
  return (await plantasDeUsuario(u)).find((r) => r.id === Number(regionId)) || null;
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
      'SELECT id, region_id, nombre, usuario, perfil, foto, estado FROM usuarios WHERE id = ?',
      [payload.id]
    );
    // Planta de la sesión (la elegida al entrar o al cambiar de planta); se vuelve a validar
    // el acceso en cada petición por si el administrador se lo quitó.
    const planta = usuario && Number(usuario.estado) === 1 ? await puedeEntrar(usuario, payload.region ?? usuario.region_id) : null;
    if (!planta) {
      res.clearCookie(COOKIE_NAME, { path: '/' });
      return res.status(401).json({ status: 'error', message: 'Sesión no válida' });
    }
    req.user = { ...usuario, region_planta: usuario.region_id, region_id: planta.id, region_clave: planta.clave, region_nombre: planta.nombre };
    // Planta de la sesión: TODAS las consultas de inventario se filtran por este valor
    req.region = planta.id;
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
