/**
 * Capa de acceso a datos.
 *
 * El resto del servidor escribe SQL "neutral" con parámetros "?" y usa los
 * ayudantes de este archivo para lo que cambia entre motores:
 *   col('tamaño')   -> [tamaño]  (SQL Server)  |  `tamaño`  (MySQL)
 *   top(10)         -> TOP (10)  (SQL Server)  |  ''        (MySQL)
 *   limit(10)       -> ''        (SQL Server)  |  LIMIT 10  (MySQL)
 *   insert(tabla, datos)  -> devuelve el id nuevo en ambos motores
 *
 * Motor por defecto: SQL Server (DB_CLIENT=mssql). Con DB_CLIENT=mysql funciona
 * igual contra MySQL/MariaDB.
 *
 * Las fechas se devuelven como texto ("YYYY-MM-DD HH:mm:ss" y "YYYY-MM-DD"),
 * igual que antes, para que el frontend no dependa del motor.
 */
import { config } from './config.js';

export const DIALECTO = config.db.client === 'mysql' ? 'mysql' : 'mssql';
const MSSQL = DIALECTO === 'mssql';

export const col = (nombre) => (MSSQL ? `[${nombre}]` : `\`${nombre}\``);
export const top = (n) => (MSSQL ? `TOP (${Number(n)})` : '');
export const limit = (n) => (MSSQL ? '' : `LIMIT ${Number(n)}`);

const p2 = (n) => String(n).padStart(2, '0');
const fechaHora = (d) =>
  `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())} ${p2(d.getHours())}:${p2(d.getMinutes())}:${p2(d.getSeconds())}`;
const soloFecha = (d) => `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`;

// ------------------------------------------------------------------ SQL Server
let mssqlPool = null; // promesa del pool (una sola conexión aunque lleguen varias peticiones a la vez)
let mssql = null;

function poolMssql() {
  if (mssqlPool) return mssqlPool;
  mssqlPool = (async () => {
    mssql = (await import('mssql')).default;
    const cfg = {
      server: config.db.host,
      user: config.db.user,
      password: config.db.password,
      database: config.db.database,
      pool: { max: 10, min: 0, idleTimeoutMillis: 30000 },
      options: {
        encrypt: config.db.encrypt,
        trustServerCertificate: config.db.trustServerCertificate,
        useUTC: false, // las fechas se guardan y leen en hora local, como en MySQL
        enableArithAbort: true,
      },
    };
    if (config.db.instance) cfg.options.instanceName = config.db.instance;
    else cfg.port = config.db.port;
    const pool = await new mssql.ConnectionPool(cfg).connect();
    pool.on('error', (err) => console.error('Error en la conexión a SQL Server:', err.message));
    return pool;
  })().catch((err) => {
    mssqlPool = null; // se reintenta en la siguiente petición
    throw err;
  });
  return mssqlPool;
}

/** Cambia los "?" por @p0, @p1... (las consultas del sistema no llevan "?" dentro de textos). */
function prepararMssql(sql, params) {
  let i = 0;
  const texto = sql.replace(/\?/g, () => `@p${i++}`);
  if (i !== params.length) throw new Error(`La consulta espera ${i} parámetros y recibió ${params.length}`);
  return texto;
}

function filasMssql(recordset) {
  if (!recordset) return [];
  const fechas = Object.values(recordset.columns || {})
    .filter((c) => ['date', 'datetime', 'datetime2', 'smalldatetime', 'datetimeoffset'].includes(c.type?.declaration))
    .map((c) => ({ nombre: c.name, soloFecha: c.type.declaration === 'date' }));
  if (!fechas.length) return recordset;
  return recordset.map((fila) => {
    for (const f of fechas) {
      const v = fila[f.nombre];
      if (v instanceof Date) fila[f.nombre] = f.soloFecha ? soloFecha(v) : fechaHora(v);
    }
    return fila;
  });
}

async function ejecutarMssql(sql, params) {
  const pool = await poolMssql();
  const req = pool.request();
  params.forEach((v, i) => {
    if (typeof v === 'boolean') v = v ? 1 : 0;
    if (v === undefined) v = null;
    // Enteros grandes (tamaños de archivo) como BIGINT; el resto lo deduce el driver
    if (typeof v === 'number' && Number.isInteger(v) && Math.abs(v) > 2147483647) req.input(`p${i}`, mssql.BigInt, v);
    else if (v === null) req.input(`p${i}`, mssql.NVarChar, null);
    else req.input(`p${i}`, v);
  });
  const r = await req.query(prepararMssql(sql, params));
  return { rows: filasMssql(r.recordset), affectedRows: r.rowsAffected.reduce((a, b) => a + b, 0) };
}

// ------------------------------------------------------------------ MySQL / MariaDB
let mysqlPool = null;

async function poolMysql() {
  if (mysqlPool) return mysqlPool;
  const mysql = (await import('mysql2/promise')).default;
  mysqlPool = mysql.createPool({
    host: config.db.host,
    port: config.db.port,
    user: config.db.user,
    password: config.db.password,
    database: config.db.database,
    charset: 'utf8mb4',
    waitForConnections: true,
    connectionLimit: 10,
    dateStrings: true,
    decimalNumbers: true,
    supportBigNumbers: true,
  });
  return mysqlPool;
}

async function ejecutarMysql(sql, params) {
  const pool = await poolMysql();
  const [r] = await pool.query(sql, params.map((v) => (v === undefined ? null : v)));
  if (Array.isArray(r)) return { rows: r, affectedRows: 0 };
  return { rows: [], affectedRows: r.affectedRows, insertId: r.insertId };
}

// ------------------------------------------------------------------ API común
const ejecutar = (sql, params = []) => (MSSQL ? ejecutarMssql(sql, params) : ejecutarMysql(sql, params));

/** SELECT: devuelve las filas. */
export async function query(sql, params = []) {
  return (await ejecutar(sql, params)).rows;
}

/** SELECT: devuelve la primera fila o null. */
export async function queryOne(sql, params = []) {
  return (await query(sql, params))[0] ?? null;
}

/** UPDATE / DELETE: devuelve { affectedRows }. */
export async function execute(sql, params = []) {
  const r = await ejecutar(sql, params);
  return { affectedRows: r.affectedRows };
}

/** INSERT de un objeto { columna: valor }; devuelve el id generado. */
export async function insert(tabla, datos) {
  const cols = Object.keys(datos);
  const valores = Object.values(datos);
  const sql = `INSERT INTO ${tabla} (${cols.map(col).join(', ')}) VALUES (${cols.map(() => '?').join(', ')})`;
  if (MSSQL) {
    // OUTPUT INSERTED.id no se puede usar en tablas con triggers; SCOPE_IDENTITY sí
    const r = await ejecutarMssql(`${sql}; SELECT CAST(SCOPE_IDENTITY() AS INT) AS id;`, valores);
    return r.rows[0]?.id;
  }
  return (await ejecutarMysql(sql, valores)).insertId;
}

/** Prueba de conexión para /api/salud */
export async function ping() {
  await query('SELECT 1 AS ok');
}

/** ¿El error es por llave foránea (registro usado en otra tabla)? */
export function esErrorLlaveForanea(err) {
  return err?.code === 'ER_ROW_IS_REFERENCED_2' || err?.code === 'ER_ROW_IS_REFERENCED' || err?.number === 547;
}

/** ¿El error es por valor duplicado en un índice único? */
export function esErrorDuplicado(err) {
  return err?.code === 'ER_DUP_ENTRY' || err?.number === 2601 || err?.number === 2627;
}
