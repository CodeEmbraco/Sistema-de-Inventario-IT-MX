import { useCallback, useEffect, useMemo, useState } from 'react';
import { api, formatoFecha, urlArchivo } from '../api.js';
import DataTable from '../components/DataTable.jsx';
import Modal, { ConfirmModal } from '../components/Modal.jsx';
import Autocomplete from '../components/Autocomplete.jsx';
import Adjunto from '../components/Adjunto.jsx';
import {
  AccionesFila,
  AsignadoBadge,
  BotonGuardar,
  Buscador,
  Campo,
  DetailCard,
  DetailRow,
  FiltroAsignado,
  PageCard,
  SoloLectura,
  textoFecha,
  VigenciaBadge,
  VisorArchivo,
} from '../components/ui.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';

/**
 * Página genérica de inventario (Celulares, Cómputo administrativo/industrial,
 * Monitores, Proyectores). Todo sale de la definición en src/modulos.js.
 *
 * fijo: valores fijos del submódulo, ej. { tipo_equipo: 'PC' } en Cómputo administrativo · PC.
 *       Filtra el listado y se envía al guardar.
 * El perfil Usuario solo consulta (sin agregar, editar ni eliminar).
 */
export default function ModuloEquipos({ clave, cfg, fijo = null }) {
  const toast = useToast();
  const { esAdmin } = useAuth();
  const puedeEditar = esAdmin;
  const BASE = `/api/${clave}`;
  const campos = cfg.campos;
  const nombres = Object.keys(campos);

  const [rows, setRows] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [estado, setEstado] = useState('');
  const [busqueda, setBusqueda] = useState('');

  const [form, setForm] = useState(null);
  const [archivoActual, setArchivoActual] = useState(null);
  const [archivo, setArchivo] = useState(null);
  const [guardando, setGuardando] = useState(false);

  const [detalle, setDetalle] = useState(null);
  const [historial, setHistorial] = useState(null);
  const [visor, setVisor] = useState(null);
  const [aEliminar, setAEliminar] = useState(null);
  const [confirmarQuitar, setConfirmarQuitar] = useState(false);

  const vacio = useMemo(() => ({ id: null, asignado: true, ...Object.fromEntries(nombres.map((n) => [n, ''])) }), [nombres]);

  const cargar = useCallback(() => {
    setCargando(true);
    api
      .get(`${BASE}?${new URLSearchParams({ ...(estado ? { estado } : {}), ...(fijo || {}) })}`)
      .then(setRows)
      .catch((e) => toast.error(e.message))
      .finally(() => setCargando(false));
  }, [BASE, estado, toast, fijo]);

  useEffect(cargar, [cargar]);

  const obtener = async (id) => (await api.get(`${BASE}/${id}`)).data;

  const abrirNuevo = () => {
    setForm({ ...vacio });
    setArchivoActual(null);
    setArchivo(null);
  };

  const abrirEditar = async (id) => {
    try {
      const r = await obtener(id);
      setForm({
        id: r.id,
        asignado: Number(r.asignado) === 1,
        ...Object.fromEntries(nombres.map((n) => [n, r[n] ?? ''])),
      });
      setArchivoActual(r.has_archivo ? { ruta: r.responsiva, tipo: r.archivo_tipo } : null);
      setArchivo(null);
    } catch (e) {
      toast.error(e.message);
    }
  };

  const abrirDetalle = async (id) => {
    try {
      setHistorial(null);
      setDetalle(await obtener(id));
      api
        .get(`${BASE}/${id}/historial`)
        .then((r) => setHistorial(r.data))
        .catch(() => setHistorial([]));
    } catch (e) {
      toast.error(e.message);
    }
  };

  const set = (campo) => (v) => setForm((x) => ({ ...x, [campo]: v?.target ? v.target.value : v }));
  const obligatorio = (c) => c.requerido || (c.siAsignado && form?.asignado);

  const guardar = async (e) => {
    e.preventDefault();
    setGuardando(true);
    try {
      const body = { ...form, ...(fijo || {}), asignado: form.asignado ? 1 : 0 };
      let id = form.id;
      if (id) await api.put(`${BASE}/${id}`, body);
      else id = (await api.post(BASE, body)).id;

      if (archivo) {
        const fd = new FormData();
        fd.append('archivo', archivo);
        try {
          await api.post(`${BASE}/${id}/archivo`, fd);
          toast.exito(`${cfg.singular} y ${cfg.archivo.titulo.toLowerCase()} guardados correctamente`);
        } catch (err) {
          toast.aviso(`Se guardó el registro, pero la ${cfg.archivo.titulo.toLowerCase()} no: ${err.message}`);
        }
      } else {
        toast.exito(form.id ? `${cfg.singular} actualizado correctamente` : `${cfg.singular} registrado correctamente`);
      }
      setForm(null);
      cargar();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setGuardando(false);
    }
  };

  const quitarArchivo = async () => {
    try {
      const r = await api.del(`${BASE}/${form.id}/archivo`);
      toast.exito(r.message);
      setArchivoActual(null);
      setConfirmarQuitar(false);
      cargar();
    } catch (e) {
      toast.error(e.message);
    }
  };

  const eliminar = async () => {
    setGuardando(true);
    try {
      const r = await api.del(`${BASE}/${aEliminar}`);
      toast.exito(r.message);
      setAEliminar(null);
      cargar();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setGuardando(false);
    }
  };

  // ---------------------------------------------------------------- tabla
  const valorCelda = (n, r) => {
    const c = campos[n];
    if (n === 'vigencia') return <VigenciaBadge valor={r[n]} />;
    if (c.tipo === 'fecha') return textoFecha(r[n]) || <span className="text-muted">—</span>;
    return r[n] || <span className="text-muted">—</span>;
  };

  const columns = [
    ...nombres
      .filter((n) => campos[n].enTabla)
      .map((n) => ({
        key: n,
        header: campos[n].etiqueta.replace(' (opcional)', ''),
        render: (r) => valorCelda(n, r),
      })),
    ...(cfg.archivo
      ? [
          {
            key: 'has_archivo',
            header: cfg.archivo.titulo,
            sortValue: (r) => (r.has_archivo ? 1 : 0),
            searchValue: () => '',
            render: (r) =>
              r.has_archivo ? (
                <button
                  type="button"
                  className="btn btn-sm btn-info"
                  title={`Ver ${cfg.archivo.titulo.toLowerCase()}`}
                  onClick={() => setVisor({ ruta: r.responsiva, tipo: r.archivo_tipo })}
                >
                  <i className="fas fa-eye" />
                </button>
              ) : (
                <span className="badge badge-secondary">Sin {cfg.archivo.titulo.toLowerCase()}</span>
              ),
          },
        ]
      : []),
    {
      key: 'asignado',
      header: 'Estado',
      searchValue: (r) => (Number(r.asignado) === 1 ? 'Asignado' : 'Sin asignar'),
      render: (r) => <AsignadoBadge asignado={r.asignado} />,
    },
    {
      header: 'Acciones',
      sortable: false,
      render: (r) => (
        <AccionesFila
          onVer={() => abrirDetalle(r.id)}
          onEditar={puedeEditar ? () => abrirEditar(r.id) : null}
          onEliminar={puedeEditar ? () => setAEliminar(r.id) : null}
        />
      ),
    },
  ];

  // ---------------------------------------------------------------- formulario
  const mitad = Math.ceil(nombres.length / 2);
  const columnasForm = [nombres.slice(0, mitad), nombres.slice(mitad)];

  const campoForm = (n) => {
    const c = campos[n];
    const req = obligatorio(c);
    if (c.tipo === 'fecha') {
      return (
        <Campo key={n} label={c.etiqueta} required={req}>
          <input type="date" className="form-control" value={form[n]} onChange={set(n)} required={req} />
        </Campo>
      );
    }
    return (
      <Campo key={n} label={c.etiqueta} required={req}>
        {c.sugerir ? (
          <Autocomplete
            url={`${BASE}/sugerencias/${n}`}
            value={form[n]}
            onChange={set(n)}
            placeholder={c.placeholder || `Escriba para buscar ${c.etiqueta.toLowerCase()}...`}
            required={req}
          />
        ) : (
          <input className="form-control" value={form[n]} onChange={set(n)} placeholder={c.placeholder} required={req} />
        )}
      </Campo>
    );
  };

  return (
    <PageCard
      title={cfg.titulo}
      action={
        puedeEditar ? (
          <button type="button" className="btn btn-primary btn-round" onClick={abrirNuevo}>
            <i className="fa fa-plus me-1" /> {cfg.agregar}
          </button>
        ) : (
          <SoloLectura />
        )
      }
    >
      <div className="row g-2 mb-3">
        <div className="col-md-3">
          <FiltroAsignado value={estado} onChange={setEstado} />
        </div>
        <div className="col-md-5">
          <Buscador value={busqueda} onChange={setBusqueda} placeholder={cfg.busqueda} />
        </div>
      </div>

      <DataTable columns={columns} rows={rows} search={busqueda} loading={cargando} tableId={`tabla-${clave}`} />

      {/* Agregar / editar */}
      <Modal show={puedeEditar && !!form} onClose={() => setForm(null)} size="lg" title={form?.id ? `Editar ${cfg.singular}` : cfg.agregar}>
        {form && (
          <form onSubmit={guardar}>
            <div className="asignado-switch mb-3">
              <div className="form-check form-switch mb-0">
                <input
                  className="form-check-input"
                  type="checkbox"
                  role="switch"
                  id={`asignado-${clave}`}
                  checked={form.asignado}
                  onChange={(e) => setForm((x) => ({ ...x, asignado: e.target.checked }))}
                />
                <label className="form-check-label fw-bold" htmlFor={`asignado-${clave}`}>
                  {form.asignado ? 'Asignado' : 'Sin asignar'}
                </label>
              </div>
              <small className="text-muted">
                {nombres.some((n) => campos[n].siAsignado)
                  ? form.asignado
                    ? 'Los campos de asignación son obligatorios.'
                    : 'Equipo disponible: los datos de asignación son opcionales.'
                  : 'Indica si el equipo está asignado a alguien.'}
              </small>
            </div>

            <div className="row">
              {columnasForm.map((lista, i) => (
                <div className="col-md-6" key={i}>
                  {lista.map(campoForm)}
                </div>
              ))}
            </div>

            {cfg.archivo && (
              <Adjunto
                titulo={cfg.archivo.titulo}
                actual={archivoActual}
                onVer={() => setVisor(archivoActual)}
                onEliminar={() => setConfirmarQuitar(true)}
                accept={cfg.archivo.accept}
                maxMB={cfg.archivo.maxMB}
                ayuda={cfg.archivo.ayuda}
                onFile={setArchivo}
                toast={toast}
              />
            )}

            <div className="modal-footer px-0 pb-0">
              <button type="button" className="btn btn-secondary" onClick={() => setForm(null)}>
                Cancelar
              </button>
              <BotonGuardar busy={guardando}>{form.id ? 'Guardar Cambios' : 'Guardar'}</BotonGuardar>
            </div>
          </form>
        )}
      </Modal>

      {/* Detalle */}
      <Modal
        show={!!detalle}
        onClose={() => setDetalle(null)}
        size="lg"
        title={`Detalles: ${cfg.singular}`}
        footer={
          <button type="button" className="btn btn-secondary" onClick={() => setDetalle(null)}>
            Cerrar
          </button>
        }
      >
        {detalle && (
          <>
            <DetailCard title="Información">
              <DetailRow label="Estado">
                <AsignadoBadge asignado={detalle.asignado} />
              </DetailRow>
              {nombres.map((n) => (
                <DetailRow key={n} label={campos[n].etiqueta.replace(' (opcional)', '')}>
                  {n === 'vigencia' ? (
                    <VigenciaBadge valor={detalle[n]} />
                  ) : campos[n].tipo === 'fecha' ? (
                    textoFecha(detalle[n]) || 'No especificado'
                  ) : (
                    detalle[n] || 'No especificado'
                  )}
                </DetailRow>
              ))}
              {cfg.archivo && (
                <DetailRow label={cfg.archivo.titulo}>
                  {detalle.has_archivo ? (
                    <button
                      type="button"
                      className="btn btn-sm btn-info"
                      onClick={() => setVisor({ ruta: detalle.responsiva, tipo: detalle.archivo_tipo })}
                    >
                      <i className="fas fa-eye" /> Ver {cfg.archivo.titulo.toLowerCase()}
                    </button>
                  ) : (
                    'No disponible'
                  )}
                </DetailRow>
              )}
              <DetailRow label="Fecha de registro">{formatoFecha(detalle.created_at)}</DetailRow>
              <DetailRow label="Última actualización">{formatoFecha(detalle.updated_at)}</DetailRow>
            </DetailCard>

            <DetailCard title="Historial de cambios">
              {historial === null ? (
                <span className="text-muted">
                  <span className="spinner-border spinner-border-sm me-2" /> Cargando...
                </span>
              ) : historial.length === 0 ? (
                <span className="text-muted">Sin movimientos</span>
              ) : (
                <ul className="historial">
                  {historial.map((h) => (
                    <li key={h.id}>
                      <span className={`badge ${h.accion === 'CREAR' ? 'bg-success' : h.accion === 'ELIMINAR' ? 'bg-danger' : 'bg-info'}`}>
                        {h.accion}
                      </span>{' '}
                      <small className="text-muted">
                        {formatoFecha(h.created_at)} · {h.usuario_nombre}
                      </small>
                      <div className="small">{h.detalles}</div>
                    </li>
                  ))}
                </ul>
              )}
            </DetailCard>
          </>
        )}
      </Modal>

      {/* Visor de responsiva */}
      <Modal
        show={!!visor}
        onClose={() => setVisor(null)}
        size="xl"
        title={cfg.archivo?.titulo || 'Archivo'}
        bodyClass="text-center"
        footer={
          <>
            <a href={urlArchivo(visor?.ruta)} className="btn btn-primary" target="_blank" rel="noreferrer" download>
              <i className="fas fa-download" /> Descargar
            </a>
            <button type="button" className="btn btn-secondary" onClick={() => setVisor(null)}>
              Cerrar
            </button>
          </>
        }
      >
        {visor && <VisorArchivo ruta={visor.ruta} tipo={visor.tipo} tituloDocumento={cfg.archivo?.titulo} />}
      </Modal>

      <ConfirmModal show={!!aEliminar} onClose={() => setAEliminar(null)} onConfirm={eliminar} busy={guardando}>
        <p className="mb-0">¿Está seguro que desea eliminar este registro? Esta acción no se puede deshacer.</p>
      </ConfirmModal>

      <ConfirmModal
        show={confirmarQuitar}
        onClose={() => setConfirmarQuitar(false)}
        onConfirm={quitarArchivo}
        title={`Eliminar ${cfg.archivo?.titulo.toLowerCase()}`}
      >
        <p className="mb-0">¿Está seguro que desea eliminar el archivo actual?</p>
      </ConfirmModal>
    </PageCard>
  );
}
