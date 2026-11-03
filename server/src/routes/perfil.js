import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { col, execute, queryOne } from '../db.js';
import { ah, badRequest, ok } from '../lib/http.js';
import { subida } from '../lib/files.js';
import { FOTO_DEFAULT } from '../config.js';
import { borrarFotoUsuario, guardarFotoUsuario, validarFoto } from './usuarios.js';
import { usuarioPublico } from './auth.js';

const router = Router();
const upload = subida({ maxMB: 2 });

router.get(
  '/',
  ah(async (req, res) => {
    const u = await queryOne(
      'SELECT id, nombre, usuario, perfil, foto, estado, ultimo_login FROM usuarios WHERE id = ?',
      [req.user.id]
    );
    res.json({
      status: 'success',
      data: {
        ...u,
        foto: u.foto || FOTO_DEFAULT,
        ultimo_login: !u.ultimo_login || String(u.ultimo_login).startsWith('0000') ? null : u.ultimo_login,
      },
    });
  })
);

router.post(
  '/foto',
  upload.single('foto'),
  ah(async (req, res) => {
    if (!req.file) throw badRequest('Selecciona una imagen');
    validarFoto(req.file);

    const u = await queryOne('SELECT usuario, foto FROM usuarios WHERE id = ?', [req.user.id]);
    const nueva = await guardarFotoUsuario(req.file, u.usuario);
    await execute('UPDATE usuarios SET foto = ? WHERE id = ?', [nueva, req.user.id]);
    await borrarFotoUsuario(u.foto);

    ok(res, 'Foto actualizada correctamente', { user: usuarioPublico({ ...req.user, foto: nueva }) });
  })
);

router.post(
  '/password',
  ah(async (req, res) => {
    // Sin reglas de formato: se acepta cualquier contraseña (solo que no esté vacía y coincida)
    const nueva = String(req.body?.nuevaPassword ?? '');
    const confirmar = String(req.body?.confirmarPassword ?? '');
    if (!nueva) throw badRequest('Escribe la nueva contraseña');
    if (nueva !== confirmar) throw badRequest('Las contraseñas no coinciden');

    await execute(`UPDATE usuarios SET ${col('password')} = ? WHERE id = ?`, [await bcrypt.hash(nueva, 12), req.user.id]);
    ok(res, 'Contraseña actualizada correctamente');
  })
);

export default router;
