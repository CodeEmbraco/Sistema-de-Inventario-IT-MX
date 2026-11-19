/* Piezas pequeñas compartidas por los módulos de inventario */
import { urlArchivo } from '../api.js';
import Icono from './Icono.jsx';
import VisorPdf from './VisorPdf.jsx';

export function EstadoBadge({ activo, femenino = false }) {
  const on = Number(activo) === 1;
  const texto = on ? (femenino ? 'Activa' : 'Activo') : femenino ? 'Inactiva' : 'Inactivo';
  return <span className={`badge ${on ? 'badge-activo' : 'badge-inactivo'}`}>{texto}</span>;
}

/** Estado de los equipos de inventario: Asignado / Sin asignar */
export function AsignadoBadge({ asignado }) {
  const si = Number(asignado) === 1;
  return <span className={`pildora ${si ? 'pildora-verde' : 'pildora-gris'}`}>{si ? 'Asignado' : 'Sin asignar'}</span>;
}

/** Control segmentado Todos / Asignados / Sin asignar (con conteos opcionales). */
export function FiltroAsignado({ value, onChange, conteos }) {
  const opciones = [
    ['', 'Todos', conteos?.total],
    ['asignado', 'Asignados', conteos?.asignados],
    ['sin_asignar', 'Sin asignar', conteos?.sinAsignar],
  ];
  return (
    <div className="segmentado" role="group" aria-label="Filtrar por estado">
      {opciones.map(([v, t, n]) => (
        <button key={v || 'todos'} type="button" aria-pressed={value === v} className={value === v ? 'activo' : ''} onClick={() => onChange(v)}>
          {t}
          {n !== undefined && <span className="segmentado-n">{n}</span>}
        </button>
      ))}
    </div>
  );
}

/** Fecha "YYYY-MM-DD" a texto local, sin corrimiento de zona horaria. */
export function textoFecha(valor) {
  if (!valor) return '';
  const [a, m, d] = String(valor).slice(0, 10).split('-').map(Number);
  if (!a || !m || !d) return String(valor);
  return new Date(a, m - 1, d).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
}

/** Vigencia con color: vencida (rojo) o por vencer en 30 días (amarillo). */
export function VigenciaBadge({ valor }) {
  if (!valor) return <span className="text-muted">—</span>;
  const [a, m, d] = String(valor).slice(0, 10).split('-').map(Number);
  const dias = Math.floor((new Date(a, m - 1, d) - new Date(new Date().toDateString())) / 86400000);
  if (dias < 0) {
    return (
      <span className="pildora pildora-roja" title={`Vencida: venció hace ${-dias} día(s)`}>
        <Icono nombre="alerta" size={13} /> {textoFecha(valor)}
      </span>
    );
  }
  if (dias <= 30) {
    return (
      <span className="pildora pildora-ambar" title={dias === 0 ? 'Vence hoy' : `Vence en ${dias} día(s)`}>
        <Icono nombre="reloj" size={13} /> {textoFecha(valor)}
      </span>
    );
  }
  return <span>{textoFecha(valor)}</span>;
}

/**
 * Encabezado (hero verde Nidec) + panel blanco con el contenido.
 *  eyebrow:  texto pequeño sobre el título (ej. "Cómputo · Administrativo")
 *  stats:    [{ label, value, nota, icono, tono: 'verde'|'ambar'|'rojo' }] tarjetas de resumen
 *  action:   botón principal (ej. Agregar)
 */
export function PageCard({ title, subtitle, eyebrow, icon, action, stats, children, panelTitle, panelAction }) {
  return (
    <>
      <HeroPagina title={title} subtitle={subtitle} eyebrow={eyebrow} icon={icon} action={action} stats={stats} />
      <div className="contenedor sobre-hero">
        <section className="panel">
          {(panelTitle || panelAction) && (
            <div className="panel-cabecera">
              {panelTitle && <h2 className="panel-titulo">{panelTitle}</h2>}
              {panelAction && <div className="ms-auto">{panelAction}</div>}
            </div>
          )}
          {children}
        </section>
      </div>
    </>
  );
}

/** Solo el encabezado verde (para páginas con su propio contenido, ej. Archivos o Mi perfil). */
export function HeroPagina({ title, subtitle, eyebrow, icon, action, stats }) {
  return (
    <>
      <section className={`hero ${stats?.length ? '' : 'hero-compacto'}`}>
        <div className="contenedor">
          <div className="hero-fila">
            <div className="hero-texto">
              {eyebrow && <p className="hero-eyebrow">{eyebrow}</p>}
              <h1 className="hero-titulo">
                {icon && (
                  <span className="hero-icono">
                    <Icono nombre={icon} size={26} />
                  </span>
                )}
                {title}
              </h1>
              {subtitle && <p className="hero-sub">{subtitle}</p>}
            </div>
            {action && <div className="hero-accion">{action}</div>}
          </div>
          {stats?.length > 0 && (
            <div className="kpis">
              {stats.map((k) => (
                <div key={k.label} className={`kpi ${k.tono ? `kpi-${k.tono}` : ''}`}>
                  {k.icono && (
                    <span className="kpi-icono">
                      <Icono nombre={k.icono} size={18} />
                    </span>
                  )}
                  <span className="kpi-label">{k.label}</span>
                  <strong className="kpi-valor">{k.value}</strong>
                  {k.nota && <span className="kpi-nota">{k.nota}</span>}
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  );
}

export function FiltroEstado({ value, onChange, femenino = false }) {
  return (
    <select className="form-select" value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">Todos los estados</option>
      <option value="activo">{femenino ? 'Activas' : 'Activos'}</option>
      <option value="inactivo">{femenino ? 'Inactivas' : 'Inactivos'}</option>
    </select>
  );
}

export function Buscador({ value, onChange, placeholder }) {
  return (
    <label className="buscador">
      <Icono nombre="buscar" size={18} />
      <span className="visually-hidden">Buscar</span>
      <input type="search" value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}

export function AccionesFila({ onVer, onEditar, onEliminar }) {
  return (
    <div className="acciones">
      {onVer && (
        <button type="button" className="btn-accion" title="Ver" aria-label="Ver detalles" onClick={onVer}>
          <Icono nombre="ojo" size={17} />
        </button>
      )}
      {onEditar && (
        <button type="button" className="btn-accion" title="Editar" aria-label="Editar" onClick={onEditar}>
          <Icono nombre="editar" size={17} />
        </button>
      )}
      {onEliminar && (
        <button type="button" className="btn-accion btn-accion-peligro" title="Eliminar" aria-label="Eliminar" onClick={onEliminar}>
          <Icono nombre="eliminar" size={17} />
        </button>
      )}
    </div>
  );
}

export function DetailCard({ title, children }) {
  return (
    <div className="detail-card">
      <div className="detail-card-header">
        <h6 className="mb-0">{title}</h6>
      </div>
      <div className="detail-card-body">{children}</div>
    </div>
  );
}

export function DetailRow({ label, children }) {
  return (
    <div className="detail-row">
      <div className="detail-label">{label}:</div>
      <div className="detail-value">{children}</div>
    </div>
  );
}

export function BotonGuardar({ busy, children }) {
  return (
    <button type="submit" className="btn btn-primary" disabled={busy}>
      {busy && <span className="spinner-border spinner-border-sm me-2" />}
      {children}
    </button>
  );
}

export function Campo({ label, required, children, className = '' }) {
  return (
    <div className={`form-group ${className}`}>
      <label>
        {label}
        {required && <span className="obligatorio"> *</span>}
      </label>
      {children}
    </div>
  );
}

export function CheckActivo({ checked, onChange, label }) {
  return (
    <div className="form-check mt-2">
      <label className="form-check-label">
        <input
          className="form-check-input"
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
        />{' '}
        {label}
      </label>
    </div>
  );
}

/** Contenido del visor de archivo adjunto (imagen o documento). */
/**
 * Vista previa de un archivo adjunto (responsiva):
 *  - imágenes y PDF se muestran dentro de la ventana
 *  - Word / Excel no se pueden previsualizar en el navegador: se ofrece abrir o descargar
 * url: dirección para verlo · urlDescarga: dirección que fuerza la descarga
 */
export function VisorArchivo({ ruta, tipo, url, urlDescarga, nombre, tituloDocumento = 'Documento' }) {
  const src = url || urlArchivo(ruta);
  const descarga = urlDescarga || src;
  if (!src) return <p className="text-muted mb-0">No hay archivo disponible.</p>;
  const ext = String(ruta || '').split('.').pop().toLowerCase();
  const clase = tipo === 'image' ? 'image' : tipo === 'pdf' || ext === 'pdf' ? 'pdf' : 'document';

  if (clase === 'image') return <img src={src} className="visor-imagen" alt={tituloDocumento} />;
  if (clase === 'pdf') return <VisorPdf url={src} titulo={tituloDocumento} />;
  const icono = ['xls', 'xlsx'].includes(ext) ? 'fa-file-excel text-success' : ['doc', 'docx'].includes(ext) ? 'fa-file-word text-primary' : 'fa-file-alt';
  return (
    <div className="document-info">
      <div className="file-icon-lg">
        <i className={`fas ${icono}`} />
      </div>
      <h5>{nombre || tituloDocumento}</h5>
      <p>Los archivos de Word y Excel no se pueden previsualizar en el navegador. Descárgalo para abrirlo.</p>
      <div className="d-flex gap-2 justify-content-center">
        <a href={descarga} className="btn btn-success" download>
          <i className="fas fa-download me-1" /> Descargar
        </a>
      </div>
    </div>
  );
}

/** Aviso para el perfil Usuario: puede consultar, pero no agregar, editar ni eliminar. */
export function SoloLectura() {
  return (
    <span className="badge-solo-lectura" title="Tu perfil solo permite consultar la información">
      <Icono nombre="ojo" size={16} /> Solo lectura
    </span>
  );
}
