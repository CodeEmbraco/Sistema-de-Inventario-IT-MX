import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { execute, query, queryOne } from '../db.js';
import { ah, badRequest, HttpError } from '../lib/http.js';
import { COOKIE_NAME, crearToken, opcionesCookie, requireAuth } from '../auth.js';
import { FOTO_DEFAULT } from '../config.js';

const router = Router();

function ahoraLocal() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

export function usuarioPublico(u) {
  return {
    id: u.id,
    nombre: u.nombre,
    usuario: u.usuario,
    perfil: u.perfil,
    foto: u.foto || FOTO_DEFAULT,
    region: { id: u.region_id, clave: u.region_clave, nombre: u.region_nombre },
  };
}

/** Plantas disponibles (pública: la usa la pantalla de login). */
router.get(
  '/regiones',
  ah(async (req, res) => {
    res.json({ status: 'success', data: await query('SELECT id, clave, nombre FROM regiones ORDER BY id') });
  })
);

/**
 * Inicia sesión en una planta. Los usuarios son de una sola planta, así que
 * "cambiar de región" es iniciar sesión con la cuenta de la otra planta.
 */
router.post(
  '/login',
  ah(async (req, res) => {
    const usuario = String(req.body?.usuario ?? '').trim();
    const password = String(req.body?.password ?? '');
    const regionId = Number.parseInt(req.body?.region_id, 10);

    if (!usuario || !password) throw badRequest('Escribe tu usuario y tu contraseña');
    const region = Number.isInteger(regionId) ? await queryOne('SELECT * FROM regiones WHERE id = ?', [regionId]) : null;
    if (!region) throw badRequest('Selecciona la planta');

    const u = await queryOne('SELECT * FROM usuarios WHERE usuario = ? AND region_id = ?', [usuario, region.id]);
    if (!u || u.usuario !== usuario) throw new HttpError(401, `El usuario no existe en ${region.nombre}`);

    const valida = await bcrypt.compare(password, u.password).catch(() => false);
    if (!valida) throw new HttpError(401, 'Error en la contraseña, vuelve a intentarlo');

    if (Number(u.estado) !== 1) throw new HttpError(403, 'El usuario aún no está activado');

    await execute('UPDATE usuarios SET ultimo_login = ? WHERE id = ?', [ahoraLocal(), u.id]);

    res.cookie(COOKIE_NAME, crearToken(u), opcionesCookie());
    res.json({
      status: 'success',
      user: usuarioPublico({ ...u, region_clave: region.clave, region_nombre: region.nombre }),
    });
  })
);

router.post('/logout', (req, res) => {
  res.clearCookie(COOKIE_NAME, { path: '/' });
  res.json({ status: 'success' });
});

// Sin sesión responde 200 con user: null (así el navegador no registra un error al abrir el login)
router.get('/me', (req, res, next) => {
  if (!req.cookies?.[COOKIE_NAME]) return res.json({ status: 'success', user: null });
  requireAuth(req, res, () => res.json({ status: 'success', user: usuarioPublico(req.user) })).catch(next);
});

export default router;
