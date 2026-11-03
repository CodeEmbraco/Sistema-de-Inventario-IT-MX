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

function formatoLista(u, i) {
  return {
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
    const rows = await query('SELECT * FROM usuarios WHERE region_id = ? ORDER BY id DESC', [req.region]);
    res.json(rows.map(formatoLista));
  })
);

router.get(
  '/existe',
  ah(async (req, res) => {
    const usuario = String(req.query.usuario || '').trim();
    const row = usuario
      ? await queryOne('SELECT id FROM usuarios WHERE usuario = ? AND region_id = ?', [usuario, req.region])
      : null;
    res.json({ existe: Boolean(row) });
  })
);

router.get(
  '/:id',
  ah(async (req, res) => {
    const u = await queryOne('SELECT * FROM usuarios WHERE id = ? AND region_id = ?', [idParam(req), req.region]);
    if (!u) throw notFound('Usuario no encontrado');
    // A diferencia del PHP, nunca devolvemos el hash de la contraseña al navegador
    const { password, ...resto } = u;
    res.json({ status: 'success', data: { ...resto, foto: u.foto || FOTO_DEFAULT } });
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

    if (await queryOne('SELECT id FROM usuarios WHERE usuario = ? AND region_id = ?', [usuario, req.region])) {
      throw badRequest('El usuario ya existe en esta planta');
    }

    const hash = await bcrypt.hash(password, 12);
    const foto = req.file ? await guardarFotoUsuario(req.file, usuario) : FOTO_DEFAULT;

    await insert('usuarios', {
      region_id: req.region,
      nombre,
      usuario,
      password: hash,
      perfil,
      foto,
      estado: 1,
      ultimo_login: null, // nunca ha iniciado sesión
    });
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

    const actual = await queryOne('SELECT * FROM usuarios WHERE id = ? AND region_id = ?', [id, req.region]);
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
    ok(res, 'Usuario actualizado correctamente');
  })
);

router.patch(
  '/:id/estado',
  ah(async (req, res) => {
    const id = idParam(req);
    const estado = Number(req.body?.estado) === 1 ? 1 : 0;
    if (id === req.user.id && estado === 0) throw badRequest('No puedes desactivar tu propio usuario');
    const r = await execute('UPDATE usuarios SET estado = ? WHERE id = ? AND region_id = ?', [estado, id, req.region]);
    if (!r.affectedRows) throw notFound('Usuario no encontrado');
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
