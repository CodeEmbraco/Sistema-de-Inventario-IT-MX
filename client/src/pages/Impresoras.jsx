import { useCallback, useEffect, useState } from 'react';
import { api, formatoFecha, urlArchivo } from '../api.js';
import DataTable from '../components/DataTable.jsx';
import Modal, { ConfirmModal } from '../components/Modal.jsx';
import Autocomplete from '../components/Autocomplete.jsx';
import Adjunto from '../components/Adjunto.jsx';
import {
  AccionesFila,
  BotonGuardar,
  Buscador,
  Campo,
  CheckActivo,
  DetailCard,
  DetailRow,
  EstadoBadge,
  FiltroEstado,
  PageCard,
  SoloLectura,
} from '../components/ui.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';

const BASE = '/api/impresoras';
const VACIO = { id: null, nombre: '', marca: '', modelo: '', serie: '', ubicacion: '', ip: '', activo: true };
const IPV4 = '^((25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]?\\d)\\.){3}(25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]?\\d)$';

function colorToner(color, porcentaje) {
  const n = color.toLowerCase();
  if (n.includes('residual') || n.includes('desecho') || n.includes('waste')) {
    return { nombre: 'Bote de desecho', clase: porcentaje >= 85 ? 'bg-danger' : porcentaje >= 65 ? 'bg-warning' : 'bg-success' };
  }
  return { nombre: color, clase: porcentaje <= 20 ? 'bg-danger' : porcentaje <= 40 ? 'bg-warning' : 'bg-success' };
}

function Toner({ impresora }) {
  const [estado, setEstado] = useState({ cargando: true });

  useEffect(() => {
    if (!impresora.ip || Number(impresora.activo) !== 1) {
      setEstado({ mensaje: 'Requiere IP y estar activa' });
      return undefined;
    }
    let vivo = true;
    setEstado({ cargando: true });
    api
      .get(`${BASE}/${impresora.id}/toner`)
      .then((r) => vivo && setEstado({ toners: r.toners }))
      .catch((e) => vivo && setEstado(e.status === 0 ? { error: 'Error de conexión' } : { mensaje: e.message }));
    return () => {
      vivo = false;
    };
  }, [impresora]);

  if (estado.cargando) {
    return (
      <span className="fw-bold">
        <i className="fas fa-spinner fa-spin text-primary me-1" /> Consultando red...
      </span>
    );
  }
  if (estado.error) return <span className="text-danger">{estado.error}</span>;
  if (estado.mensaje) return <span className="text-muted">{estado.mensaje}</span>;

  return (
    <div className="w-100 pt-1">
      {estado.toners.map((t, i) => {
        const { nombre, clase } = colorToner(t.color, t.porcentaje);
        return (
          <div className="mb-3" key={i}>
            <div className="d-flex justify-content-between small mb-1">
              <span className="text-muted fw-medium">{nombre}</span>
              <span className="fw-bold">{t.porcentaje}%</span>
            </div>
            <div className="progress toner-bar">
              <div
                className={`progress-bar ${clase}`}
                role="progressbar"
                style={{ width: `${t.porcentaje}%` }}
                aria-valuenow={t.porcentaje}
                aria-valuemin="0"
                aria-valuemax="100"
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function Impresoras() {
  const toast = useToast();
  const { esAdmin: puedeEditar } = useAuth(); // el perfil Usuario solo consulta
  const [rows, setRows] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [estado, setEstado] = useState('');
  const [busqueda, setBusqueda] = useState('');

  const [form, setForm] = useState(null);
  const [fotoActual, setFotoActual] = useState(null);
  const [archivo, setArchivo] = useState(null);
  const [guardando, setGuardando] = useState(false);

  const [detalle, setDetalle] = useState(null);
  const [visor, setVisor] = useState(null);
  const [aEliminar, setAEliminar] = useState(null);
  const [confirmarQuitar, setConfirmarQuitar] = useState(false);

  const cargar = useCallback(() => {
    setCargando(true);
    api
      .get(`${BASE}${estado ? `?estado=${estado}` : ''}`)
      .then(setRows)
      .catch((e) => toast.error(e.message))
      .finally(() => setCargando(false));
  }, [estado, toast]);

  useEffect(cargar, [cargar]);

  const obtener = async (id) => (await api.get(`${BASE}/${id}`)).data;

  const abrirNuevo = () => {
    setForm({ ...VACIO });
    setFotoActual(null);
    setArchivo(null);
  };

  const abrirEditar = async (id) => {
    try {
      const i = await obtener(id);
      setForm({
        id: i.id,
        nombre: i.nombre,
        marca: i.marca || '',
        modelo: i.modelo || '',
        serie: i.serie,
        ubicacion: i.ubicacion || '',
        ip: i.ip || '',
        activo: Number(i.activo) === 1,
      });
      setFotoActual(i.foto ? { ruta: i.foto, tipo: 'image' } : null);
      setArchivo(null);
    } catch (e) {
      toast.error(e.message);
    }
  };

  const abrirDetalle = async (id) => {
    try {
      setDetalle(await obtener(id));
    } catch (e) {
      toast.error(e.message);
    }
  };

  const set = (campo) => (v) => setForm((f) => ({ ...f, [campo]: v?.target ? v.target.value : v }));

  const guardar = async (e) => {
    e.preventDefault();
    setGuardando(true);
    try {
      const body = { ...form, activo: form.activo ? 1 : 0 };
      let id = form.id;
      if (id) await api.put(`${BASE}/${id}`, body);
      else id = (await api.post(BASE, body)).impresora_id;

      if (archivo) {
        const fd = new FormData();
        fd.append('foto', archivo);
        try {
          await api.post(`${BASE}/${id}/foto`, fd);
          toast.exito('Impresora y foto guardadas correctamente');
        } catch (err) {
          toast.aviso(`La impresora se guardó, pero la foto no: ${err.message}`);
        }
      } else {
        toast.exito(form.id ? 'Impresora actualizada correctamente' : 'Impresora creada correctamente');
      }
      setForm(null);
      cargar();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setGuardando(false);
    }
  };

  const quitarFoto = async () => {
    try {
      const r = await api.del(`${BASE}/${form.id}/foto`);
      toast.exito(r.message);
      setFotoActual(null);
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

  const na = (k) => (r) => r[k] || 'N/A';

  const columns = [
    { key: 'nombre', header: 'Nombre' },
    { key: 'marca', header: 'Marca', render: na('marca') },
    { key: 'modelo', header: 'Modelo', render: na('modelo') },
    { key: 'serie', header: 'Serie' },
    { key: 'ip', header: 'IP', render: (r) => r.ip || <span className="text-muted">—</span> },
    { key: 'ubicacion', header: 'Ubicación', render: na('ubicacion') },
    {
      key: 'has_foto',
      header: 'Foto',
      sortValue: (r) => (r.has_foto ? 1 : 0),
      searchValue: () => '',
      render: (r) =>
        r.has_foto ? (
          <img
            src={urlArchivo(r.foto)}
            className="imagen-thumbnail"
            alt="Foto"
            title="Ver foto"
            onClick={() => setVisor(r.foto)}
          />
        ) : (
          <span className="badge badge-secondary">Sin foto</span>
        ),
    },
    {
      key: 'activo',
      header: 'Estado',
      searchValue: (r) => (Number(r.activo) === 1 ? 'Activo' : 'Inactivo'),
      render: (r) => <EstadoBadge activo={r.activo} />,
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

  return (
    <PageCard
      title="Administrar Impresoras"
      action={
        puedeEditar ? (
          <button type="button" className="btn btn-primary btn-round" onClick={abrirNuevo}>
            <i className="fa fa-plus me-1" /> Agregar Impresora
          </button>
        ) : (
          <SoloLectura />
        )
      }
    >
      <div className="row g-2 mb-3">
        <div className="col-md-3">
          <FiltroEstado value={estado} onChange={setEstado} />
        </div>
        <div className="col-md-4">
          <Buscador value={busqueda} onChange={setBusqueda} placeholder="Buscar por serie, nombre, marca o modelo..." />
        </div>
      </div>

      <DataTable columns={columns} rows={rows} search={busqueda} loading={cargando} tableId="tablaImpresoras" />

      <Modal show={puedeEditar && !!form} onClose={() => setForm(null)} size="lg" title={form?.id ? 'Editar Impresora' : 'Agregar Impresora'}>
        {form && (
          <form onSubmit={guardar}>
            <div className="row">
              <div className="col-md-6">
                <Campo label="Nombre" required>
                  <input className="form-control" value={form.nombre} onChange={set('nombre')} placeholder="Nombre de la impresora" required />
                </Campo>
                <Campo label="Marca">
                  <Autocomplete url={`${BASE}/sugerencias/marcas`} value={form.marca} onChange={set('marca')} placeholder="Escriba para buscar marca..." />
                </Campo>
                <Campo label="Modelo">
                  <Autocomplete url={`${BASE}/sugerencias/modelos`} value={form.modelo} onChange={set('modelo')} placeholder="Escriba para buscar modelo..." />
                </Campo>
              </div>
              <div className="col-md-6">
                <Campo label="Número de Serie" required>
                  <input className="form-control" value={form.serie} onChange={set('serie')} placeholder="Número de serie" required />
                </Campo>
                <Campo label="Ubicación">
                  <Autocomplete url={`${BASE}/sugerencias/ubicaciones`} value={form.ubicacion} onChange={set('ubicacion')} placeholder="Escriba para buscar ubicación..." />
                </Campo>
                <Campo label="Dirección IP" required>
                  <input
                    className="form-control"
                    value={form.ip}
                    onChange={set('ip')}
                    placeholder="Ej: 192.168.1.50"
                    pattern={IPV4}
                    title="Dirección IPv4, por ejemplo 192.168.1.50"
                    required
                  />
                </Campo>
                <CheckActivo checked={form.activo} onChange={set('activo')} label="Impresora activa" />
              </div>
            </div>

            <Adjunto
              titulo="Foto de la Impresora"
              actual={fotoActual}
              onVer={() => setVisor(fotoActual.ruta)}
              onEliminar={() => setConfirmarQuitar(true)}
              accept="image/*"
              maxMB={5}
              ayuda="Formatos permitidos: JPG, PNG, GIF, BMP, WEBP. Tamaño máximo: 5MB."
              onFile={setArchivo}
              toast={toast}
            />

            <div className="modal-footer px-0 pb-0">
              <button type="button" className="btn btn-secondary" onClick={() => setForm(null)}>
                Cancelar
              </button>
              <BotonGuardar busy={guardando}>{form.id ? 'Guardar Cambios' : 'Guardar Impresora'}</BotonGuardar>
            </div>
          </form>
        )}
      </Modal>

      <Modal
        show={!!detalle}
        onClose={() => setDetalle(null)}
        size="lg"
        title="Detalles de la Impresora"
        footer={
          <button type="button" className="btn btn-secondary" onClick={() => setDetalle(null)}>
            Cerrar
          </button>
        }
      >
        {detalle && (
          <>
            <DetailCard title="Información de la Impresora">
              <DetailRow label="Nombre">{detalle.nombre}</DetailRow>
              <DetailRow label="Marca">{detalle.marca || 'No especificado'}</DetailRow>
              <DetailRow label="Modelo">{detalle.modelo || 'No especificado'}</DetailRow>
              <DetailRow label="Número de Serie">{detalle.serie}</DetailRow>
              <DetailRow label="Dirección IP">{detalle.ip || 'No asignada'}</DetailRow>
              <DetailRow label="Nivel de Tóner">
                <Toner impresora={detalle} />
              </DetailRow>
            </DetailCard>
            <DetailCard title="Información de Ubicación">
              <DetailRow label="Ubicación">{detalle.ubicacion || 'No especificado'}</DetailRow>
              <DetailRow label="Estado">{Number(detalle.activo) === 1 ? 'Activo' : 'Inactivo'}</DetailRow>
              <DetailRow label="Fecha de Registro">{formatoFecha(detalle.created_at)}</DetailRow>
              <DetailRow label="Última Actualización">{formatoFecha(detalle.updated_at)}</DetailRow>
            </DetailCard>
            <DetailCard title="Foto de la Impresora">
              {detalle.has_foto ? (
                <button type="button" className="btn btn-sm btn-info" onClick={() => setVisor(detalle.foto)}>
                  <i className="fas fa-eye" /> Ver Foto
                </button>
              ) : (
                <span>No disponible</span>
              )}
            </DetailCard>
          </>
        )}
      </Modal>

      <Modal
        show={!!visor}
        onClose={() => setVisor(null)}
        size="xl"
        title="Foto de la Impresora"
        bodyClass="text-center"
        footer={
          <>
            <a href={urlArchivo(visor)} className="btn btn-primary" download>
              <i className="fas fa-download" /> Descargar
            </a>
            <button type="button" className="btn btn-secondary" onClick={() => setVisor(null)}>
              Cerrar
            </button>
          </>
        }
      >
        {visor && <img src={urlArchivo(visor)} className="visor-imagen" alt="Foto de la impresora" />}
      </Modal>

      <ConfirmModal show={!!aEliminar} onClose={() => setAEliminar(null)} onConfirm={eliminar} busy={guardando}>
        <p className="mb-0">¿Está seguro que desea eliminar esta impresora? Esta acción no se puede deshacer.</p>
      </ConfirmModal>

      <ConfirmModal show={confirmarQuitar} onClose={() => setConfirmarQuitar(false)} onConfirm={quitarFoto} title="Eliminar foto">
        <p className="mb-0">¿Está seguro que desea eliminar la foto actual?</p>
      </ConfirmModal>
    </PageCard>
  );
}
