import { Router } from 'express';
import { DIALECTO, query } from '../db.js';
import { ah } from '../lib/http.js';
import { MODULOS } from '../modulos.js';

/**
 * Datos de la pantalla de Inicio para la planta de la sesión:
 *  - conteo por módulo (total y asignados)
 *  - vigencias vencidas o por vencer (próximos 60 días)
 *  - fechas de vigencia de los próximos 12 meses (para el calendario)
 *  - actividad reciente (últimos cambios en el inventario)
 */
const router = Router();
const CON_VIGENCIA = ['computo_administrativo', 'computo_industrial', 'monitores', 'proyectores'];

function hoyISO() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
function sumarDias(iso, dias) {
  const [a, m, d] = iso.split('-').map(Number);
  const f = new Date(a, m - 1, d + dias);
  const p = (n) => String(n).padStart(2, '0');
  return `${f.getFullYear()}-${p(f.getMonth() + 1)}-${p(f.getDate())}`;
}

router.get(
  '/',
  ah(async (req, res) => {
    const region = req.region;
    const hoy = hoyISO();

    const modulos = {};
    for (const clave of Object.keys(MODULOS)) {
      const extra = clave === 'computo_administrativo' ? ', tipo_equipo' : '';
      const rows = await query(
        `SELECT asignado${extra}, COUNT(*) AS n FROM ${MODULOS[clave].tabla}
         WHERE region_id = ? AND deleted_at IS NULL GROUP BY asignado${extra}`,
        [region]
      );
      const total = rows.reduce((s, r) => s + Number(r.n), 0);
      const asignados = rows.filter((r) => Number(r.asignado) === 1).reduce((s, r) => s + Number(r.n), 0);
      modulos[clave] = { total, asignados };
      if (extra) {
        for (const t of ['PC', 'LAPTOP']) {
          const sub = rows.filter((r) => r.tipo_equipo === t);
          modulos[clave][t] = { total: sub.reduce((s, r) => s + Number(r.n), 0) };
        }
      }
    }
    const imp = await query(
      'SELECT activo, COUNT(*) AS n FROM impresoras WHERE region_id = ? AND deleted_at IS NULL GROUP BY activo',
      [region]
    );
    modulos.impresoras = {
      total: imp.reduce((s, r) => s + Number(r.n), 0),
      activas: imp.filter((r) => Number(r.activo) === 1).reduce((s, r) => s + Number(r.n), 0),
    };

    // Vigencias: vencidas y las de los próximos 12 meses
    const hasta = sumarDias(hoy, 365);
    const vigencias = [];
    for (const clave of CON_VIGENCIA) {
      const t = MODULOS[clave].tabla;
      const extra = clave === 'computo_administrativo' ? ', tipo_equipo' : '';
      const rows = await query(
        `SELECT id, marca, modelo, numero_serie, hostname, usuario_asignado, vigencia${extra} FROM ${t}
         WHERE region_id = ? AND deleted_at IS NULL AND vigencia IS NOT NULL AND vigencia <= ?`,
        [region, hasta]
      );
      for (const r of rows) {
        const v = String(r.vigencia).slice(0, 10);
        vigencias.push({
          modulo: clave,
          tipo_equipo: r.tipo_equipo || null,
          id: r.id,
          equipo: [r.marca, r.modelo].filter(Boolean).join(' ') || r.hostname || `#${r.id}`,
          numero_serie: r.numero_serie,
          usuario: r.usuario_asignado,
          vigencia: v,
        });
      }
    }
    vigencias.sort((a, b) => a.vigencia.localeCompare(b.vigencia));
    const limite = sumarDias(hoy, 60);
    const proximas = vigencias.filter((v) => v.vigencia <= limite).slice(0, 12);
    const fechas = {};
    for (const v of vigencias) if (v.vigencia >= sumarDias(hoy, -31)) fechas[v.vigencia] = (fechas[v.vigencia] || 0) + 1;

    // Actividad reciente
    const top = DIALECTO === 'mssql' ? 'TOP 8 ' : '';
    const lim = DIALECTO === 'mssql' ? '' : ' LIMIT 8';
    const actividad = await query(
      `SELECT ${top}l.id, l.modulo, l.registro_id, l.accion, l.detalles, l.created_at, u.nombre AS usuario
       FROM inventario_logs l JOIN usuarios u ON u.id = l.usuario_id
       WHERE l.region_id = ? ORDER BY l.id DESC${lim}`,
      [region]
    );

    res.json({
      status: 'success',
      data: {
        hoy,
        modulos,
        vencidas: vigencias.filter((v) => v.vigencia < hoy).length,
        por_vencer: vigencias.filter((v) => v.vigencia >= hoy && v.vigencia <= sumarDias(hoy, 30)).length,
        proximas,
        fechas,
        actividad,
      },
    });
  })
);

export default router;
