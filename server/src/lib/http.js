import multer from 'multer';
import { esErrorDuplicado } from '../db.js';
import { limpiarTemporales } from './files.js';

/** Error con código HTTP y mensaje para el usuario. */
export class HttpError extends Error {
  constructor(status, message, extra = {}) {
    super(message);
    this.status = status;
    this.extra = extra;
  }
}

export const badRequest = (msg, extra) => new HttpError(400, msg, extra);
export const notFound = (msg = 'No encontrado') => new HttpError(404, msg);

/** Envuelve handlers async para que los errores lleguen al manejador central. */
export const ah = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

export function ok(res, message, data = {}) {
  res.json({ status: 'success', message, ...data });
}

/** Igual que PHP: un campo opcional vacío se guarda como NULL. */
export function vacioANull(valor) {
  if (valor === undefined || valor === null) return null;
  const s = String(valor);
  return s === '' ? null : s;
}

export function requerido(valor) {
  return valor !== undefined && valor !== null && String(valor).trim() !== '';
}

/** Checkbox "activo": acepta true/1/"1"/"on". */
export function aBool(valor) {
  return valor === true || valor === 1 || valor === '1' || valor === 'true' || valor === 'on' ? 1 : 0;
}

export function idParam(req) {
  const id = Number.parseInt(req.params.id, 10);
  if (!Number.isInteger(id) || id <= 0) throw badRequest('ID no válido');
  return id;
}

/** Arma el texto "campo: antes -> después" para los logs de edición. */
export function describirCambios(antes, despues, campos) {
  return campos
    .filter((c) => String(antes[c] ?? '') !== String(despues[c] ?? ''))
    .map((c) => `${c}: ${antes[c] ?? ''} -> ${despues[c] ?? ''}`)
    .join(', ');
}

// eslint-disable-next-line no-unused-vars
export async function manejadorErrores(err, req, res, next) {
  await limpiarTemporales(req);

  if (err instanceof multer.MulterError) {
    const msg =
      err.code === 'LIMIT_FILE_SIZE' ? 'El archivo es demasiado grande' : `Error al subir el archivo (${err.code})`;
    return res.status(400).json({ status: 'error', message: msg });
  }
  if (err instanceof HttpError) {
    return res.status(err.status).json({ status: 'error', message: err.message, ...err.extra });
  }
  // Errores 4xx de Express/express.static (ej. archivo subido que ya no existe en disco)
  const status = err?.status || err?.statusCode;
  if (status >= 400 && status < 500) {
    return res.status(status).json({ status: 'error', message: status === 404 ? 'No encontrado' : 'Solicitud no válida' });
  }
  if (err?.name === 'ConnectionError' || ['ESOCKET', 'ELOGIN', 'ETIMEOUT', 'ECONNREFUSED', 'ER_ACCESS_DENIED_ERROR'].includes(err?.code)) {
    console.error('Sin conexión a la base de datos:', err.message);
    return res.status(503).json({ status: 'error', message: 'No se pudo conectar con la base de datos. Revisa la configuración del servidor.' });
  }
  if (esErrorDuplicado(err)) {
    return res.status(409).json({
      status: 'error',
      message: 'Ya existe un registro con ese valor único (puede estar en un registro eliminado anteriormente)',
    });
  }
  console.error(err);
  res.status(500).json({ status: 'error', message: 'Error interno del servidor' });
}
