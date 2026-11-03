import { useCallback, useEffect, useState } from 'react';
import { api, FOTO_DEFAULT, urlArchivo } from '../api.js';
import DataTable from '../components/DataTable.jsx';
import Modal, { ConfirmModal } from '../components/Modal.jsx';
import { BotonGuardar, Buscador, Campo, PageCard } from '../components/ui.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';

const VACIO = { id: null, nombre: '', usuario: '', password: '', perfil: '', foto: null, fotoActual: null };

export function validarImagenPerfil(file, toast) {
  if (!file) return true;
  if (!['image/jpeg', 'image/png'].includes(file.type)) {
    toast.error('La imagen debe estar en formato JPG o PNG');
    return false;
  }
  if (file.size > 2_000_000) {
    toast.error('La imagen no debe pesar más de 2MB');
    return false;
  }
  return true;
}

export default function Usuarios() {
  const toast = useToast();
  const { user } = useAuth();
  const [rows, setRows] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState('');

  const [form, setForm] = useState(null); // null = cerrado
  const [preview, setPreview] = useState(null);
  const [usuarioExiste, setUsuarioExiste] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [aEliminar, setAEliminar] = useState(null);

  const cargar = useCallback(() => {
    setCargando(true);
    api
      .get('/api/usuarios')
      .then(setRows)
      .catch((e) => toast.error(e.message))
      .finally(() => setCargando(false));
  }, [toast]);

  useEffect(cargar, [cargar]);

  const abrirNuevo = () => {
    setForm({ ...VACIO });
    setPreview(FOTO_DEFAULT);
    setUsuarioExiste(false);
  };

  const abrirEditar = async (id) => {
    try {
      const { data } = await api.get(`/api/usuarios/${id}`);
      setForm({ ...VACIO, id: data.id, nombre: data.nombre, usuario: data.usuario, perfil: data.perfil, fotoActual: data.foto });
      setPreview(urlArchivo(data.foto) || FOTO_DEFAULT);
    } catch (e) {
      toast.error(e.message);
    }
  };

  const cerrar = () => setForm(null);
  const set = (campo) => (e) => setForm((f) => ({ ...f, [campo]: e.target.value }));

  const elegirFoto = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!validarImagenPerfil(file, toast)) {
      e.target.value = '';
      return;
    }
    setForm((f) => ({ ...f, foto: file }));
    setPreview(URL.createObjectURL(file));
  };

  const verificarUsuario = async () => {
    if (!form.usuario || form.id) return setUsuarioExiste(false);
    try {
      const r = await api.get(`/api/usuarios/existe?usuario=${encodeURIComponent(form.usuario)}`);
      setUsuarioExiste(r.existe);
    } catch {
      /* sin conexión: lo validará el servidor */
    }
  };

  const guardar = async (e) => {
    e.preventDefault();
    if (usuarioExiste) return toast.error('Este usuario ya existe');
    const fd = new FormData();
    fd.append('nombre', form.nombre);
    fd.append('perfil', form.perfil);
    if (form.password) fd.append('password', form.password);
    if (form.foto) fd.append('foto', form.foto);
    setGuardando(true);
    try {
      let r;
      if (form.id) {
        r = await api.put(`/api/usuarios/${form.id}`, fd);
      } else {
        fd.append('usuario', form.usuario);
        r = await api.post('/api/usuarios', fd);
      }
      toast.exito(r.message);
      cerrar();
      cargar();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setGuardando(false);
    }
  };

  const cambiarEstado = async (row) => {
    const nuevo = row.estado === 1 ? 0 : 1;
    try {
      const r = await api.patch(`/api/usuarios/${row.id}/estado`, { estado: nuevo });
      toast.exito(r.message);
      setRows((rs) => rs.map((x) => (x.id === row.id ? { ...x, estado: nuevo } : x)));
    } catch (e) {
      toast.error(e.message);
    }
  };

  const eliminar = async () => {
    setGuardando(true);
    try {
      const r = await api.del(`/api/usuarios/${aEliminar.id}`);
      toast.exito(r.message);
      setAEliminar(null);
      cargar();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setGuardando(false);
    }
  };

  const columns = [
    { key: 'contador', header: '#', className: 'text-center' },
    { key: 'nombre', header: 'Nombre' },
    { key: 'usuario', header: 'Usuario' },
    {
      key: 'foto',
      header: 'Foto',
      sortable: false,
      searchValue: () => '',
      className: 'text-center',
      render: (r) => (
        <img
          src={urlArchivo(r.foto) || FOTO_DEFAULT}
          className="profile-img"
          alt=""
          onError={(e) => (e.currentTarget.src = FOTO_DEFAULT)}
        />
      ),
    },
    { key: 'perfil', header: 'Perfil' },
    {
      key: 'estado',
      header: 'Estado',
      className: 'text-center',
      searchValue: (r) => (r.estado === 1 ? 'Activado' : 'Desactivado'),
      render: (r) => (
        <button
          type="button"
          className={`btn btn-xs ${r.estado === 1 ? 'btn-success' : 'btn-danger'}`}
          onClick={() => cambiarEstado(r)}
          disabled={r.id === user.id}
          title={r.id === user.id ? 'No puedes desactivar tu propio usuario' : 'Cambiar estado'}
        >
          {r.estado === 1 ? 'Activado' : 'Desactivado'}
        </button>
      ),
    },
    { key: 'ultimo_login', header: 'Último login' },
    {
      header: 'Acciones',
      sortable: false,
      className: 'text-center',
      render: (r) => (
        <div className="btn-group-gap justify-content-center">
          <button type="button" className="btn btn-sm btn-warning" title="Editar" onClick={() => abrirEditar(r.id)}>
            <i className="fas fa-edit" />
          </button>
          <button
            type="button"
            className="btn btn-sm btn-danger"
            title="Eliminar"
            onClick={() => setAEliminar(r)}
            disabled={r.usuario === 'admin' || r.id === user.id}
          >
            <i className="fas fa-trash" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <PageCard
      title="Administrar Usuarios"
      action={
        <button type="button" className="btn btn-primary btn-round" onClick={abrirNuevo}>
          <i className="fa fa-plus me-1" /> Agregar Usuario
        </button>
      }
    >
      <div className="row mb-3">
        <div className="col-md-4">
          <Buscador value={busqueda} onChange={setBusqueda} placeholder="Buscar por nombre, usuario o perfil..." />
        </div>
      </div>

      <DataTable columns={columns} rows={rows} search={busqueda} loading={cargando} tableId="tablaUsuarios" />

      <Modal show={!!form} onClose={cerrar} title={form?.id ? 'Editar Usuario' : 'Agregar Usuario'}>
        {form && (
          <form id="formUsuario" onSubmit={guardar}>
            <Campo label="Nombre completo" required>
              <input className="form-control" value={form.nombre} onChange={set('nombre')} placeholder="Ingresar nombre" required />
            </Campo>
            <Campo label="Usuario" required>
              <input
                className="form-control"
                value={form.usuario}
                onChange={(e) => {
                  set('usuario')(e);
                  setUsuarioExiste(false);
                }}
                onBlur={verificarUsuario}
                placeholder="Ingresar usuario"
                readOnly={!!form.id}
                required
              />
              {usuarioExiste && <div className="text-danger small mt-1">Este usuario ya existe</div>}
            </Campo>
            <Campo label="Contraseña" required={!form.id}>
              <input
                type="password"
                className="form-control"
                value={form.password}
                onChange={set('password')}
                placeholder={form.id ? 'Dejar vacío para no cambiar' : 'Ingresar contraseña'}
                autoComplete="new-password"
                required={!form.id}
              />
            </Campo>
            <Campo label="Perfil de usuario" required>
              <select className="form-control" value={form.perfil} onChange={set('perfil')} required>
                <option value="">Seleccionar perfil</option>
                <option value="Administrador">Administrador — agrega, edita y elimina</option>
                <option value="Usuario">Usuario — solo consulta</option>
              </select>
              {form.perfil && (
                <p className="help-block small text-muted mb-0">
                  {form.perfil === 'Administrador'
                    ? 'Acceso completo: puede agregar, editar y eliminar información y administrar usuarios.'
                    : 'Solo puede ver la información de los módulos. No puede agregar, editar, eliminar ni subir archivos.'}
                </p>
              )}
            </Campo>
            <Campo label="Foto de perfil">
              <input type="file" className="form-control" accept="image/jpeg,image/png" onChange={elegirFoto} />
              <p className="help-block small text-muted mb-0">Peso máximo de la foto 2MB (JPEG o PNG)</p>
              <div className="text-center mt-2">
                <img src={preview || FOTO_DEFAULT} className="img-thumbnail" width="100" alt="Vista previa" />
              </div>
            </Campo>
            <div className="modal-footer px-0 pb-0">
              <button type="button" className="btn btn-secondary" onClick={cerrar}>
                Cancelar
              </button>
              <BotonGuardar busy={guardando}>{form.id ? 'Guardar cambios' : 'Guardar usuario'}</BotonGuardar>
            </div>
          </form>
        )}
      </Modal>

      <ConfirmModal show={!!aEliminar} onClose={() => setAEliminar(null)} onConfirm={eliminar} busy={guardando}>
        <p className="mb-0">
          ¿Está seguro que desea eliminar al usuario <strong>{aEliminar?.usuario}</strong>? Esta acción no se puede deshacer.
        </p>
      </ConfirmModal>
    </PageCard>
  );
}
