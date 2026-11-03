import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import multer from 'multer';
import { config } from '../config.js';

export const STORAGE = config.storageDir;
const TMP_DIR = path.join(STORAGE, '.tmp');

fs.mkdirSync(TMP_DIR, { recursive: true });

/**
 * Convierte una ruta relativa guardada en la BD (ej. "uploads/responsivas/x.pdf")
 * en una ruta absoluta dentro de STORAGE. Devuelve null si intenta salirse de STORAGE.
 */
export function rutaAbsoluta(rel) {
  if (!rel) return null;
  const abs = path.resolve(STORAGE, rel.replace(/^[/\\]+/, ''));
  if (abs !== STORAGE && !abs.startsWith(STORAGE + path.sep)) return null;
  return abs;
}

export async function existe(rel) {
  const abs = rutaAbsoluta(rel);
  if (!abs) return false;
  try {
    await fsp.access(abs);
    return true;
  } catch {
    return false;
  }
}

/** Borra un archivo guardado (silencioso si no existe). */
export async function borrarArchivo(rel) {
  const abs = rutaAbsoluta(rel);
  if (!abs) return;
  await fsp.rm(abs, { force: true });
}

/** Borra una carpeta guardada con todo su contenido (silencioso si no existe). */
export async function borrarCarpeta(rel) {
  const abs = rutaAbsoluta(rel);
  if (!abs || abs === STORAGE) return;
  await fsp.rm(abs, { recursive: true, force: true });
}

/** Mueve el archivo temporal de multer a su ruta definitiva (relativa a STORAGE). */
export async function guardarSubida(file, relDestino) {
  const abs = rutaAbsoluta(relDestino);
  if (!abs) throw new Error('Ruta de destino no válida');
  await fsp.mkdir(path.dirname(abs), { recursive: true });
  try {
    await fsp.rename(file.path, abs);
  } catch (err) {
    // rename falla entre discos distintos: copiamos y borramos
    if (err.code !== 'EXDEV') throw err;
    await fsp.copyFile(file.path, abs);
    await fsp.rm(file.path, { force: true });
  }
  return relDestino;
}

export async function copiarGuardado(relOrigen, relDestino) {
  const origen = rutaAbsoluta(relOrigen);
  const destino = rutaAbsoluta(relDestino);
  if (!origen || !destino) throw new Error('Ruta no válida');
  await fsp.mkdir(path.dirname(destino), { recursive: true });
  await fsp.copyFile(origen, destino);
}

/** Limpia los temporales de multer que no se usaron (validación fallida, error, etc.). */
export async function limpiarTemporales(req) {
  const files = [];
  if (req.file) files.push(req.file);
  if (Array.isArray(req.files)) files.push(...req.files);
  else if (req.files) Object.values(req.files).forEach((arr) => files.push(...arr));
  await Promise.all(files.map((f) => fsp.rm(f.path, { force: true }).catch(() => {})));
}

export function extension(nombre) {
  return path.extname(nombre || '').slice(1).toLowerCase();
}

export function idUnico() {
  return `${Date.now().toString(36)}${crypto.randomBytes(6).toString('hex')}`;
}

export function segundosUnix() {
  return Math.floor(Date.now() / 1000);
}

/** Multer que guarda en una carpeta temporal; cada ruta decide el destino final. */
export function subida({ maxMB }) {
  return multer({
    dest: TMP_DIR,
    limits: { fileSize: maxMB * 1024 * 1024 },
  });
}

/** Los nombres de archivo con acentos llegan en latin1 desde multer; los pasamos a UTF-8. */
export function nombreOriginal(file) {
  return Buffer.from(file.originalname, 'latin1').toString('utf8');
}

export const EXT_IMAGEN = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'];
