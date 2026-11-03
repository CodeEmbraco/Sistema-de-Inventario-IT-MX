/**
 * Módulos de inventario con campos propios. La página genérica
 * (pages/ModuloEquipos.jsx) arma la tabla, el formulario y el detalle a partir
 * de esta definición.
 *
 * Para agregar o quitar un campo: edítalo aquí, en server/src/modulos.js y en la tabla de la BD.
 *
 *  tipo:        'texto' | 'fecha'
 *  requerido:   obligatorio siempre
 *  siAsignado:  obligatorio solo si el equipo está "Asignado"
 *  sugerir:     autocompletar con valores ya capturados
 *  unico:       no se repite dentro de la planta (lo valida el servidor)
 *  enTabla:     se muestra como columna en el listado
 *
 *  subtipos:    submódulos con los mismos campos (ej. PC / Laptop). Cada uno tiene su
 *               propia ruta y menú; se guardan en la misma tabla (columna `columna`).
 */
const t = (etiqueta, extra = {}) => ({ etiqueta, tipo: 'texto', ...extra });
const f = (etiqueta, extra = {}) => ({ etiqueta, tipo: 'fecha', ...extra });

const camposComputo = {
  hostname: t('Hostname', { enTabla: true, placeholder: 'Ej: MX-ADM-001' }),
  usuario_asignado: t('Usuario', { siAsignado: true, sugerir: true, enTabla: true, placeholder: 'Nombre de quien lo tiene asignado' }),
  departamento: t('Departamento', { requerido: true, sugerir: true, enTabla: true }),
  sistema_operativo: t('Sistema operativo', { requerido: true, sugerir: true, enTabla: true, placeholder: 'Ej: Windows 11 Pro' }),
  procesador: t('Procesador', { requerido: true, sugerir: true, enTabla: true, placeholder: 'Ej: Intel Core i5-1245U' }),
  hd: t('HD', { requerido: true, sugerir: true, enTabla: true, placeholder: 'Ej: 512 GB SSD' }),
  ram: t('RAM', { requerido: true, sugerir: true, enTabla: true, placeholder: 'Ej: 16 GB' }),
  vigencia: f('Vigencia', { enTabla: true }),
  adaptador_cargador: t('Adaptador cargador', { sugerir: true, enTabla: true, placeholder: 'Ej: Dell 65W USB-C' }),
  numero_ticket: t('Número de ticket', { enTabla: true, placeholder: 'Ej: INC-1001' }),
};

const camposPerifericos = {
  hostname: t('Hostname', { enTabla: true }),
  usuario_asignado: t('Usuario', { siAsignado: true, sugerir: true, enTabla: true, placeholder: 'Nombre de quien lo tiene asignado' }),
  fecha_asignacion: f('Fecha de asignación', { siAsignado: true }),
  departamento: t('Departamento', { sugerir: true, enTabla: true }),
  ubicacion: t('Ubicación', { sugerir: true, enTabla: true }),
  marca: t('Marca', { requerido: true, sugerir: true, enTabla: true }),
  modelo: t('Modelo', { requerido: true, sugerir: true, enTabla: true }),
  numero_serie: t('Número de serie', { requerido: true, unico: true, enTabla: true }),
  vigencia: f('Vigencia', { enTabla: true }),
  numero_ticket: t('Número de ticket', { placeholder: 'Ej: INC-1001' }),
};

export const MODULOS = {
  celulares: {
    ruta: '/celulares',
    menu: 'Celulares',
    icono: 'fas fa-mobile-alt',
    titulo: 'Administrar Celulares',
    singular: 'Celular',
    agregar: 'Agregar Celular',
    busqueda: 'Buscar por teléfono, usuario, serie o IMEI...',
    campos: {
      numero_telefono: t('Número de teléfono', { enTabla: true, placeholder: 'Ej: 442 123 4567' }),
      usuario_asignado: t('Usuario', { siAsignado: true, sugerir: true, enTabla: true, placeholder: 'Nombre de quien lo tiene asignado' }),
      departamento: t('Departamento', { siAsignado: true, sugerir: true, enTabla: true }),
      marca: t('Marca', { requerido: true, sugerir: true, enTabla: true }),
      modelo: t('Modelo', { requerido: true, sugerir: true, enTabla: true }),
      numero_serie: t('Número de serie', { requerido: true, unico: true, enTabla: true }),
      imei: t('IMEI', { requerido: true, unico: true, enTabla: true, placeholder: '15 dígitos' }),
      fecha_asignacion: f('Fecha de asignación', { siAsignado: true }),
      numero_ticket: t('Número de ticket (opcional)', { placeholder: 'Ej: INC-1001' }),
    },
    archivo: {
      titulo: 'Responsiva',
      accept: '.pdf,.jpg,.jpeg,.png,.gif,.bmp,.doc,.docx,.xls,.xlsx',
      maxMB: 10,
      ayuda: 'Formatos permitidos: PDF, imágenes (JPG, PNG, GIF, BMP), Word y Excel. Tamaño máximo: 10MB.',
    },
  },
  computo_administrativo: {
    ruta: '/computo-administrativo',
    menu: 'Cómputo administrativo',
    icono: 'fas fa-laptop',
    titulo: 'Equipo de Cómputo Administrativo',
    singular: 'Equipo',
    agregar: 'Agregar Equipo',
    busqueda: 'Buscar por hostname, usuario, departamento o procesador...',
    campos: camposComputo,
    subtipos: {
      columna: 'tipo_equipo',
      opciones: [
        { valor: 'PC', ruta: 'pc', menu: 'PC', icono: 'fas fa-desktop', singular: 'PC', agregar: 'Agregar PC' },
        { valor: 'LAPTOP', ruta: 'laptop', menu: 'Laptop', icono: 'fas fa-laptop', singular: 'Laptop', agregar: 'Agregar Laptop' },
      ],
    },
  },
  computo_industrial: {
    ruta: '/computo-industrial',
    menu: 'Cómputo industrial',
    icono: 'fas fa-industry',
    titulo: 'Equipo de Cómputo Industrial',
    singular: 'Equipo',
    agregar: 'Agregar Equipo',
    busqueda: 'Buscar por hostname, usuario, departamento o procesador...',
    campos: camposComputo,
  },
  monitores: {
    ruta: '/monitores',
    menu: 'Monitores',
    icono: 'fas fa-desktop',
    titulo: 'Administrar Monitores',
    singular: 'Monitor',
    agregar: 'Agregar Monitor',
    busqueda: 'Buscar por hostname, usuario, marca o serie...',
    campos: camposPerifericos,
  },
  proyectores: {
    ruta: '/proyectores',
    menu: 'Proyectores',
    icono: 'fas fa-video',
    titulo: 'Administrar Proyectores',
    singular: 'Proyector',
    agregar: 'Agregar Proyector',
    busqueda: 'Buscar por hostname, usuario, marca o serie...',
    campos: camposPerifericos,
  },
};

export const RUTA_INICIO = MODULOS.celulares.ruta;

/**
 * Pantallas a mostrar: un módulo sin subtipos es una pantalla; uno con subtipos
 * genera una por submódulo (ej. /computo-administrativo/pc y /computo-administrativo/laptop).
 */
export function pantallas() {
  const out = [];
  for (const [clave, cfg] of Object.entries(MODULOS)) {
    if (!cfg.subtipos) {
      out.push({ clave, ruta: cfg.ruta, cfg, fijo: null });
      continue;
    }
    for (const o of cfg.subtipos.opciones) {
      out.push({
        clave,
        ruta: `${cfg.ruta}/${o.ruta}`,
        cfg: { ...cfg, titulo: `${cfg.titulo} · ${o.menu}`, singular: o.singular, agregar: o.agregar },
        fijo: { [cfg.subtipos.columna]: o.valor },
      });
    }
  }
  return out;
}
