/**
 * MODO SIN SERVIDOR (solo para desarrollo)
 * ------------------------------------------------------------------
 * Simula la API del servidor dentro del navegador para poder entrar y
 * usar todas las pantallas sin Node ni base de datos.
 *
 * - Se activa con VITE_SIN_SERVIDOR=true (ver client/.env.development).
 * - Cada planta (Nidec GA Cold Mexico / Nidec Atlanta) tiene sus propios
 *   usuarios y datos, igual que en el servidor real.
 * - Los datos se guardan en localStorage ("Restablecer datos de prueba" en el login).
 * - Los archivos subidos viven solo en memoria: se pierden al recargar.
 * - Este archivo NO se incluye en la compilación de producción.
 */
import { ApiError } from '../api.js';
import { MODULOS } from '../modulos.js';

export const REGIONES = [
  { id: 1, clave: 'MX', nombre: 'Nidec GA Cold Mexico' },
  { id: 2, clave: 'ATL', nombre: 'Nidec Atlanta' },
];

// Usuarios para entrar sin servidor (puedes agregar más aquí y luego "Restablecer datos de prueba")
export const USUARIOS_DEMO = [
  { region_id: 1, nombre: 'Administrador', usuario: 'admin', password: 'admin123', perfil: 'Administrador' },
  { region_id: 1, nombre: 'Soporte TI', usuario: 'soporte', password: 'soporte123', perfil: 'Usuario' },
  { region_id: 2, nombre: 'Administrador Atlanta', usuario: 'admin', password: 'admin123', perfil: 'Administrador' },
  { region_id: 2, nombre: 'Técnico Atlanta', usuario: 'tecnico', password: 'tecnico123', perfil: 'Usuario' },
];

const CLAVE_DB = 'inventario-ti.sin-servidor.v3';
const CLAVE_SESION = 'inventario-ti.sin-servidor.sesion.v3';
const EXT_IMAGEN = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'];
const FECHA = /^\d{4}-\d{2}-\d{2}$/;

// ------------------------------------------------------------------ utilidades
const p2 = (n) => String(n).padStart(2, '0');
const ahora = () => {
  const d = new Date();
  return `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())} ${p2(d.getHours())}:${p2(d.getMinutes())}:${p2(d.getSeconds())}`;
};
const enDias = (n) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`;
};
const vacioANull = (v) => (v === undefined || v === null || String(v).trim() === '' ? null : String(v).trim());
const aBool = (v) => (v === true || v === 1 || v === '1' || v === 'true' || v === 'on' ? 1 : 0);
const ext = (nombre) => (String(nombre).includes('.') ? String(nombre).split('.').pop().toLowerCase() : '');
const error = (message, status = 400, data) => new ApiError(message, status, { status: 'error', message, ...data });
const ok = (message, extra = {}) => ({ status: 'success', message, ...extra });
const esperar = () => new Promise((r) => setTimeout(r, 120));

function leerLS(clave) {
  try {
    return JSON.parse(localStorage.getItem(clave));
  } catch {
    return null;
  }
}
function escribirLS(clave, valor) {
  try {
    localStorage.setItem(clave, JSON.stringify(valor));
  } catch {
    /* almacenamiento lleno o bloqueado: los datos quedan solo en memoria */
  }
}

// ------------------------------------------------------------------ datos iniciales
function semilla() {
  const t = ahora();
  const base = (region_id, usuario_id) => ({ region_id, usuario_id, created_at: t, updated_at: t, deleted_at: null });
  const db = { seq: {}, usuarios: [], impresoras: [], archivos: [], archivos_logs: [], inventario_logs: [] };
  const id = (tabla) => (db.seq[tabla] = (db.seq[tabla] || 0) + 1);

  USUARIOS_DEMO.forEach((u) =>
    db.usuarios.push({ id: id('usuarios'), ...u, foto: null, estado: 1, ultimo_login: null })
  );
  const admin = (r) => db.usuarios.find((u) => u.region_id === r && u.perfil === 'Administrador').id;
  Object.keys(MODULOS).forEach((m) => (db[m] = []));

  const agregar = (tabla, region, datos) => db[tabla].push({ id: id(tabla), ...datos, ...base(region, admin(region)) });

  // ---- México
  agregar('celulares', 1, { numero_telefono: '442 123 4567', usuario_asignado: 'Ana Torres', departamento: 'Calidad', marca: 'Samsung', modelo: 'Galaxy A54', numero_serie: 'R58N10AA1', imei: '356789012345671', responsiva: null, fecha_asignacion: enDias(-40), numero_ticket: 'INC-1001', asignado: 1 });
  agregar('celulares', 1, { numero_telefono: null, usuario_asignado: null, departamento: null, marca: 'Apple', modelo: 'iPhone 13', numero_serie: 'F17XK2', imei: '353912110000002', responsiva: null, fecha_asignacion: null, numero_ticket: null, asignado: 0 });
  agregar('computo_administrativo', 1, { tipo_equipo: 'LAPTOP', hostname: 'MX-ADM-L001', usuario_asignado: 'María López', departamento: 'Finanzas', sistema_operativo: 'Windows 11 Pro', procesador: 'Intel Core i5-1245U', hd: '512 GB SSD', ram: '16 GB', vigencia: enDias(500), adaptador_cargador: 'Dell 65W USB-C', numero_ticket: 'INC-1010', asignado: 1 });
  agregar('computo_administrativo', 1, { tipo_equipo: 'PC', hostname: 'MX-ADM-P014', usuario_asignado: null, departamento: 'Recursos Humanos', sistema_operativo: 'Windows 10 Pro', procesador: 'Intel Core i5-8350U', hd: '256 GB SSD', ram: '8 GB', vigencia: enDias(-15), adaptador_cargador: 'HP 45W', numero_ticket: null, asignado: 0 });
  agregar('computo_administrativo', 1, { tipo_equipo: 'PC', hostname: 'MX-ADM-P003', usuario_asignado: 'Jorge Ramírez', departamento: 'Compras', sistema_operativo: 'Windows 11 Pro', procesador: 'Intel Core i7-12700', hd: '1 TB SSD', ram: '32 GB', vigencia: enDias(800), adaptador_cargador: null, numero_ticket: 'INC-1015', asignado: 1 });
  agregar('computo_industrial', 1, { hostname: 'MX-IND-L1-01', usuario_asignado: 'Operador Línea 1', departamento: 'Producción', sistema_operativo: 'Windows 10 IoT', procesador: 'Intel Celeron J6412', hd: '128 GB SSD', ram: '8 GB', vigencia: enDias(20), adaptador_cargador: 'Fuente 24V DIN', numero_ticket: 'INC-1022', asignado: 1 });
  agregar('monitores', 1, { hostname: 'AREYLINEA', usuario_asignado: 'Luis Gómez', fecha_asignacion: enDias(-100), departamento: 'Producción', ubicacion: 'Línea 1', marca: 'Dell', modelo: 'P2422H', numero_serie: 'CN-0D9F2', vigencia: enDias(700), numero_ticket: null, asignado: 1 });
  agregar('proyectores', 1, { hostname: null, usuario_asignado: 'Sala de juntas A', fecha_asignacion: enDias(-200), departamento: 'Administración', ubicacion: 'Sala A', marca: 'Epson', modelo: 'EB-X51', numero_serie: 'X5L1A001', vigencia: enDias(300), numero_ticket: null, asignado: 1 });
  db.impresoras.push({ id: id('impresoras'), nombre: 'HP Almacén', marca: 'HP', modelo: 'LaserJet M404', serie: 'PHB123456', ubicacion: 'Almacén', ip: '192.168.1.50', foto: null, activo: 1, ...base(1, admin(1)) });
  db.archivos.push({ id: id('archivos'), nombre: 'Auditoría 2026', tipo: 'CARPETA', extension: null, 'tamaño': null, ruta_fisica: null, carpeta_padre_id: null, activo: 1, ...base(1, admin(1)) });

  // ---- Atlanta
  agregar('celulares', 2, { numero_telefono: '(404) 555-0123', usuario_asignado: 'John Smith', departamento: 'Maintenance', marca: 'Apple', modelo: 'iPhone 14', numero_serie: 'G6TZ91', imei: '351234567890125', responsiva: null, fecha_asignacion: enDias(-10), numero_ticket: null, asignado: 1 });
  agregar('computo_administrativo', 2, { tipo_equipo: 'LAPTOP', hostname: 'ATL-ENG-L01', usuario_asignado: 'Robert Brown', departamento: 'Engineering', sistema_operativo: 'Windows 11 Pro', procesador: 'Intel Core i7-1365U', hd: '1 TB SSD', ram: '32 GB', vigencia: enDias(900), adaptador_cargador: 'Lenovo 65W USB-C', numero_ticket: 'ATL-200', asignado: 1 });
  agregar('monitores', 2, { hostname: 'ATL-ENG-01', usuario_asignado: 'Mary Johnson', fecha_asignacion: enDias(-30), departamento: 'Engineering', ubicacion: 'Office 2', marca: 'LG', modelo: '27UK850', numero_serie: 'LG-778899', vigencia: null, numero_ticket: null, asignado: 1 });
  db.impresoras.push({ id: id('impresoras'), nombre: 'Kyocera Atlanta', marca: 'Kyocera', modelo: 'ECOSYS M3655', serie: 'VCF9876543', ubicacion: 'Front office', ip: '10.10.1.51', foto: null, activo: 1, ...base(2, admin(2)) });
  db.archivos.push({ id: id('archivos'), nombre: 'Audit 2026', tipo: 'CARPETA', extension: null, 'tamaño': null, ruta_fisica: null, carpeta_padre_id: null, activo: 1, ...base(2, admin(2)) });

  return db;
}

// ------------------------------------------------------------------ simulador
export function crearMock() {
  let db = leerLS(CLAVE_DB) || semilla();
  const blobs = new Map(); // ruta -> objectURL (solo en memoria)
  const guardar = () => escribirLS(CLAVE_DB, db);
  guardar();

  const siguienteId = (tabla) => (db.seq[tabla] = (db.seq[tabla] || 0) + 1);
  const region = (id) => REGIONES.find((r) => r.id === id);
  const sesion = () => {
    const id = leerLS(CLAVE_SESION);
    return db.usuarios.find((x) => x.id === id && x.estado === 1) || null;
  };
  const publico = (u) => ({
    id: u.id,
    nombre: u.nombre,
    usuario: u.usuario,
    perfil: u.perfil,
    foto: u.foto,
    region: region(u.region_id),
  });

  function guardarArchivo(file, carpeta) {
    const ruta = `${carpeta}/${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}.${ext(file.name) || 'bin'}`;
    blobs.set(ruta, URL.createObjectURL(file));
    return ruta;
  }

  const delRegion = (tabla, rid) => db[tabla].filter((r) => r.region_id === rid && !r.deleted_at);
  const porId = (rows) => [...rows].sort((a, b) => b.id - a.id);
  const sugerencias = (rows, col, q) =>
    [...new Set(rows.map((r) => r[col]).filter(Boolean))]
      .filter((v) => !q || v.toLowerCase().includes(q.toLowerCase()))
      .sort((a, b) => a.localeCompare(b, 'es'))
      .slice(0, 10);

  // ================================================================ rutas
  async function request(method, url, body) {
    await esperar();
    const u = new URL(url, 'http://local');
    const q = Object.fromEntries(u.searchParams);
    const [recurso, a, b] = u.pathname.replace(/^\/api\//, '').split('/').filter(Boolean);
    const id = Number.parseInt(a, 10);
    const esForm = body instanceof FormData;
    const d = esForm ? Object.fromEntries(body.entries()) : body || {};

    // ---------- autenticación
    if (recurso === 'auth') {
      if (a === 'regiones') return { status: 'success', data: REGIONES };
      if (a === 'login' && method === 'POST') {
        const usuario = String(d.usuario ?? '').trim();
        const reg = region(Number(d.region_id));
        if (!usuario || !d.password) throw error('Escribe tu usuario y tu contraseña');
        if (!reg) throw error('Selecciona la planta');
        const user = db.usuarios.find((x) => x.usuario === usuario && x.region_id === reg.id);
        if (!user) throw error(`El usuario no existe en ${reg.nombre}`, 401);
        if (user.password !== d.password) throw error('Error en la contraseña, vuelve a intentarlo', 401);
        if (user.estado !== 1) throw error('El usuario aún no está activado', 403);
        user.ultimo_login = ahora();
        guardar();
        escribirLS(CLAVE_SESION, user.id);
        return { status: 'success', user: publico(user) };
      }
      if (a === 'logout') {
        escribirLS(CLAVE_SESION, null);
        return { status: 'success' };
      }
      if (a === 'me') {
        const s = sesion();
        return { status: 'success', user: s ? publico(s) : null };
      }
    }

    const yo = sesion();
    if (!yo) {
      window.dispatchEvent(new Event('sesion-expirada'));
      throw error('Sesión no iniciada', 401);
    }
    if (recurso === 'usuarios' && yo.perfil !== 'Administrador') throw error('Solo los administradores pueden hacer esto', 403);
    // Igual que el servidor: el perfil Usuario solo consulta el inventario
    if (recurso !== 'perfil' && method !== 'GET' && yo.perfil !== 'Administrador') {
      throw error('Tu perfil solo permite consultar la información', 403);
    }

    const ctx = { yo, rid: yo.region_id, uid: yo.id, t: ahora(), q, d, body, id, a, b, method };
    let r;
    if (MODULOS[recurso]) r = rutaEquipo(recurso, ctx);
    else if (recurso === 'perfil') r = rutaPerfil(ctx);
    else if (recurso === 'usuarios') r = rutaUsuarios(ctx);
    else if (recurso === 'impresoras') r = rutaImpresoras(ctx);
    else if (recurso === 'archivos') r = rutaArchivos(ctx);
    else throw error('Ruta no disponible en modo sin servidor', 404);
    guardar();
    return r;
  }

  // ---------------------------------------------------------------- perfil
  function rutaPerfil({ yo, method, a, d }) {
    if (method === 'GET') return { status: 'success', data: { ...publico(yo), estado: yo.estado, ultimo_login: yo.ultimo_login } };
    if (a === 'foto') {
      if (!(d.foto instanceof File) || !d.foto.size) throw error('Selecciona una imagen');
      yo.foto = guardarArchivo(d.foto, `vistas/img/usuarios/${yo.usuario}`);
      return ok('Foto actualizada correctamente', { user: publico(yo) });
    }
    if (a === 'password') {
      if (!d.nuevaPassword) throw error('Escribe la nueva contraseña');
      if (d.nuevaPassword !== d.confirmarPassword) throw error('Las contraseñas no coinciden');
      yo.password = d.nuevaPassword;
      return ok('Contraseña actualizada correctamente');
    }
    throw error('Ruta no disponible', 404);
  }

  // ---------------------------------------------------------------- usuarios
  function rutaUsuarios({ yo, rid, method, a, b, id, q, d }) {
    const deLaPlanta = db.usuarios.filter((u) => u.region_id === rid);
    if (method === 'GET' && !a) {
      return porId(deLaPlanta).map((u, i) => ({
        contador: i + 1, id: u.id, nombre: u.nombre, usuario: u.usuario, foto: u.foto, perfil: u.perfil, estado: u.estado,
        ultimo_login: u.ultimo_login || 'Nunca',
      }));
    }
    if (method === 'GET' && a === 'existe') return { existe: deLaPlanta.some((u) => u.usuario === String(q.usuario || '').trim()) };
    if (method === 'POST' && !a) {
      const usuario = String(d.usuario ?? '').trim();
      if (!d.nombre || !usuario || !d.password || !d.perfil) throw error('Faltan campos obligatorios');
      if (deLaPlanta.some((x) => x.usuario === usuario)) throw error('El usuario ya existe en esta planta');
      const nuevo = { id: siguienteId('usuarios'), region_id: rid, nombre: String(d.nombre).trim(), usuario, password: d.password, perfil: d.perfil, foto: null, estado: 1, ultimo_login: null };
      if (d.foto instanceof File && d.foto.size) nuevo.foto = guardarArchivo(d.foto, `vistas/img/usuarios/${usuario}`);
      db.usuarios.push(nuevo);
      return ok('Usuario creado correctamente');
    }
    const u = deLaPlanta.find((x) => x.id === id);
    if (!u) throw error('Usuario no encontrado', 404);
    if (method === 'GET') {
      const { password, ...resto } = u;
      return { status: 'success', data: resto };
    }
    if (method === 'PUT') {
      if (!d.nombre || !d.perfil) throw error('Faltan campos obligatorios');
      if (u.id === yo.id && d.perfil !== 'Administrador') throw error('No puedes quitarte a ti mismo el perfil de Administrador');
      Object.assign(u, { nombre: String(d.nombre).trim(), perfil: d.perfil });
      if (d.password) u.password = d.password;
      if (d.foto instanceof File && d.foto.size) u.foto = guardarArchivo(d.foto, `vistas/img/usuarios/${u.usuario}`);
      return ok('Usuario actualizado correctamente');
    }
    if (method === 'PATCH' && b === 'estado') {
      const estado = Number(d.estado) === 1 ? 1 : 0;
      if (u.id === yo.id && estado === 0) throw error('No puedes desactivar tu propio usuario');
      u.estado = estado;
      return ok('Estado del usuario actualizado');
    }
    if (method === 'DELETE') {
      if (u.usuario === 'admin') throw error('No se puede eliminar al usuario administrador principal');
      if (u.id === yo.id) throw error('No puedes eliminar tu propio usuario');
      db.usuarios = db.usuarios.filter((x) => x.id !== u.id);
      return ok('Usuario eliminado correctamente');
    }
    throw error('Ruta no disponible', 404);
  }

  // ---------------------------------------------------------------- módulos de equipos
  function rutaEquipo(clave, { yo, rid, uid, t, method, a, b, id, q, d }) {
    const cfg = MODULOS[clave];
    const campos = cfg.campos;
    const filas = () => delRegion(clave, rid);
    const log = (registro_id, accion, detalles) =>
      db.inventario_logs.push({ id: siguienteId('inventario_logs'), region_id: rid, modulo: clave, registro_id, accion, detalles, usuario_id: uid, created_at: ahora() });
    const decorar = (r) =>
      cfg.archivo
        ? { ...r, has_archivo: !!r.responsiva, archivo_tipo: r.responsiva ? (EXT_IMAGEN.includes(ext(r.responsiva)) ? 'image' : 'document') : null }
        : r;
    const etiqueta = (n) => (campos[n] ? campos[n].etiqueta.replace(' (opcional)', '') : 'Tipo de equipo');
    const sub = cfg.subtipos;
    const titulo = (x) =>
      x.marca
        ? `${x.marca} ${x.modelo} (Serie: ${x.numero_serie})`
        : `${sub ? `${x.tipo_equipo === 'LAPTOP' ? 'Laptop' : 'PC'} ` : ''}${x.hostname || ''} ${x.departamento} - ${x.procesador}`.trim();

    const leer = (excluirId) => {
      const x = { asignado: aBool(d.asignado) };
      if (sub) {
        const tipo = String(d[sub.columna] ?? '').toUpperCase();
        if (!sub.opciones.some((o) => o.valor === tipo)) throw error('Tipo de equipo no válido (PC o Laptop)');
        x[sub.columna] = tipo;
      }
      const faltan = [];
      for (const [n, c] of Object.entries(campos)) {
        const v = vacioANull(d[n]);
        if (!v && (c.requerido || (c.siAsignado && x.asignado === 1))) faltan.push(etiqueta(n));
        if (v && c.tipo === 'fecha' && !FECHA.test(v)) throw error(`${etiqueta(n)}: fecha no válida`);
        x[n] = v;
      }
      if (faltan.length) throw error(`Faltan campos obligatorios: ${faltan.join(', ')}`);
      for (const [n, c] of Object.entries(campos)) {
        if (c.unico && x[n] && filas().some((r) => r[n] === x[n] && r.id !== excluirId)) {
          throw error(`El ${etiqueta(n)} ya está registrado en esta planta`);
        }
      }
      return x;
    };

    if (a === 'sugerencias') return sugerencias(filas(), b, q.search);
    if (method === 'GET' && !a) {
      let rows = filas();
      if (q.estado === 'asignado') rows = rows.filter((r) => r.asignado === 1);
      if (q.estado === 'sin_asignar') rows = rows.filter((r) => r.asignado === 0);
      if (sub && q[sub.columna]) rows = rows.filter((r) => r[sub.columna] === String(q[sub.columna]).toUpperCase());
      return porId(rows).map(decorar);
    }
    if (method === 'POST' && !a) {
      const x = leer();
      const nuevo = { id: siguienteId(clave), ...x, ...(cfg.archivo ? { responsiva: null } : {}), region_id: rid, usuario_id: uid, created_at: t, updated_at: t, deleted_at: null };
      db[clave].push(nuevo);
      log(nuevo.id, 'CREAR', `${cfg.singular} registrado: ${titulo(x)}`);
      return ok(`${cfg.singular} registrado correctamente`, { id: nuevo.id });
    }
    const r = filas().find((x) => x.id === id);
    if (!r) throw error(`${cfg.singular} no encontrado`, 404);
    if (method === 'GET' && b === 'historial') {
      const nombres = Object.fromEntries(db.usuarios.map((u) => [u.id, u.nombre]));
      return {
        status: 'success',
        data: db.inventario_logs
          .filter((l) => l.modulo === clave && l.registro_id === id && l.region_id === rid)
          .sort((x, y) => y.id - x.id)
          .map((l) => ({ ...l, usuario_nombre: nombres[l.usuario_id] ?? `Usuario ${l.usuario_id}` })),
      };
    }
    if (method === 'GET') return { status: 'success', data: decorar(r) };
    if (method === 'PUT') {
      const x = leer(r.id);
      const cambios = [...(sub ? [sub.columna] : []), ...Object.keys(campos), 'asignado']
        .filter((n) => String(r[n] ?? '') !== String(x[n] ?? ''))
        .map((n) => (n === 'asignado' ? `Asignado: ${r.asignado ? 'Asignado' : 'Sin asignar'} -> ${x.asignado ? 'Asignado' : 'Sin asignar'}` : `${etiqueta(n)}: ${r[n] ?? ''} -> ${x[n] ?? ''}`))
        .join(', ');
      Object.assign(r, x, { updated_at: t });
      log(r.id, 'EDITAR', `${cfg.singular} actualizado: ${titulo(x)}. Cambios: ${cambios}`);
      return ok(`${cfg.singular} actualizado correctamente`);
    }
    if (b === 'archivo' && method === 'POST') {
      r.responsiva = guardarArchivo(d.archivo, `uploads/${region(rid).clave}/responsivas_${clave}`);
      log(r.id, 'EDITAR', 'Responsiva subida');
      return ok('Responsiva subida correctamente', { ruta: r.responsiva });
    }
    if (b === 'archivo' && method === 'DELETE') {
      if (!r.responsiva) throw error('No hay responsiva para eliminar');
      r.responsiva = null;
      log(r.id, 'EDITAR', 'Responsiva eliminada');
      return ok('Responsiva eliminada correctamente');
    }
    if (method === 'DELETE') {
      Object.assign(r, { deleted_at: t, ...(cfg.archivo ? { responsiva: null } : {}) });
      log(r.id, 'ELIMINAR', `${cfg.singular} eliminado: ${titulo(r)}`);
      return ok(`${cfg.singular} eliminado correctamente`);
    }
    throw error('Ruta no disponible', 404);
  }

  // ---------------------------------------------------------------- impresoras
  function rutaImpresoras({ rid, uid, t, method, a, b, id, q, d }) {
    const filas = () => delRegion('impresoras', rid);
    if (a === 'sugerencias') return sugerencias(filas(), { modelos: 'modelo', marcas: 'marca', ubicaciones: 'ubicacion' }[b], q.search);
    if (method === 'GET' && !a) {
      let rows = filas();
      if (q.estado === 'activo') rows = rows.filter((r) => r.activo === 1);
      if (q.estado === 'inactivo') rows = rows.filter((r) => r.activo === 0);
      return porId(rows).map((r) => ({ ...r, has_foto: !!r.foto }));
    }
    const leer = (excluir) => {
      const x = {
        nombre: String(d.nombre ?? '').trim(), marca: vacioANull(d.marca), modelo: vacioANull(d.modelo),
        serie: String(d.serie ?? '').trim(), ubicacion: vacioANull(d.ubicacion), ip: vacioANull(d.ip), activo: aBool(d.activo),
      };
      if (!x.nombre || !x.serie) throw error('Faltan campos obligatorios');
      if (filas().some((r) => r.serie === x.serie && r.id !== excluir)) throw error('El número de serie ya existe en el sistema');
      return x;
    };
    if (method === 'POST' && !a) {
      const nuevo = { id: siguienteId('impresoras'), ...leer(), foto: null, region_id: rid, usuario_id: uid, created_at: t, updated_at: t, deleted_at: null };
      db.impresoras.push(nuevo);
      return ok('Impresora creada correctamente', { impresora_id: nuevo.id });
    }
    const r = filas().find((x) => x.id === id);
    if (!r) throw error('Impresora no encontrada', 404);
    if (method === 'GET' && b === 'toner') throw error('Modo sin servidor: el nivel de tóner solo se puede consultar con el servidor encendido');
    if (method === 'GET') return { status: 'success', data: { ...r, has_foto: !!r.foto } };
    if (method === 'PUT') {
      Object.assign(r, leer(r.id), { updated_at: t });
      return ok('Impresora actualizada correctamente');
    }
    if (b === 'foto' && method === 'POST') {
      r.foto = guardarArchivo(d.foto, `uploads/${region(rid).clave}/fotos_impresoras`);
      return ok('Foto subida correctamente', { foto_url: r.foto });
    }
    if (b === 'foto' && method === 'DELETE') {
      if (!r.foto) throw error('No hay foto para eliminar');
      r.foto = null;
      return ok('Foto eliminada correctamente');
    }
    if (method === 'DELETE') {
      Object.assign(r, { deleted_at: t, foto: null });
      return ok('Impresora eliminada correctamente');
    }
    throw error('Ruta no disponible', 404);
  }

  // ---------------------------------------------------------------- archivos de auditoría
  function rutaArchivos({ rid, uid, t, method, a, b, id, q, d, body }) {
    const activos = () => db.archivos.filter((x) => x.region_id === rid && x.activo === 1 && !x.deleted_at);
    const log = (archivo_id, accion, detalles) =>
      db.archivos_logs.push({ id: siguienteId('archivos_logs'), archivo_id, accion, detalles, usuario_id: uid, created_at: ahora() });
    const carpeta = (v) => (v === undefined || v === null || v === '' || v === 'null' ? null : Number(v));
    const ordenar = (rows) =>
      [...rows].sort((x, y) => (x.tipo === y.tipo ? x.nombre.localeCompare(y.nombre, 'es') : x.tipo === 'CARPETA' ? -1 : 1));
    const ocupado = (nombre, tipo, padre, excluir) =>
      activos().some((x) => x.nombre === nombre && x.tipo === tipo && x.carpeta_padre_id === padre && x.id !== excluir);
    const libre = (nombre, tipo, padre, patron) => {
      if (!ocupado(nombre, tipo, padre)) return nombre;
      const e = tipo === 'ARCHIVO' && nombre.includes('.') ? `.${nombre.split('.').pop()}` : '';
      const base = e ? nombre.slice(0, -e.length) : nombre;
      for (let n = 1; ; n++) if (!ocupado(patron(base, n) + e, tipo, padre)) return patron(base, n) + e;
    };
    const descendiente = (carpetaId, destino) => {
      let actual = destino;
      while (actual) {
        if (actual === carpetaId) return true;
        actual = db.archivos.find((x) => x.id === actual)?.carpeta_padre_id ?? null;
      }
      return false;
    };
    const eliminar = (eid) => {
      const el = db.archivos.find((x) => x.id === eid);
      activos().filter((h) => h.carpeta_padre_id === eid).forEach((h) => eliminar(h.id));
      el.deleted_at = ahora();
      log(eid, 'ELIMINAR', `Elemento eliminado: ${el.nombre}`);
    };
    const copiar = (orig, destino, nombre) => {
      const nid = siguienteId('archivos');
      let ruta = orig.ruta_fisica;
      if (ruta && blobs.has(ruta)) {
        const nueva = ruta.replace(/[^/]+(\.\w+)$/, `${Date.now().toString(36)}${nid}$1`);
        blobs.set(nueva, blobs.get(ruta));
        ruta = nueva;
      }
      db.archivos.push({ ...orig, id: nid, nombre, ruta_fisica: ruta, carpeta_padre_id: destino, usuario_id: uid, created_at: t, updated_at: t });
      log(nid, 'COPIAR', `Copiado de ID ${orig.id}`);
      if (orig.tipo === 'CARPETA') activos().filter((h) => h.carpeta_padre_id === orig.id && h.id !== nid).forEach((h) => copiar(h, nid, h.nombre));
    };
    const resumen = (n, verbo, errores) => {
      if (n > 0) return ok(`${n} elemento(s) ${verbo} correctamente`, errores.length ? { errores } : {});
      throw error('No se pudo procesar ningún elemento', 400, { errores });
    };

    if (method === 'GET' && !a) {
      const padre = carpeta(q.carpeta);
      return { status: 'success', data: ordenar(activos().filter((x) => x.carpeta_padre_id === padre)) };
    }
    if (a === 'sidebar') {
      const carpetas = activos().filter((x) => x.tipo === 'CARPETA');
      return {
        status: 'success',
        data: ordenar(carpetas.filter((x) => x.carpeta_padre_id === null)).map((r) => ({ ...r, hijos: carpetas.filter((h) => h.carpeta_padre_id === r.id) })),
      };
    }
    if (a === 'buscar') {
      const s = String(q.termino || '').toLowerCase();
      const padre = carpeta(q.carpeta);
      let rows = activos().filter((x) => x.nombre.toLowerCase().includes(s));
      if (padre) rows = rows.filter((x) => x.carpeta_padre_id === padre);
      return { status: 'success', data: ordenar(rows).slice(0, 100) };
    }
    if (a === 'carpetas' && method === 'POST') {
      const nombre = String(d.nombre ?? '').trim();
      const padre = carpeta(d.carpeta_padre_id);
      if (!nombre) throw error('El nombre de la carpeta no puede estar vacío');
      if (ocupado(nombre, 'CARPETA', padre)) throw error('Ya existe una carpeta con ese nombre en esta ubicación');
      const nid = siguienteId('archivos');
      db.archivos.push({ id: nid, region_id: rid, nombre, tipo: 'CARPETA', extension: null, 'tamaño': null, ruta_fisica: null, carpeta_padre_id: padre, activo: 1, usuario_id: uid, created_at: t, updated_at: t, deleted_at: null });
      log(nid, 'CREAR', `Carpeta creada: ${nombre}`);
      return ok('Carpeta creada correctamente', { id: nid });
    }
    if (a === 'subir' && method === 'POST') {
      const padre = carpeta(body.get('carpeta_padre_id'));
      const files = body.getAll('archivos').filter((f) => f instanceof File);
      if (!files.length) throw error('No se seleccionaron archivos');
      files.forEach((f) => {
        const nombre = libre(f.name, 'ARCHIVO', padre, (base, k) => `${base} (${k})`);
        const nid = siguienteId('archivos');
        db.archivos.push({ id: nid, region_id: rid, nombre, tipo: 'ARCHIVO', extension: ext(f.name) || null, 'tamaño': f.size, ruta_fisica: guardarArchivo(f, `uploads/${region(rid).clave}/archivos`), carpeta_padre_id: padre, activo: 1, usuario_id: uid, created_at: t, updated_at: t, deleted_at: null });
        log(nid, 'CREAR', `Archivo subido: ${nombre}`);
      });
      return ok(`${files.length} elemento(s) subido(s) correctamente`);
    }
    if (a === 'eliminar' && method === 'POST') {
      let n = 0;
      const errores = [];
      (d.ids || []).forEach((x) => {
        if (!activos().some((el) => el.id === x)) return errores.push(`Elemento ID ${x} no encontrado`);
        eliminar(x);
        n++;
      });
      return resumen(n, 'eliminado(s)', errores);
    }
    if (a === 'pegar' && method === 'POST') {
      const destino = carpeta(d.destino);
      let n = 0;
      const errores = [];
      (d.items || []).forEach((itemId) => {
        const orig = activos().find((x) => x.id === itemId);
        if (!orig) return errores.push(`Elemento ID ${itemId} no encontrado`);
        if (orig.tipo === 'CARPETA' && descendiente(itemId, destino)) return errores.push(`No se puede pegar una carpeta dentro de sí misma: ${orig.nombre}`);
        if (d.operacion === 'CORTAR') {
          if (orig.carpeta_padre_id !== destino) {
            Object.assign(orig, { nombre: libre(orig.nombre, orig.tipo, destino, (x, k) => `${x} - Copia (${k})`), carpeta_padre_id: destino, updated_at: t });
            log(itemId, 'MOVER', `Movido a carpeta ID: ${destino ?? 'Raíz'}`);
          }
        } else {
          copiar(orig, destino, libre(orig.nombre, orig.tipo, destino, (x, k) => `${x} - Copia (${k})`));
        }
        n++;
      });
      return resumen(n, 'pegado(s)', errores);
    }
    const el = activos().find((x) => x.id === id);
    if (!el) throw error('Elemento no encontrado', 404);
    if (method === 'GET' && !b) return { status: 'success', data: el };
    if (b === 'breadcrumb') {
      const ruta = [];
      let actual = el;
      while (actual) {
        ruta.unshift({ id: actual.id, nombre: actual.nombre, carpeta_padre_id: actual.carpeta_padre_id });
        actual = activos().find((x) => x.id === actual.carpeta_padre_id);
      }
      return { status: 'success', data: ruta };
    }
    if (b === 'logs') {
      const nombres = Object.fromEntries(db.usuarios.map((u) => [u.id, u.nombre]));
      return {
        status: 'success',
        data: db.archivos_logs
          .filter((l) => l.archivo_id === id)
          .sort((x, y) => y.id - x.id)
          .map((l) => ({ ...l, usuario_nombre: nombres[l.usuario_id] ?? `Usuario ${l.usuario_id}`, archivo_nombre: el.nombre })),
      };
    }
    if (method === 'PATCH') {
      const nombre = String(d.nombre ?? '').trim();
      if (!nombre) throw error('El nombre no puede estar vacío');
      if (ocupado(nombre, el.tipo, el.carpeta_padre_id, el.id)) throw error('Ya existe un elemento con ese nombre en esta ubicación');
      log(el.id, 'RENOMBRAR', `Renombrado: ${el.nombre} -> ${nombre}`);
      Object.assign(el, { nombre, updated_at: t });
      return ok('Elemento renombrado correctamente');
    }
    throw error('Ruta no disponible', 404);
  }

  return {
    usuariosDemo: USUARIOS_DEMO,
    request,
    /** URL para mostrar un archivo guardado (solo existe mientras no se recargue la página). */
    urlDe: (ruta) => blobs.get(ruta) || '',
    urlArchivoAuditoria: (aid) => {
      const el = db.archivos.find((x) => x.id === Number(aid));
      return (el && blobs.get(el.ruta_fisica)) || '#';
    },
    restablecer: () => {
      db = semilla();
      guardar();
      escribirLS(CLAVE_SESION, null);
    },
  };
}
