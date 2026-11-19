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

/**
 * Mismos campos para Cómputo administrativo (PC y Laptop), Cómputo industrial,
 * Monitores y Proyectores. Solo hostname y número de ticket son opcionales.
 * La responsiva (opcional) y el estado (Asignado / Sin asignar) van aparte en el formulario.
 */
const camposEquipo = {
  hostname: t('Hostname', { enTabla: true, placeholder: 'Ej: MX-ADM-001' }),
  usuario_asignado: t('Usuario', { requerido: true, sugerir: true, enTabla: true, placeholder: 'Nombre de quien lo tiene asignado' }),
  departamento: t('Departamento', { requerido: true, sugerir: true, enTabla: true }),
  sistema_operativo: t('Sistema operativo', { requerido: true, sugerir: true, placeholder: 'Ej: Windows 11 Pro' }),
  procesador: t('Procesador', { requerido: true, sugerir: true, placeholder: 'Ej: Intel Core i5-1245U' }),
  hd: t('HD', { requerido: true, sugerir: true, placeholder: 'Ej: 512 GB SSD' }),
  ram: t('RAM', { requerido: true, sugerir: true, placeholder: 'Ej: 16 GB' }),
  numero_serie: t('Número de serie', { requerido: true, unico: true, enTabla: true }),
  vigencia: f('Vigencia', { requerido: true, enTabla: true }),
  modelo: t('Modelo', { requerido: true, sugerir: true, enTabla: true }),
  marca: t('Marca', { requerido: true, sugerir: true, enTabla: true }),
  adaptador_cargador: t('Adaptador cargador', { requerido: true, sugerir: true, placeholder: 'Ej: Dell 65W USB-C' }),
  numero_ticket: t('Número de ticket (opcional)', { placeholder: 'Ej: INC-1001' }),
};

const responsiva = {
  titulo: 'Responsiva',
  accept: '.pdf,.jpg,.jpeg,.png,.gif,.bmp,.doc,.docx,.xls,.xlsx',
  maxMB: 10,
  ayuda: 'Opcional. PDF, imágenes (JPG, PNG, GIF, BMP), Word o Excel. Máximo 10 MB.',
};

export const MODULOS = {
  celulares: {
    ruta: '/celulares',
    menu: 'Celulares',
    icono: 'celular',
    titulo: 'Celulares',
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
    icono: 'laptop',
    titulo: 'Cómputo Administrativo',
    singular: 'Equipo',
    agregar: 'Agregar Equipo',
    busqueda: 'Buscar por serie, hostname, usuario, marca o departamento...',
    campos: camposEquipo,
    archivo: responsiva,
    subtipos: {
      columna: 'tipo_equipo',
      opciones: [
        { valor: 'PC', ruta: 'pc', menu: 'PC', icono: 'pc', singular: 'PC', agregar: 'Agregar PC' },
        { valor: 'LAPTOP', ruta: 'laptop', menu: 'Laptop', icono: 'laptop', singular: 'Laptop', agregar: 'Agregar Laptop' },
      ],
    },
  },
  computo_industrial: {
    ruta: '/computo-industrial',
    menu: 'Cómputo industrial',
    icono: 'industria',
    titulo: 'Cómputo Industrial',
    singular: 'Equipo',
    agregar: 'Agregar Equipo',
    busqueda: 'Buscar por serie, hostname, usuario, marca o departamento...',
    campos: camposEquipo,
    archivo: responsiva,
  },
  monitores: {
    ruta: '/monitores',
    menu: 'Monitores',
    icono: 'monitor',
    titulo: 'Monitores',
    singular: 'Monitor',
    agregar: 'Agregar Monitor',
    busqueda: 'Buscar por serie, hostname, usuario, marca o departamento...',
    campos: camposEquipo,
    archivo: responsiva,
  },
  proyectores: {
    ruta: '/proyectores',
    menu: 'Proyectores',
    icono: 'proyector',
    titulo: 'Proyectores',
    singular: 'Proyector',
    agregar: 'Agregar Proyector',
    busqueda: 'Buscar por serie, hostname, usuario, marca o departamento...',
    campos: camposEquipo,
    archivo: responsiva,
  },
};

export const RUTA_INICIO = '/inicio';

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
