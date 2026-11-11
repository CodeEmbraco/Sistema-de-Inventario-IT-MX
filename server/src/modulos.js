/**
 * Definición de los módulos de inventario con campos propios.
 * Para agregar o quitar un campo: edítalo aquí, en la tabla de la BD y en
 * client/src/modulos.js (formulario y tabla).
 *
 *  tipo:      'texto' | 'fecha'  (fecha = YYYY-MM-DD)
 *  max:       longitud máxima (igual que en la BD)
 *  requerido: obligatorio siempre
 *  siAsignado: obligatorio solo cuando el equipo está "Asignado"
 *  sugerir:   ofrece autocompletar con valores ya capturados
 *  unico:     no se puede repetir dentro de la misma planta
 *
 *  subtipos:  divide un módulo en submódulos (ej. PC / Laptop) guardados en la misma
 *             tabla; la columna indicada guarda el submódulo de cada registro.
 */
const texto = (max, extra = {}) => ({ tipo: 'texto', max, ...extra });
const fecha = (extra = {}) => ({ tipo: 'fecha', ...extra });

const camposComputo = {
  hostname: texto(100, { sugerir: false }),
  usuario_asignado: texto(200, { siAsignado: true, sugerir: true }),
  departamento: texto(150, { requerido: true, sugerir: true }),
  sistema_operativo: texto(100, { requerido: true, sugerir: true }),
  procesador: texto(150, { requerido: true, sugerir: true }),
  hd: texto(50, { requerido: true, sugerir: true }),
  ram: texto(50, { requerido: true, sugerir: true }),
  numero_serie: texto(100, { requerido: true, unico: true }),
  vigencia: fecha(),
  adaptador_cargador: texto(150, { sugerir: true }),
  numero_ticket: texto(50),
};

const camposPerifericos = {
  hostname: texto(100),
  usuario_asignado: texto(200, { siAsignado: true, sugerir: true }),
  fecha_asignacion: fecha({ siAsignado: true }),
  departamento: texto(150, { sugerir: true }),
  ubicacion: texto(200, { sugerir: true }),
  marca: texto(100, { requerido: true, sugerir: true }),
  modelo: texto(100, { requerido: true, sugerir: true }),
  numero_serie: texto(100, { requerido: true, unico: true }),
  vigencia: fecha(),
  numero_ticket: texto(50),
};

export const MODULOS = {
  celulares: {
    tabla: 'celulares',
    singular: 'Celular',
    femenino: false,
    campos: {
      numero_telefono: texto(20),
      usuario_asignado: texto(200, { siAsignado: true, sugerir: true }),
      departamento: texto(150, { siAsignado: true, sugerir: true }),
      marca: texto(100, { requerido: true, sugerir: true }),
      modelo: texto(100, { requerido: true, sugerir: true }),
      numero_serie: texto(100, { requerido: true, unico: true }),
      imei: texto(20, { requerido: true, unico: true }),
      fecha_asignacion: fecha({ siAsignado: true }),
      numero_ticket: texto(50),
    },
    // Archivo adjunto (responsiva firmada)
    archivo: {
      columna: 'responsiva',
      carpeta: 'responsivas_celulares', // se guarda en uploads/<PLANTA>/responsivas_celulares
      extensiones: ['pdf', 'jpg', 'jpeg', 'png', 'gif', 'bmp', 'doc', 'docx', 'xls', 'xlsx'],
      maxMB: 10,
    },
    titulo: (d) => `${d.marca} ${d.modelo} (Serie: ${d.numero_serie})`,
  },
  computo_administrativo: {
    tabla: 'computo_administrativo',
    singular: 'Equipo de cómputo administrativo',
    campos: camposComputo,
    // Submódulos PC y Laptop (mismos campos)
    subtipos: { columna: 'tipo_equipo', valores: { PC: 'PC', LAPTOP: 'Laptop' } },
    titulo: (d) => `${d.tipo_equipo === 'LAPTOP' ? 'Laptop' : 'PC'} ${d.hostname || ''} - ${d.departamento}`.replace(/\s+/g, ' '),
  },
  computo_industrial: {
    tabla: 'computo_industrial',
    singular: 'Equipo de cómputo industrial',
    campos: camposComputo,
    titulo: (d) => `${d.hostname || d.departamento} - ${d.procesador}`,
  },
  monitores: {
    tabla: 'monitores',
    singular: 'Monitor',
    campos: camposPerifericos,
    titulo: (d) => `${d.marca} ${d.modelo} (Serie: ${d.numero_serie})`,
  },
  proyectores: {
    tabla: 'proyectores',
    singular: 'Proyector',
    campos: camposPerifericos,
    titulo: (d) => `${d.marca} ${d.modelo} (Serie: ${d.numero_serie})`,
  },
};

/** Etiquetas para mensajes de error y bitácora */
export const ETIQUETAS = {
  numero_telefono: 'Número de teléfono',
  usuario_asignado: 'Usuario',
  departamento: 'Departamento',
  marca: 'Marca',
  modelo: 'Modelo',
  numero_serie: 'Número de serie',
  imei: 'IMEI',
  fecha_asignacion: 'Fecha de asignación',
  numero_ticket: 'Número de ticket',
  sistema_operativo: 'Sistema operativo',
  procesador: 'Procesador',
  hd: 'HD',
  ram: 'RAM',
  vigencia: 'Vigencia',
  adaptador_cargador: 'Adaptador cargador',
  hostname: 'Hostname',
  ubicacion: 'Ubicación',
  asignado: 'Asignado',
  tipo_equipo: 'Tipo de equipo',
};
