import { col, insert, limit, query, top } from '../db.js';

/**
 * Registra una acción en la tabla de auditoría de un módulo.
 * @param {string} tabla      ej. "impresoras_logs"
 * @param {string} columnaFk  ej. "impresora_id"
 */
export async function registrarLog(tabla, columnaFk, id, accion, detalles, usuarioId) {
  await insert(tabla, { [columnaFk]: id, accion, detalles, usuario_id: usuarioId });
}

/**
 * Sugerencias para autocompletar (modelos, marcas, ubicaciones...) dentro de la planta.
 * Las columnas permitidas se pasan explícitamente para no aceptar nombres arbitrarios.
 */
export async function sugerencias(tabla, columna, busqueda, regionId) {
  const c = col(columna);
  let sql = `SELECT DISTINCT ${top(10)} ${c} AS valor FROM ${col(tabla)} WHERE region_id = ? AND ${c} IS NOT NULL AND ${c} <> ''`;
  const params = [regionId];
  if (busqueda) {
    sql += ` AND ${c} LIKE ?`;
    params.push(`%${busqueda}%`);
  }
  sql += ` ORDER BY valor ${limit(10)}`;
  const rows = await query(sql, params);
  return rows.map((r) => r.valor);
}

/** Construye la ruta GET /sugerencias/:campo para un router. */
export function rutaSugerencias(router, tabla, campos) {
  router.get('/sugerencias/:campo', async (req, res, next) => {
    try {
      const columna = campos[req.params.campo];
      if (!columna) return res.status(400).json({ status: 'error', message: 'Campo no válido' });
      res.json(await sugerencias(tabla, columna, String(req.query.search || ''), req.region));
    } catch (err) {
      next(err);
    }
  });
}

/** Filtro estándar ?estado=activo|inactivo */
export function filtroEstado(estado, alias = '') {
  const c = alias ? `${alias}.activo` : 'activo';
  if (estado === 'activo') return ` AND ${c} = 1`;
  if (estado === 'inactivo') return ` AND ${c} = 0`;
  return '';
}
