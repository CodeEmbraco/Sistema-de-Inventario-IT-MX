/**
 * Cliente HTTP mínimo para la API. Lanza un Error con el mensaje del servidor
 * cuando la respuesta es un error, para mostrarlo directamente en una notificación.
 */

export class ApiError extends Error {
  constructor(message, status, data) {
    super(message);
    this.status = status;
    this.data = data;
  }
}

/**
 * Modo sin servidor (solo desarrollo): si está activo, todas las llamadas las responde
 * src/mock/mockApi.js con datos guardados en el navegador. Ver client/.env.development.
 */
let mock = null;
export function instalarMock(m) {
  mock = m;
}
export const modoSinServidor = () => mock !== null;
/** Simulador activo (o null): usado por el login para mostrar los usuarios de prueba. */
export const simuladorActivo = () => mock;

async function request(method, url, body) {
  if (mock) return mock.request(method, url, body);
  const opts = { method, credentials: 'same-origin', headers: {} };
  if (body instanceof FormData) {
    opts.body = body;
  } else if (body !== undefined) {
    opts.headers['Content-Type'] = 'application/json';
    opts.body = JSON.stringify(body);
  }

  let res;
  try {
    res = await fetch(url, opts);
  } catch {
    throw new ApiError('No se pudo conectar con el servidor', 0);
  }

  const data = await res.json().catch(() => null);

  if (res.status === 401 && !url.startsWith('/api/auth/login')) {
    window.dispatchEvent(new Event('sesion-expirada'));
  }
  if (!res.ok || data?.status === 'error') {
    throw new ApiError(data?.message || `Error ${res.status}`, res.status, data);
  }
  return data;
}

export const api = {
  get: (url) => request('GET', url),
  post: (url, body) => request('POST', url, body),
  put: (url, body) => request('PUT', url, body),
  patch: (url, body) => request('PATCH', url, body),
  del: (url) => request('DELETE', url),
};

/** POST multipart con progreso de subida (fetch no lo expone). */
export function uploadConProgreso(url, formData, onProgress) {
  if (mock) {
    onProgress?.(100);
    return mock.request('POST', url, formData);
  }
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', url);
    xhr.withCredentials = true;
    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable) onProgress?.(Math.round((e.loaded / e.total) * 100));
    });
    xhr.onload = () => {
      let data = null;
      try {
        data = JSON.parse(xhr.responseText);
      } catch {
        /* respuesta no JSON */
      }
      if (xhr.status === 401) window.dispatchEvent(new Event('sesion-expirada'));
      if (xhr.status >= 400 || data?.status === 'error') {
        reject(new ApiError(data?.message || `Error ${xhr.status}`, xhr.status, data));
      } else {
        resolve(data);
      }
    };
    xhr.onerror = () => reject(new ApiError('No se pudo conectar con el servidor', 0));
    xhr.send(formData);
  });
}

/** Construye la URL pública de un archivo guardado (ej. "uploads/x.pdf" -> "/uploads/x.pdf"). */
export function urlArchivo(rel) {
  if (!rel) return '';
  if (mock) return mock.urlDe(rel);
  return '/' + String(rel).replace(/^\/+/, '');
}

export const FOTO_DEFAULT = '/assets/img/anonymous.png';

/** URL para ver (inline) o descargar un archivo del explorador de auditoría. */
export function urlArchivoAuditoria(id, inline = false) {
  if (mock) return mock.urlArchivoAuditoria(id);
  return `/api/archivos/${id}/descargar${inline ? '?inline=1' : ''}`;
}

/** Fechas "YYYY-MM-DD HH:mm:ss" de MySQL a texto local. */
export function formatoFecha(valor) {
  if (!valor || String(valor).startsWith('0000')) return '—';
  const d = new Date(String(valor).replace(' ', 'T'));
  return Number.isNaN(d.getTime()) ? String(valor) : d.toLocaleString('es-MX');
}

export function formatBytes(bytes, decimales = 2) {
  if (!bytes) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.min(sizes.length - 1, Math.floor(Math.log(bytes) / Math.log(k)));
  return `${parseFloat((bytes / k ** i).toFixed(decimales))} ${sizes[i]}`;
}
