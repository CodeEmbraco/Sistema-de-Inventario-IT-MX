import { Router } from 'express';
import net from 'node:net';
import { execute, insert, query, queryOne } from '../db.js';
import { ah, aBool, badRequest, describirCambios, idParam, notFound, ok, requerido, vacioANull } from '../lib/http.js';
import { borrarArchivo, EXT_IMAGEN, extension, guardarSubida, nombreOriginal, segundosUnix, subida } from '../lib/files.js';
import { filtroEstado, registrarLog, rutaSugerencias } from '../lib/inventario.js';
import { consultarToner } from '../lib/snmp.js';

const router = Router();
const upload = subida({ maxMB: 5 });
const log = (id, accion, detalles, uid) => registrarLog('impresoras_logs', 'impresora_id', id, accion, detalles, uid);

function decorar(row) {
  return { ...row, has_foto: Boolean(row.foto) };
}

function leerCuerpo(body) {
  const d = {
    nombre: String(body.nombre ?? '').trim(),
    marca: vacioANull(body.marca),
    modelo: vacioANull(body.modelo),
    serie: String(body.serie ?? '').trim(),
    ubicacion: vacioANull(body.ubicacion),
    ip: vacioANull(String(body.ip ?? '').trim()),
    activo: aBool(body.activo),
  };
  if (!requerido(d.nombre) || !requerido(d.serie)) throw badRequest('Faltan campos obligatorios');
  if (d.ip && !net.isIPv4(d.ip)) throw badRequest('La dirección IP no es válida (ej. 192.168.1.50)');
  return d;
}

rutaSugerencias(router, 'impresoras', { modelos: 'modelo', marcas: 'marca', ubicaciones: 'ubicacion' });

router.get(
  '/',
  ah(async (req, res) => {
    let sql = 'SELECT * FROM impresoras WHERE region_id = ? AND deleted_at IS NULL' + filtroEstado(req.query.estado);
    const params = [req.region];
    if (req.query.busqueda) {
      const b = `%${req.query.busqueda}%`;
      sql += ' AND (serie LIKE ? OR nombre LIKE ? OR marca LIKE ? OR modelo LIKE ?)';
      params.push(b, b, b, b);
    }
    sql += ' ORDER BY id DESC';
    res.json((await query(sql, params)).map(decorar));
  })
);

router.get(
  '/:id',
  ah(async (req, res) => {
    const row = await queryOne('SELECT * FROM impresoras WHERE id = ? AND region_id = ? AND deleted_at IS NULL', [idParam(req), req.region]);
    if (!row) throw notFound('Impresora no encontrada');
    res.json({ status: 'success', data: decorar(row) });
  })
);

router.get(
  '/:id/toner',
  ah(async (req, res) => {
    // La IP se toma de la BD (no del navegador) para no permitir consultas a equipos arbitrarios
    const row = await queryOne('SELECT ip, activo FROM impresoras WHERE id = ? AND region_id = ? AND deleted_at IS NULL', [
      idParam(req),
      req.region,
    ]);
    if (!row) throw notFound('Impresora no encontrada');
    if (!row.ip) return res.json({ status: 'error', message: 'IP no configurada' });
    if (Number(row.activo) !== 1) return res.json({ status: 'error', message: 'Requiere IP y estar activa' });

    const toners = await consultarToner(row.ip);
    if (!toners.length) {
      return res.json({ status: 'error', message: 'Fuera de línea / Sin soporte SNMP para consumibles' });
    }
    ok(res, 'Niveles obtenidos correctamente', { toners, porcentaje: toners[0].porcentaje });
  })
);

router.post(
  '/',
  ah(async (req, res) => {
    const d = leerCuerpo(req.body);
    if (await queryOne('SELECT id FROM impresoras WHERE serie = ? AND region_id = ? AND deleted_at IS NULL', [d.serie, req.region])) {
      throw badRequest('El número de serie ya existe en el sistema');
    }
    const id = await insert('impresoras', { ...d, region_id: req.region, usuario_id: req.user.id });
    await log(id, 'CREAR', `Impresora creada: ${d.nombre} (Serie: ${d.serie})`, req.user.id);
    ok(res, 'Impresora creada correctamente', { impresora_id: id });
  })
);

router.put(
  '/:id',
  ah(async (req, res) => {
    const id = idParam(req);
    const d = leerCuerpo(req.body);

    const antes = await queryOne('SELECT * FROM impresoras WHERE id = ? AND region_id = ? AND deleted_at IS NULL', [id, req.region]);
    if (!antes) throw notFound('Impresora no encontrada');
    if (
      await queryOne('SELECT id FROM impresoras WHERE serie = ? AND id <> ? AND region_id = ? AND deleted_at IS NULL', [
        d.serie,
        id,
        req.region,
      ])
    ) {
      throw badRequest('El número de serie ya existe en otra impresora');
    }

    // Nota: el PHP no guardaba la IP al editar; aquí sí se actualiza
    await execute(
      `UPDATE impresoras SET nombre = ?, marca = ?, modelo = ?, serie = ?, ubicacion = ?, ip = ?, activo = ?,
         updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [d.nombre, d.marca, d.modelo, d.serie, d.ubicacion, d.ip, d.activo, id]
    );
    const cambios = describirCambios(antes, d, ['nombre', 'marca', 'modelo', 'serie', 'ubicacion', 'ip', 'activo']);
    await log(id, 'EDITAR', `Impresora actualizada: ${d.nombre}. Cambios: ${cambios}`, req.user.id);
    ok(res, 'Impresora actualizada correctamente');
  })
);

router.post(
  '/:id/foto',
  upload.single('foto'),
  ah(async (req, res) => {
    const id = idParam(req);
    if (!req.file) throw badRequest('No se seleccionó ningún archivo o hubo un error en la subida');
    const ext = extension(nombreOriginal(req.file));
    if (!EXT_IMAGEN.includes(ext)) {
      throw badRequest('Tipo de archivo no permitido. Use imágenes (JPG, PNG, GIF, BMP, WEBP)');
    }

    const actual = await queryOne('SELECT foto FROM impresoras WHERE id = ? AND region_id = ? AND deleted_at IS NULL', [id, req.region]);
    if (!actual) throw notFound('Impresora no encontrada');

    const nombre = `impresora_${id}_${segundosUnix()}.${ext}`;
    const rel = await guardarSubida(req.file, `uploads/${req.user.region_clave}/fotos_impresoras/${nombre}`);
    await execute('UPDATE impresoras SET foto = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [rel, id]);
    if (actual.foto && actual.foto !== rel) await borrarArchivo(actual.foto);

    await log(id, 'EDITAR', `Foto subida: ${nombre}`, req.user.id);
    ok(res, 'Foto subida correctamente', { foto_url: rel });
  })
);

router.delete(
  '/:id/foto',
  ah(async (req, res) => {
    const id = idParam(req);
    const actual = await queryOne('SELECT foto FROM impresoras WHERE id = ? AND region_id = ? AND deleted_at IS NULL', [id, req.region]);
    if (!actual?.foto) throw badRequest('No hay foto para eliminar');

    await borrarArchivo(actual.foto);
    await execute('UPDATE impresoras SET foto = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [id]);
    await log(id, 'EDITAR', `Foto eliminada: ${actual.foto.split('/').pop()}`, req.user.id);
    ok(res, 'Foto eliminada correctamente');
  })
);

router.delete(
  '/:id',
  ah(async (req, res) => {
    const id = idParam(req);
    const d = await queryOne('SELECT nombre, serie, foto FROM impresoras WHERE id = ? AND region_id = ? AND deleted_at IS NULL', [
      id,
      req.region,
    ]);
    if (!d) throw notFound('Impresora no encontrada');

    if (d.foto) await borrarArchivo(d.foto);
    await execute('UPDATE impresoras SET deleted_at = CURRENT_TIMESTAMP, foto = NULL WHERE id = ?', [id]);
    await log(id, 'ELIMINAR', `Impresora eliminada: ${d.nombre} (Serie: ${d.serie})`, req.user.id);
    ok(res, 'Impresora eliminada correctamente');
  })
);

export default router;
