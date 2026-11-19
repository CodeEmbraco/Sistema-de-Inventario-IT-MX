import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { execute, query, queryOne } from '../db.js';
import { ah, badRequest, HttpError } from '../lib/http.js';
import { COOKIE_NAME, crearToken, opcionesCookie, plantasDeUsuario, puedeEntrar, requireAuth } from '../auth.js';
import { FOTO_DEFAULT } from '../config.js';

const router = Router();

function ahoraLocal() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

export function usuarioPublico(u, plantas) {
  return {
    plantas, // plantas a las que puede cambiar
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
 * Inicia sesión en una planta.
 * Se busca primero un usuario de esa planta; si no hay, un usuario de otra planta que tenga
 * acceso a ella (los administradores entran a todas; a los usuarios se las asigna el administrador).
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

    // Candidatos con ese usuario: primero el de la planta elegida
    const candidatos = (await query('SELECT * FROM usuarios WHERE usuario = ?', [usuario]))
      .filter((u) => u.usuario === usuario)
      .sort((a, b) => (a.region_id === region.id ? -1 : 0) - (b.region_id === region.id ? -1 : 0));
    if (!candidatos.length) throw new HttpError(401, 'El usuario no existe');

    let u = null;
    for (const c of candidatos) {
      if (await bcrypt.compare(password, c.password).catch(() => false)) {
        u = c;
        break;
      }
    }
    if (!u) throw new HttpError(401, 'Error en la contraseña, vuelve a intentarlo');
    if (Number(u.estado) !== 1) throw new HttpError(403, 'El usuario aún no está activado');
    if (!(await puedeEntrar(u, region.id))) {
      throw new HttpError(403, `Tu usuario no tiene acceso a ${region.nombre}. Pide al administrador que te la asigne.`);
    }

    await execute('UPDATE usuarios SET ultimo_login = ? WHERE id = ?', [ahoraLocal(), u.id]);

    res.cookie(COOKIE_NAME, crearToken(u, region.id), opcionesCookie());
    res.json({
      status: 'success',
      user: usuarioPublico({ ...u, region_id: region.id, region_clave: region.clave, region_nombre: region.nombre }, await plantasDeUsuario(u)),
    });
  })
);

/** Cambia de planta sin volver a escribir la contraseña (si el usuario tiene acceso). */
router.post(
  '/cambiar-planta',
  requireAuth,
  ah(async (req, res) => {
    const yo = { ...req.user, region_id: req.user.region_planta };
    const planta = await puedeEntrar(yo, req.body?.region_id);
    if (!planta) throw new HttpError(403, 'No tienes acceso a esa planta');
    res.cookie(COOKIE_NAME, crearToken(yo, planta.id), opcionesCookie());
    res.json({
      status: 'success',
      user: usuarioPublico({ ...req.user, region_id: planta.id, region_clave: planta.clave, region_nombre: planta.nombre }, await plantasDeUsuario(yo)),
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
  requireAuth(req, res, async () => {
    try {
      const plantas = await plantasDeUsuario({ ...req.user, region_id: req.user.region_planta });
      res.json({ status: 'success', user: usuarioPublico(req.user, plantas) });
    } catch (e) {
      next(e);
    }
  }).catch(next);
});

export default router;
