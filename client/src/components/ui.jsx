/* Piezas pequeñas compartidas por los módulos de inventario */
import { urlArchivo } from '../api.js';

export function EstadoBadge({ activo, femenino = false }) {
  const on = Number(activo) === 1;
  const texto = on ? (femenino ? 'Activa' : 'Activo') : femenino ? 'Inactiva' : 'Inactivo';
  return <span className={`badge ${on ? 'badge-activo' : 'badge-inactivo'}`}>{texto}</span>;
}

/** Estado de los equipos de inventario: Asignado / Sin asignar */
export function AsignadoBadge({ asignado }) {
  const si = Number(asignado) === 1;
  return <span className={`badge ${si ? 'badge-asignado' : 'badge-sin-asignar'}`}>{si ? 'Asignado' : 'Sin asignar'}</span>;
}

export function FiltroAsignado({ value, onChange }) {
  return (
    <select className="form-select" value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">Todos</option>
      <option value="asignado">Asignados</option>
      <option value="sin_asignar">Sin asignar</option>
    </select>
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
  const clase = dias < 0 ? 'text-danger fw-bold' : dias <= 30 ? 'text-warning fw-bold' : '';
  const titulo = dias < 0 ? 'Vencida' : dias <= 30 ? `Vence en ${dias} día(s)` : '';
  return (
    <span className={clase} title={titulo}>
      {textoFecha(valor)}
      {dias < 0 && <i className="fas fa-exclamation-circle ms-1" />}
    </span>
  );
}

export function PageCard({ title, action, children }) {
  return (
    <div className="container">
      <div className="page-inner">
        <div className="row">
          <div className="col-md-12">
            <div className="card">
              <div className="card-header">
                <div className="d-flex align-items-center flex-wrap gap-2">
                  <h4 className="card-title mb-0">{title}</h4>
                  {action && <div className="ms-auto">{action}</div>}
                </div>
              </div>
              <div className="card-body">{children}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
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
    <input
      type="search"
      className="form-control"
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

export function AccionesFila({ onVer, onEditar, onEliminar }) {
  return (
    <div className="btn-group-gap">
      {onVer && (
        <button type="button" className="btn btn-sm btn-primary" title="Ver" onClick={onVer}>
          <i className="fas fa-eye" />
        </button>
      )}
      {onEditar && (
        <button type="button" className="btn btn-sm btn-warning" title="Editar" onClick={onEditar}>
          <i className="fas fa-edit" />
        </button>
      )}
      {onEliminar && (
        <button type="button" className="btn btn-sm btn-danger" title="Eliminar" onClick={onEliminar}>
          <i className="fas fa-trash" />
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
        {required && ' *'}
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
export function VisorArchivo({ ruta, tipo, tituloDocumento = 'Documento' }) {
  const url = urlArchivo(ruta);
  if (!ruta) return <p className="text-muted mb-0">No hay archivo disponible.</p>;
  if (tipo === 'image') return <img src={url} className="visor-imagen" alt="Vista" />;
  return (
    <div className="document-info">
      <div className="file-icon-lg">
        <i className="fas fa-file-alt" />
      </div>
      <h5>{tituloDocumento}</h5>
      <p>Este documento se abrirá en una nueva ventana</p>
      <div className="d-flex gap-2 justify-content-center">
        <a href={url} className="btn btn-primary" target="_blank" rel="noreferrer">
          <i className="fas fa-external-link-alt me-1" /> Abrir documento
        </a>
        <a href={url} className="btn btn-success" download>
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
      <i className="fas fa-eye me-1" /> Solo lectura
    </span>
  );
}
