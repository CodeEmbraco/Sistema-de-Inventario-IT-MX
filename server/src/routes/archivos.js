import { Router } from 'express';
import path from 'node:path';
import { execute, insert, limit, query, queryOne, top } from '../db.js';
import { ah, badRequest, idParam, notFound, ok } from '../lib/http.js';
import {
  borrarArchivo,
  copiarGuardado,
  existe,
  extension,
  guardarSubida,
  idUnico,
  nombreOriginal,
  rutaAbsoluta,
  subida,
} from '../lib/files.js';
import { registrarLog } from '../lib/inventario.js';

/*
 * Explorador de archivos de auditoría. Mismo funcionamiento que antes; cada planta
 * tiene su propio árbol de carpetas (todas las consultas filtran por region_id).
 */
const router = Router();
const MAX_MB = 500;
const upload = subida({ maxMB: MAX_MB });
const log = (id, accion, detalles, uid) => registrarLog('archivos_logs', 'archivo_id', id, accion, detalles, uid);

const EXTENSIONES = [
  // Imágenes
  'jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg',
  // Documentos
  'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'rtf', 'odt', 'ods', 'odp',
  // Comprimidos
  'zip', 'rar', '7z', 'tar', 'gz', 'bz2',
  // Audio
  'mp3', 'wav', 'ogg', 'flac', 'aac', 'm4a',
  // Video
  'mp4', 'avi', 'mov', 'wmv', 'mkv', 'flv', 'webm',
  // Otros
  'iso', 'exe', 'msi', 'dll', 'ini', 'cfg', 'log', 'csv', 'xml', 'json',
];

const ACTIVO = 'activo = 1 AND deleted_at IS NULL';
// Carpetas primero y luego archivos, por nombre (igual en SQL Server y MySQL)
const ORDEN = "ORDER BY CASE WHEN tipo = 'CARPETA' THEN 0 ELSE 1 END, nombre ASC";

function carpetaDe(valor) {
  if (valor === undefined || valor === null || valor === '' || valor === 'null') return null;
  const id = Number.parseInt(valor, 10);
  if (!Number.isInteger(id) || id <= 0) throw badRequest('Carpeta no válida');
  return id;
}

function condPadre(padreId) {
  return padreId === null
    ? { sql: 'carpeta_padre_id IS NULL', params: [] }
    : { sql: 'carpeta_padre_id = ?', params: [padreId] };
}

const buscarActivo = (id, region) =>
  queryOne(`SELECT * FROM archivos WHERE id = ? AND region_id = ? AND ${ACTIVO}`, [id, region]);

async function nombreOcupado(nombre, tipo, padreId, region, excluirId = null) {
  const p = condPadre(padreId);
  let sql = `SELECT id FROM archivos WHERE region_id = ? AND nombre = ? AND tipo = ? AND ${p.sql} AND ${ACTIVO}`;
  const params = [region, nombre, tipo, ...p.params];
  if (excluirId) {
    sql += ' AND id <> ?';
    params.push(excluirId);
  }
  return Boolean(await queryOne(sql, params));
}

/** Devuelve un nombre libre en la carpeta usando el patrón indicado. */
async function nombreLibre(nombre, tipo, padreId, region, patron) {
  if (!(await nombreOcupado(nombre, tipo, padreId, region))) return nombre;
  const ext = tipo === 'ARCHIVO' ? path.extname(nombre) : '';
  const base = ext ? nombre.slice(0, -ext.length) : nombre;
  for (let n = 1; ; n++) {
    const candidato = patron(base, n) + ext;
    if (!(await nombreOcupado(candidato, tipo, padreId, region))) return candidato;
  }
}

async function carpetaValida(id, region) {
  if (id === null) return true;
  return Boolean(
    await queryOne(`SELECT id FROM archivos WHERE id = ? AND region_id = ? AND tipo = 'CARPETA' AND ${ACTIVO}`, [id, region])
  );
}

/** ¿destino está dentro de carpetaId (o es ella misma)? */
async function esDescendiente(carpetaId, destinoId) {
  let actual = destinoId;
  const vistos = new Set();
  while (actual && !vistos.has(actual)) {
    if (actual === carpetaId) return true;
    vistos.add(actual);
    const row = await queryOne('SELECT carpeta_padre_id FROM archivos WHERE id = ?', [actual]);
    actual = row?.carpeta_padre_id ?? null;
  }
  return false;
}

async function eliminarRecursivo(carpetaId, region, usuarioId) {
  const hijos = await query(`SELECT * FROM archivos WHERE carpeta_padre_id = ? AND region_id = ? AND ${ACTIVO}`, [
    carpetaId,
    region,
  ]);
  for (const h of hijos) {
    if (h.tipo === 'CARPETA') await eliminarRecursivo(h.id, region, usuarioId);
    else if (h.ruta_fisica) await borrarArchivo(h.ruta_fisica);
    await execute('UPDATE archivos SET deleted_at = CURRENT_TIMESTAMP WHERE id = ?', [h.id]);
    await log(h.id, 'ELIMINAR', 'Elemento eliminado recursivamente', usuarioId);
  }
}

async function copiarArchivo(original, destinoId, nombre, region, usuarioId) {
  if (!original.ruta_fisica || !(await existe(original.ruta_fisica))) {
    throw new Error(`Archivo físico no encontrado para ID ${original.id}`);
  }
  const ext = original.extension || extension(original.ruta_fisica);
  // La copia queda en la misma carpeta (y planta) que el original
  const nuevaRuta = `${path.posix.dirname(original.ruta_fisica)}/${idUnico()}.${ext}`;
  await copiarGuardado(original.ruta_fisica, nuevaRuta);
  try {
    const id = await insert('archivos', {
      region_id: region,
      nombre,
      tipo: 'ARCHIVO',
      extension: original.extension,
      tamaño: original['tamaño'],
      ruta_fisica: nuevaRuta,
      carpeta_padre_id: destinoId,
      usuario_id: usuarioId,
    });
    await log(id, 'COPIAR', `Copiado de archivo ID ${original.id}`, usuarioId);
    return id;
  } catch (err) {
    await borrarArchivo(nuevaRuta);
    throw err;
  }
}

async function copiarCarpetaRecursiva(carpetaId, destinoId, nombre, region, usuarioId) {
  const nuevaId = await insert('archivos', {
    region_id: region,
    nombre,
    tipo: 'CARPETA',
    carpeta_padre_id: destinoId,
    usuario_id: usuarioId,
  });
  await log(nuevaId, 'COPIAR', `Copiado de carpeta ID ${carpetaId}`, usuarioId);

  const hijos = await query(`SELECT * FROM archivos WHERE carpeta_padre_id = ? AND region_id = ? AND ${ACTIVO}`, [
    carpetaId,
    region,
  ]);
  for (const h of hijos) {
    if (h.tipo === 'CARPETA') await copiarCarpetaRecursiva(h.id, nuevaId, h.nombre, region, usuarioId);
    else await copiarArchivo(h, nuevaId, h.nombre, region, usuarioId).catch(() => {});
  }
  return nuevaId;
}

function resumen(res, cantidad, verbo, errores) {
  if (cantidad > 0) {
    let message = `${cantidad} elemento(s) ${verbo} correctamente`;
    if (errores.length) message += ` con ${errores.length} error(es)`;
    return ok(res, message, errores.length ? { errores } : {});
  }
  throw badRequest('No se pudo procesar ningún elemento', errores.length ? { errores } : {});
}

// ---------------------------------------------------------------- Lectura

router.get(
  '/',
  ah(async (req, res) => {
    const p = condPadre(carpetaDe(req.query.carpeta));
    const rows = await query(`SELECT * FROM archivos WHERE region_id = ? AND ${p.sql} AND ${ACTIVO} ${ORDEN}`, [
      req.region,
      ...p.params,
    ]);
    res.json({ status: 'success', data: rows });
  })
);

router.get(
  '/sidebar',
  ah(async (req, res) => {
    const raices = await query(
      `SELECT * FROM archivos WHERE region_id = ? AND tipo = 'CARPETA' AND carpeta_padre_id IS NULL AND ${ACTIVO} ORDER BY nombre`,
      [req.region]
    );
    for (const r of raices) {
      r.hijos = await query(
        `SELECT * FROM archivos WHERE region_id = ? AND tipo = 'CARPETA' AND carpeta_padre_id = ? AND ${ACTIVO} ORDER BY nombre`,
        [req.region, r.id]
      );
    }
    res.json({ status: 'success', data: raices });
  })
);

router.get(
  '/buscar',
  ah(async (req, res) => {
    const termino = String(req.query.termino || '');
    if (!termino) throw badRequest('Término de búsqueda no especificado');
    const carpeta = carpetaDe(req.query.carpeta);
    const like = `%${termino}%`;
    const rows = carpeta
      ? await query(
          `SELECT * FROM archivos WHERE region_id = ? AND nombre LIKE ? AND carpeta_padre_id = ? AND ${ACTIVO} ${ORDEN}`,
          [req.region, like, carpeta]
        )
      : await query(
          `SELECT ${top(100)} * FROM archivos WHERE region_id = ? AND nombre LIKE ? AND ${ACTIVO} ${ORDEN} ${limit(100)}`,
          [req.region, like]
        );
    res.json({ status: 'success', data: rows });
  })
);

router.get(
  '/:id',
  ah(async (req, res) => {
    const row = await buscarActivo(idParam(req), req.region);
    if (!row) throw notFound('Elemento no encontrado');
    res.json({ status: 'success', data: row });
  })
);

router.get(
  '/:id/breadcrumb',
  ah(async (req, res) => {
    const ruta = [];
    let actual = idParam(req);
    const vistos = new Set();
    while (actual && !vistos.has(actual)) {
      vistos.add(actual);
      const row = await queryOne(
        `SELECT id, nombre, carpeta_padre_id FROM archivos WHERE id = ? AND region_id = ? AND ${ACTIVO}`,
        [actual, req.region]
      );
      if (!row) break;
      ruta.unshift(row);
      actual = row.carpeta_padre_id;
    }
    res.json({ status: 'success', data: ruta });
  })
);

router.get(
  '/:id/logs',
  ah(async (req, res) => {
    const rows = await query(
      `SELECT l.*, u.nombre AS usuario_nombre, a.nombre AS archivo_nombre
       FROM archivos_logs l
       JOIN usuarios u ON l.usuario_id = u.id
       JOIN archivos a ON l.archivo_id = a.id
       WHERE l.archivo_id = ? AND a.region_id = ?
       ORDER BY l.created_at DESC, l.id DESC`,
      [idParam(req), req.region]
    );
    res.json({ status: 'success', data: rows });
  })
);

/** Descarga (o muestra en el navegador con ?inline=1) usando el nombre original. */
router.get(
  '/:id/descargar',
  ah(async (req, res) => {
    const row = await buscarActivo(idParam(req), req.region);
    if (!row || row.tipo !== 'ARCHIVO') throw notFound('Archivo no encontrado');
    const abs = rutaAbsoluta(row.ruta_fisica);
    if (!abs || !(await existe(row.ruta_fisica))) throw notFound('El archivo físico no existe en el servidor');

    if (req.query.inline === '1') {
      res.attachment(row.nombre);
      res.setHeader('Content-Disposition', res.get('Content-Disposition').replace(/^attachment/, 'inline'));
      return res.sendFile(abs);
    }
    res.download(abs, row.nombre);
  })
);

// ---------------------------------------------------------------- Escritura

router.post(
  '/carpetas',
  ah(async (req, res) => {
    const nombre = String(req.body?.nombre ?? '').trim();
    const padre = carpetaDe(req.body?.carpeta_padre_id);
    if (!nombre) throw badRequest('El nombre de la carpeta no puede estar vacío');
    if (/[\\/]/.test(nombre)) throw badRequest('El nombre no puede contener / ni \\');
    if (!(await carpetaValida(padre, req.region))) throw badRequest('La carpeta de destino no existe');
    if (await nombreOcupado(nombre, 'CARPETA', padre, req.region)) {
      throw badRequest('Ya existe una carpeta con ese nombre en esta ubicación');
    }
    const id = await insert('archivos', {
      region_id: req.region,
      nombre,
      tipo: 'CARPETA',
      carpeta_padre_id: padre,
      usuario_id: req.user.id,
    });
    await log(id, 'CREAR', `Carpeta creada: ${nombre}`, req.user.id);
    ok(res, 'Carpeta creada correctamente', { id });
  })
);

router.post(
  '/subir',
  upload.array('archivos'),
  ah(async (req, res) => {
    const files = req.files || [];
    if (!files.length) throw badRequest('No se seleccionaron archivos');
    const padre = carpetaDe(req.body?.carpeta_padre_id);
    if (!(await carpetaValida(padre, req.region))) throw badRequest('La carpeta de destino no existe');

    let subidos = 0;
    const errores = [];
    for (const file of files) {
      let nombre = nombreOriginal(file);
      const ext = extension(nombre);
      if (!EXTENSIONES.includes(ext)) {
        errores.push(`${nombre}: Tipo de archivo no permitido`);
        continue;
      }
      nombre = await nombreLibre(nombre, 'ARCHIVO', padre, req.region, (base, n) => `${base} (${n})`);
      const rel = await guardarSubida(file, `uploads/${req.user.region_clave}/archivos/${idUnico()}.${ext}`);
      try {
        const id = await insert('archivos', {
          region_id: req.region,
          nombre,
          tipo: 'ARCHIVO',
          extension: ext,
          tamaño: file.size,
          ruta_fisica: rel,
          carpeta_padre_id: padre,
          usuario_id: req.user.id,
        });
        await log(id, 'CREAR', `Archivo subido: ${nombre} (${formatBytes(file.size)})`, req.user.id);
        subidos++;
      } catch {
        await borrarArchivo(rel);
        errores.push(`${nombre}: Error al guardar en base de datos`);
      }
    }
    resumen(res, subidos, 'subido(s)', errores);
  })
);

router.patch(
  '/:id',
  ah(async (req, res) => {
    const id = idParam(req);
    const nombre = String(req.body?.nombre ?? '').trim();
    if (!nombre) throw badRequest('El nombre no puede estar vacío');
    if (/[\\/]/.test(nombre)) throw badRequest('El nombre no puede contener / ni \\');

    const actual = await buscarActivo(id, req.region);
    if (!actual) throw notFound('Elemento no encontrado');
    if (await nombreOcupado(nombre, actual.tipo, actual.carpeta_padre_id, req.region, id)) {
      throw badRequest('Ya existe un elemento con ese nombre en esta ubicación');
    }
    await execute('UPDATE archivos SET nombre = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [nombre, id]);
    await log(id, 'RENOMBRAR', `Renombrado: ${actual.nombre} -> ${nombre}`, req.user.id);
    ok(res, 'Elemento renombrado correctamente');
  })
);

router.post(
  '/eliminar',
  ah(async (req, res) => {
    let ids = req.body?.ids ?? [];
    if (!Array.isArray(ids)) ids = [ids];
    ids = ids.map((x) => Number.parseInt(x, 10)).filter((x) => Number.isInteger(x) && x > 0);
    if (!ids.length) throw badRequest('Faltan campos obligatorios');

    let eliminados = 0;
    const errores = [];
    for (const id of ids) {
      const el = await buscarActivo(id, req.region);
      if (!el) {
        errores.push(`Elemento ID ${id} no encontrado`);
        continue;
      }
      if (el.tipo === 'ARCHIVO' && el.ruta_fisica) await borrarArchivo(el.ruta_fisica);
      if (el.tipo === 'CARPETA') await eliminarRecursivo(id, req.region, req.user.id);
      await execute('UPDATE archivos SET deleted_at = CURRENT_TIMESTAMP WHERE id = ?', [id]);
      await log(id, 'ELIMINAR', `Elemento eliminado: ${el.nombre}`, req.user.id);
      eliminados++;
    }
    resumen(res, eliminados, 'eliminado(s)', errores);
  })
);

router.post(
  '/pegar',
  ah(async (req, res) => {
    let items = req.body?.items ?? [];
    if (!Array.isArray(items)) items = [items];
    items = items.map((x) => Number.parseInt(x, 10)).filter((x) => Number.isInteger(x) && x > 0);
    const operacion = req.body?.operacion;
    const destino = carpetaDe(req.body?.destino);
    const region = req.region;

    if (!items.length || !['CORTAR', 'COPIAR'].includes(operacion)) throw badRequest('Faltan campos obligatorios');
    if (!(await carpetaValida(destino, region))) throw badRequest('La carpeta de destino no existe');

    let pegados = 0;
    const errores = [];
    for (const itemId of items) {
      const original = await buscarActivo(itemId, region);
      if (!original) {
        errores.push(`Elemento ID ${itemId} no encontrado`);
        continue;
      }

      try {
        if (operacion === 'CORTAR') {
          if (original.carpeta_padre_id === destino) {
            pegados++; // ya está aquí: no hay nada que mover
            continue;
          }
          if (original.tipo === 'CARPETA' && (await esDescendiente(itemId, destino))) {
            errores.push(`No se puede mover una carpeta dentro de sí misma: ${original.nombre}`);
            continue;
          }
          const nombre = await nombreLibre(original.nombre, original.tipo, destino, region, (b, n) => `${b} - Copia (${n})`);
          await execute(
            'UPDATE archivos SET nombre = ?, carpeta_padre_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [nombre, destino, itemId]
          );
          await log(itemId, 'MOVER', `Movido a carpeta ID: ${destino ?? 'Raíz'}`, req.user.id);
          pegados++;
        } else {
          if (original.tipo === 'CARPETA' && (await esDescendiente(itemId, destino))) {
            errores.push(`No se puede copiar una carpeta dentro de sí misma: ${original.nombre}`);
            continue;
          }
          const nombre = await nombreLibre(original.nombre, original.tipo, destino, region, (b, n) => `${b} - Copia (${n})`);
          if (original.tipo === 'CARPETA') await copiarCarpetaRecursiva(itemId, destino, nombre, region, req.user.id);
          else await copiarArchivo(original, destino, nombre, region, req.user.id);
          pegados++;
        }
      } catch (err) {
        errores.push(err.message || `Error al pegar ID ${itemId}`);
      }
    }
    resumen(res, pegados, 'pegado(s)', errores);
  })
);

function formatBytes(bytes) {
  if (!bytes) return '0 Bytes';
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.min(sizes.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
  return `${(bytes / 1024 ** i).toFixed(2)} ${sizes[i]}`;
}

export { MAX_MB };
export default router;
