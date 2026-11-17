import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { col, esErrorLlaveForanea, execute, insert, query, queryOne } from '../db.js';
import { ah, badRequest, idParam, notFound, ok, requerido } from '../lib/http.js';
import { borrarArchivo, borrarCarpeta, guardarSubida, idUnico, subida } from '../lib/files.js';
import { FOTO_DEFAULT } from '../config.js';

const router = Router();
const upload = subida({ maxMB: 2 });

const TIPOS_FOTO = { 'image/jpeg': 'jpg', 'image/png': 'png' };
const PERFILES = ['Administrador', 'Usuario'];

export function validarFoto(file) {
  if (!file) return;
  if (!TIPOS_FOTO[file.mimetype]) throw badRequest('La imagen debe estar en formato JPG o PNG');
}

/**
 * Nombre de carpeta seguro para las fotos de un usuario. El usuario puede llevar cualquier
 * carácter, pero en la ruta del disco solo dejamos letras, números, punto, guion y guion bajo.
 * Para usuarios de solo letras y números da lo mismo que antes (compatibilidad con el PHP).
 */
export function carpetaUsuario(usuario) {
  const limpio = String(usuario)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/^\.+/, '_');
  return `vistas/img/usuarios/${limpio || '_'}`;
}

/** Guarda la foto en vistas/img/usuarios/<usuario>/ (misma ruta que usaba PHP). */
export async function guardarFotoUsuario(file, usuario) {
  const rel = `${carpetaUsuario(usuario)}/${idUnico()}.${TIPOS_FOTO[file.mimetype]}`;
  return guardarSubida(file, rel);
}

export async function borrarFotoUsuario(foto) {
  if (foto && foto !== FOTO_DEFAULT && !foto.includes('/default/')) await borrarArchivo(foto);
}

/**
 * Usuarios visibles en una planta: los de la planta y los de otras plantas a los que se les
 * dio acceso a esta. Los administradores entran a todas las plantas sin estar en la lista.
 */
const VISIBLE = `(region_id = ? OR id IN (SELECT usuario_id FROM usuario_regiones WHERE region_id = ?))`;

async function buscarVisible(id, region) {
  return queryOne(`SELECT * FROM usuarios WHERE id = ? AND ${VISIBLE}`, [id, region, region]);
}

/** Lee las plantas marcadas en el formulario (JSON "[1,2]" o "1,2"). */
async function leerPlantas(valor) {
  let ids = [];
  try {
    ids = Array.isArray(valor) ? valor : JSON.parse(valor ?? '[]');
  } catch {
    ids = String(valor ?? '').split(',');
  }
  ids = [...new Set(ids.map((x) => Number.parseInt(x, 10)).filter(Number.isInteger))];
  const validas = new Set((await query('SELECT id FROM regiones')).map((r) => r.id));
  return ids.filter((x) => validas.has(x));
}

async function guardarPlantas(usuarioId, plantaOrigen, ids) {
  await execute('DELETE FROM usuario_regiones WHERE usuario_id = ?', [usuarioId]);
  for (const r of ids) {
    if (r !== plantaOrigen) await execute('INSERT INTO usuario_regiones (usuario_id, region_id) VALUES (?, ?)', [usuarioId, r]);
  }
}

async function plantasDe(usuarioIds) {
  if (!usuarioIds.length) return new Map();
  const rows = await query(
    `SELECT usuario_id, region_id FROM usuario_regiones WHERE usuario_id IN (${usuarioIds.map(() => '?').join(',')})`,
    usuarioIds
  );
  const m = new Map();
  for (const r of rows) m.set(r.usuario_id, [...(m.get(r.usuario_id) || []), r.region_id]);
  return m;
}

function formatoLista(u, i) {
  return {
    region_id: u.region_id,
    planta_origen: u.planta_nombre,
    plantas: u.plantas,
    contador: i + 1,
    id: u.id,
    nombre: u.nombre,
    usuario: u.usuario,
    foto: u.foto || FOTO_DEFAULT,
    perfil: u.perfil,
    estado: Number(u.estado),
    ultimo_login: !u.ultimo_login || String(u.ultimo_login).startsWith('0000') ? 'Nunca' : u.ultimo_login,
  };
}

router.get(
  '/',
  ah(async (req, res) => {
    const rows = await query(
      `SELECT u.*, r.nombre AS planta_nombre FROM usuarios u JOIN regiones r ON r.id = u.region_id
       WHERE u.region_id = ? OR u.id IN (SELECT usuario_id FROM usuario_regiones WHERE region_id = ?)
       ORDER BY u.id DESC`,
      [req.region, req.region]
    );
    const extra = await plantasDe(rows.map((r) => r.id));
    for (const r of rows) {
      r.plantas = r.perfil === 'Administrador' ? 'todas' : [r.region_id, ...(extra.get(r.id) || [])];
    }
    res.json(rows.map(formatoLista));
  })
);

router.get(
  '/existe',
  ah(async (req, res) => {
    const usuario = String(req.query.usuario || '').trim();
    const row = usuario
      ? await queryOne('SELECT id FROM usuarios WHERE usuario = ?', [usuario])
      : null;
    res.json({ existe: Boolean(row) });
  })
);

router.get(
  '/:id',
  ah(async (req, res) => {
    const u = await buscarVisible(idParam(req), req.region);
    if (!u) throw notFound('Usuario no encontrado');
    // A diferencia del PHP, nunca devolvemos el hash de la contraseña al navegador
    const { password, ...resto } = u;
    const extra = (await plantasDe([u.id])).get(u.id) || [];
    res.json({ status: 'success', data: { ...resto, plantas: [u.region_id, ...extra], foto: u.foto || FOTO_DEFAULT } });
  })
);

router.post(
  '/',
  upload.single('foto'),
  ah(async (req, res) => {
    const nombre = String(req.body.nombre ?? '').trim();
    const usuario = String(req.body.usuario ?? '').trim();
    const password = String(req.body.password ?? '');
    const perfil = String(req.body.perfil ?? '');

    if (!requerido(nombre) || !requerido(usuario) || !requerido(password) || !requerido(perfil)) {
      throw badRequest('Faltan campos obligatorios');
    }
    if (!PERFILES.includes(perfil)) throw badRequest('Perfil no válido');
    validarFoto(req.file);

    // El nombre de usuario no se repite en ninguna planta (así puede cambiar de planta sin confusión)
    if (await queryOne('SELECT id FROM usuarios WHERE usuario = ?', [usuario])) {
      throw badRequest('Ese nombre de usuario ya existe');
    }
    const plantas = await leerPlantas(req.body.plantas);

    const hash = await bcrypt.hash(password, 12);
    const foto = req.file ? await guardarFotoUsuario(req.file, usuario) : FOTO_DEFAULT;

    const nuevoId = await insert('usuarios', {
      region_id: req.region,
      nombre,
      usuario,
      password: hash,
      perfil,
      foto,
      estado: 1,
      ultimo_login: null, // nunca ha iniciado sesión
    });
    await guardarPlantas(nuevoId, req.region, plantas);
    ok(res, 'Usuario creado correctamente');
  })
);

router.put(
  '/:id',
  upload.single('foto'),
  ah(async (req, res) => {
    const id = idParam(req);
    const nombre = String(req.body.nombre ?? '').trim();
    const perfil = String(req.body.perfil ?? '');
    const password = String(req.body.password ?? '');

    if (!requerido(nombre) || !requerido(perfil)) throw badRequest('Faltan campos obligatorios');
    if (!PERFILES.includes(perfil)) throw badRequest('Perfil no válido');
    validarFoto(req.file);

    const actual = await buscarVisible(id, req.region);
    if (!actual) throw notFound('Usuario no encontrado');

    if (id === req.user.id && perfil !== 'Administrador') {
      throw badRequest('No puedes quitarte a ti mismo el perfil de Administrador');
    }

    const hash = password ? await bcrypt.hash(password, 12) : actual.password;

    let foto = actual.foto;
    if (req.file) {
      foto = await guardarFotoUsuario(req.file, actual.usuario);
      await borrarFotoUsuario(actual.foto);
    }

    await execute(`UPDATE usuarios SET nombre = ?, ${col('password')} = ?, perfil = ?, foto = ? WHERE id = ?`, [
      nombre,
      hash,
      perfil,
      foto,
      id,
    ]);
    if (req.body.plantas !== undefined) await guardarPlantas(id, actual.region_id, await leerPlantas(req.body.plantas));
    ok(res, 'Usuario actualizado correctamente');
  })
);

router.patch(
  '/:id/estado',
  ah(async (req, res) => {
    const id = idParam(req);
    const estado = Number(req.body?.estado) === 1 ? 1 : 0;
    if (id === req.user.id && estado === 0) throw badRequest('No puedes desactivar tu propio usuario');
    if (!(await buscarVisible(id, req.region))) throw notFound('Usuario no encontrado');
    await execute('UPDATE usuarios SET estado = ? WHERE id = ?', [estado, id]);
    ok(res, 'Estado del usuario actualizado');
  })
);

router.delete(
  '/:id',
  ah(async (req, res) => {
    const id = idParam(req);
    const u = await queryOne('SELECT * FROM usuarios WHERE id = ? AND region_id = ?', [id, req.region]);
    if (!u) throw notFound('Usuario no encontrado');
    if (u.usuario === 'admin') throw badRequest('No se puede eliminar al usuario administrador principal');
    if (id === req.user.id) throw badRequest('No puedes eliminar tu propio usuario');

    // Los registros de inventario y bitácoras apuntan al usuario: si tiene historial, no se puede borrar
    try {
      await execute('DELETE FROM usuarios WHERE id = ?', [id]);
    } catch (err) {
      if (esErrorLlaveForanea(err)) {
        throw badRequest(
          'Este usuario tiene registros o historial en el sistema y no se puede eliminar. Desactívalo en su lugar.'
        );
      }
      throw err;
    }

    await borrarFotoUsuario(u.foto);
    // Solo se borra la carpeta si ningún otro usuario comparte el mismo nombre de carpeta
    const carpeta = carpetaUsuario(u.usuario);
    const otros = await query('SELECT usuario FROM usuarios');
    if (!otros.some((o) => carpetaUsuario(o.usuario) === carpeta)) await borrarCarpeta(carpeta);
    ok(res, 'Usuario eliminado correctamente');
  })
);

export default router;
