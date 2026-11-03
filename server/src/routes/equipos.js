/**
 * Router genérico para los módulos de inventario definidos en src/modulos.js
 * (Celulares, Cómputo administrativo, Cómputo industrial, Monitores, Proyectores).
 *
 *   GET    /                    ?estado=asignado|sin_asignar  ?tipo_equipo=PC|LAPTOP (módulos con subtipos)
 *   GET    /sugerencias/:campo  ?search=
 *   GET    /:id
 *   GET    /:id/historial
 *   POST   /
 *   PUT    /:id
 *   DELETE /:id
 *   POST   /:id/archivo         (solo módulos con archivo adjunto, ej. responsiva)
 *   DELETE /:id/archivo
 *
 * Todo se filtra por la planta de la sesión (req.region).
 */
import { Router } from 'express';
import { execute, insert, query, queryOne } from '../db.js';
import { ah, aBool, badRequest, idParam, notFound, ok } from '../lib/http.js';
import { borrarArchivo, EXT_IMAGEN, extension, guardarSubida, nombreOriginal, segundosUnix, subida } from '../lib/files.js';
import { sugerencias } from '../lib/inventario.js';
import { ETIQUETAS } from '../modulos.js';

const FECHA = /^\d{4}-\d{2}-\d{2}$/;

export function crearRouterEquipos(clave, cfg) {
  const router = Router();
  const { tabla, campos, archivo, subtipos } = cfg;
  const nombres = Object.keys(campos);
  const upload = archivo ? subida({ maxMB: archivo.maxMB }) : null;

  const log = (region, id, accion, detalles, uid) =>
    insert('inventario_logs', { region_id: region, modulo: clave, registro_id: id, accion, detalles, usuario_id: uid });

  const buscar = (id, region) =>
    queryOne(`SELECT * FROM ${tabla} WHERE id = ? AND region_id = ? AND deleted_at IS NULL`, [id, region]);

  function decorar(row) {
    if (!archivo) return row;
    const ruta = row[archivo.columna];
    return {
      ...row,
      has_archivo: Boolean(ruta),
      archivo_tipo: ruta ? (EXT_IMAGEN.includes(extension(ruta)) ? 'image' : 'document') : null,
    };
  }

  /** Lee y valida el cuerpo según la definición del módulo. */
  function leer(body) {
    const d = { asignado: aBool(body.asignado) };
    if (subtipos) {
      const t = String(body[subtipos.columna] ?? '').trim().toUpperCase();
      if (!subtipos.valores[t]) {
        throw badRequest(`${ETIQUETAS[subtipos.columna] || subtipos.columna} no válido (${Object.values(subtipos.valores).join(' o ')})`);
      }
      d[subtipos.columna] = t;
    }
    const faltan = [];
    for (const [nombre, c] of Object.entries(campos)) {
      let v = body[nombre];
      v = v === undefined || v === null ? '' : String(v).trim();
      const obligatorio = c.requerido || (c.siAsignado && d.asignado === 1);
      if (!v) {
        if (obligatorio) faltan.push(ETIQUETAS[nombre] || nombre);
        d[nombre] = null;
        continue;
      }
      if (c.tipo === 'fecha') {
        const f = new Date(`${v}T00:00:00`);
        if (!FECHA.test(v) || Number.isNaN(f.getTime())) throw badRequest(`${ETIQUETAS[nombre]}: fecha no válida`);
      } else if (v.length > c.max) {
        throw badRequest(`${ETIQUETAS[nombre]}: máximo ${c.max} caracteres`);
      }
      d[nombre] = v;
    }
    if (faltan.length) {
      throw badRequest(
        `Faltan campos obligatorios: ${faltan.join(', ')}${
          d.asignado === 1 && faltan.some((f) => ['Usuario', 'Fecha de asignación', 'Departamento'].includes(f))
            ? ' (requeridos cuando el equipo está asignado)'
            : ''
        }`
      );
    }
    return d;
  }

  async function validarUnicos(d, region, excluirId = null) {
    for (const [nombre, c] of Object.entries(campos)) {
      if (!c.unico || !d[nombre]) continue;
      let sql = `SELECT id FROM ${tabla} WHERE ${nombre} = ? AND region_id = ? AND deleted_at IS NULL`;
      const params = [d[nombre], region];
      if (excluirId) {
        sql += ' AND id <> ?';
        params.push(excluirId);
      }
      if (await queryOne(sql, params)) throw badRequest(`El ${ETIQUETAS[nombre]} ya está registrado en esta planta`);
    }
  }

  function cambios(antes, despues) {
    return [...(subtipos ? [subtipos.columna] : []), ...nombres, 'asignado']
      .filter((c) => String(antes[c] ?? '') !== String(despues[c] ?? ''))
      .map((c) => {
        const fmt = (v) => (c === 'asignado' ? (Number(v) === 1 ? 'Asignado' : 'Sin asignar') : v ?? '');
        return `${ETIQUETAS[c] || c}: ${fmt(antes[c])} -> ${fmt(despues[c])}`;
      })
      .join(', ');
  }

  // ---------------------------------------------------------- rutas
  const conSugerencia = Object.fromEntries(nombres.filter((n) => campos[n].sugerir).map((n) => [n, n]));
  router.get(
    '/sugerencias/:campo',
    ah(async (req, res) => {
      const columna = conSugerencia[req.params.campo];
      if (!columna) throw badRequest('Campo no válido');
      res.json(await sugerencias(tabla, columna, String(req.query.search || ''), req.region));
    })
  );

  router.get(
    '/',
    ah(async (req, res) => {
      let sql = `SELECT * FROM ${tabla} WHERE region_id = ? AND deleted_at IS NULL`;
      const params = [req.region];
      if (req.query.estado === 'asignado') sql += ' AND asignado = 1';
      if (req.query.estado === 'sin_asignar') sql += ' AND asignado = 0';
      const tipo = String(req.query[subtipos?.columna] ?? '').toUpperCase();
      if (subtipos && subtipos.valores[tipo]) {
        sql += ` AND ${subtipos.columna} = ?`;
        params.push(tipo);
      }
      sql += ' ORDER BY id DESC';
      res.json((await query(sql, params)).map(decorar));
    })
  );

  router.get(
    '/:id',
    ah(async (req, res) => {
      const row = await buscar(idParam(req), req.region);
      if (!row) throw notFound(`${cfg.singular} no encontrado`);
      res.json({ status: 'success', data: decorar(row) });
    })
  );

  router.get(
    '/:id/historial',
    ah(async (req, res) => {
      const rows = await query(
        `SELECT l.id, l.accion, l.detalles, l.created_at, u.nombre AS usuario_nombre
         FROM inventario_logs l JOIN usuarios u ON u.id = l.usuario_id
         WHERE l.modulo = ? AND l.registro_id = ? AND l.region_id = ?
         ORDER BY l.created_at DESC, l.id DESC`,
        [clave, idParam(req), req.region]
      );
      res.json({ status: 'success', data: rows });
    })
  );

  router.post(
    '/',
    ah(async (req, res) => {
      const d = leer(req.body || {});
      await validarUnicos(d, req.region);
      const id = await insert(tabla, { ...d, region_id: req.region, usuario_id: req.user.id });
      await log(req.region, id, 'CREAR', `${cfg.singular} registrado: ${cfg.titulo(d)}`, req.user.id);
      ok(res, `${cfg.singular} registrado correctamente`, { id });
    })
  );

  router.put(
    '/:id',
    ah(async (req, res) => {
      const id = idParam(req);
      const antes = await buscar(id, req.region);
      if (!antes) throw notFound(`${cfg.singular} no encontrado`);
      const d = leer(req.body || {});
      await validarUnicos(d, req.region, id);

      const sets = Object.keys(d).map((c) => `${c} = ?`);
      await execute(`UPDATE ${tabla} SET ${sets.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [
        ...Object.values(d),
        id,
      ]);
      await log(req.region, id, 'EDITAR', `${cfg.singular} actualizado: ${cfg.titulo(d)}. Cambios: ${cambios(antes, d)}`, req.user.id);
      ok(res, `${cfg.singular} actualizado correctamente`);
    })
  );

  router.delete(
    '/:id',
    ah(async (req, res) => {
      const id = idParam(req);
      const actual = await buscar(id, req.region);
      if (!actual) throw notFound(`${cfg.singular} no encontrado`);
      if (archivo && actual[archivo.columna]) await borrarArchivo(actual[archivo.columna]);
      const extra = archivo ? `, ${archivo.columna} = NULL` : '';
      await execute(`UPDATE ${tabla} SET deleted_at = CURRENT_TIMESTAMP${extra} WHERE id = ?`, [id]);
      await log(req.region, id, 'ELIMINAR', `${cfg.singular} eliminado: ${cfg.titulo(actual)}`, req.user.id);
      ok(res, `${cfg.singular} eliminado correctamente`);
    })
  );

  if (archivo) {
    router.post(
      '/:id/archivo',
      upload.single('archivo'),
      ah(async (req, res) => {
        const id = idParam(req);
        if (!req.file) throw badRequest('No se seleccionó ningún archivo o hubo un error en la subida');
        const ext = extension(nombreOriginal(req.file));
        if (!archivo.extensiones.includes(ext)) {
          throw badRequest('Tipo de archivo no permitido. Use PDF, imágenes o documentos Office');
        }
        const actual = await buscar(id, req.region);
        if (!actual) throw notFound(`${cfg.singular} no encontrado`);

        const nombre = `${clave}_${id}_${segundosUnix()}.${ext}`;
        const rel = await guardarSubida(req.file, `uploads/${req.user.region_clave}/${archivo.carpeta}/${nombre}`);
        await execute(`UPDATE ${tabla} SET ${archivo.columna} = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [rel, id]);
        const previo = actual[archivo.columna];
        if (previo && previo !== rel) await borrarArchivo(previo);

        await log(req.region, id, 'EDITAR', `Responsiva subida: ${nombre}`, req.user.id);
        ok(res, 'Responsiva subida correctamente', { ruta: rel });
      })
    );

    router.delete(
      '/:id/archivo',
      ah(async (req, res) => {
        const id = idParam(req);
        const actual = await buscar(id, req.region);
        if (!actual?.[archivo.columna]) throw badRequest('No hay responsiva para eliminar');
        await borrarArchivo(actual[archivo.columna]);
        await execute(`UPDATE ${tabla} SET ${archivo.columna} = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [id]);
        await log(req.region, id, 'EDITAR', `Responsiva eliminada: ${actual[archivo.columna].split('/').pop()}`, req.user.id);
        ok(res, 'Responsiva eliminada correctamente');
      })
    );
  }

  return router;
}
