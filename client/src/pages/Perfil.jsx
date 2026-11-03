import { useEffect, useState } from 'react';
import { RUTA_INICIO } from '../modulos.js';
import { Link } from 'react-router-dom';
import { api, FOTO_DEFAULT, formatoFecha, urlArchivo } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { validarImagenPerfil } from './Usuarios.jsx';

export default function Perfil() {
  const toast = useToast();
  const { setUser } = useAuth();
  const [perfil, setPerfil] = useState(null);
  const [foto, setFoto] = useState(null);
  const [preview, setPreview] = useState(null);
  const [nueva, setNueva] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [mensaje, setMensaje] = useState(null);
  const [busy, setBusy] = useState(false);

  const cargar = () =>
    api
      .get('/api/perfil')
      .then((r) => setPerfil(r.data))
      .catch((e) => toast.error(e.message));

  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const elegirFoto = (e) => {
    const file = e.target.files[0];
    if (!file) {
      setFoto(null);
      setPreview(null);
      return;
    }
    if (!validarImagenPerfil(file, toast)) {
      e.target.value = '';
      return;
    }
    setFoto(file);
    setPreview(URL.createObjectURL(file));
  };

  const subirFoto = async (e) => {
    e.preventDefault();
    if (!foto) return toast.error('Selecciona una imagen');
    const fd = new FormData();
    fd.append('foto', foto);
    setBusy(true);
    try {
      const r = await api.post('/api/perfil/foto', fd);
      setMensaje({ tipo: 'success', texto: r.message });
      setUser(r.user);
      setFoto(null);
      setPreview(null);
      e.target.reset();
      cargar();
    } catch (err) {
      setMensaje({ tipo: 'danger', texto: err.message });
    } finally {
      setBusy(false);
    }
  };

  const cambiarPassword = async (e) => {
    e.preventDefault();
    if (nueva !== confirmar) return setMensaje({ tipo: 'danger', texto: 'Las contraseñas no coinciden' });
    setBusy(true);
    try {
      const r = await api.post('/api/perfil/password', { nuevaPassword: nueva, confirmarPassword: confirmar });
      setMensaje({ tipo: 'success', texto: r.message });
      setNueva('');
      setConfirmar('');
    } catch (err) {
      setMensaje({ tipo: 'danger', texto: err.message });
    } finally {
      setBusy(false);
    }
  };

  if (!perfil) {
    return (
      <div className="container">
        <div className="page-inner text-center py-5">
          <span className="spinner-border" />
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="page-inner">
        <div className="profile-container">
          <div className="profile-header">
            <h1 className="h3 mb-3">Mi Perfil</h1>
            <div className="mb-3">
              <img
                src={urlArchivo(perfil.foto) || FOTO_DEFAULT}
                className="profile-picture"
                alt="Foto de perfil"
                onError={(e) => (e.currentTarget.src = FOTO_DEFAULT)}
              />
            </div>
            <h2 className="h4">{perfil.nombre}</h2>
            <p className="text-muted">@{perfil.usuario}</p>
          </div>

          {mensaje && (
            <div className={`alert alert-${mensaje.tipo} alert-dismissible`} role="alert">
              {mensaje.texto}
              <button type="button" className="btn-close" aria-label="Cerrar" onClick={() => setMensaje(null)} />
            </div>
          )}

          <div className="profile-info">
            <h3 className="section-title">Información Personal</h3>
            <div className="info-item">
              <div className="info-label">Nombre completo</div>
              <div className="info-value">{perfil.nombre}</div>
            </div>
            <div className="info-item">
              <div className="info-label">Usuario</div>
              <div className="info-value">{perfil.usuario}</div>
            </div>
            <div className="info-item">
              <div className="info-label">Perfil</div>
              <div className="info-value">
                <span className={`badge bg-${perfil.perfil === 'Administrador' ? 'primary' : 'secondary'}`}>{perfil.perfil}</span>
              </div>
            </div>
            <div className="info-item">
              <div className="info-label">Estado</div>
              <div className="info-value">
                <span className={`badge bg-${Number(perfil.estado) === 1 ? 'success' : 'danger'}`}>
                  {Number(perfil.estado) === 1 ? 'Activo' : 'Inactivo'}
                </span>
              </div>
            </div>
            <div className="info-item">
              <div className="info-label">Último acceso</div>
              <div className="info-value">{perfil.ultimo_login ? formatoFecha(perfil.ultimo_login) : 'Nunca'}</div>
            </div>
          </div>

          <div className="card mb-4">
            <div className="card-header">
              <h4 className="card-title mb-0">Cambiar Foto de Perfil</h4>
            </div>
            <div className="card-body">
              <form onSubmit={subirFoto}>
                <div className="mb-3">
                  <label htmlFor="nuevaFoto" className="form-label">
                    Seleccionar nueva foto
                  </label>
                  <input type="file" className="form-control" id="nuevaFoto" accept="image/jpeg,image/png" onChange={elegirFoto} />
                  <div className="form-text">Formatos permitidos: JPG, JPEG, PNG. Tamaño máximo: 2MB</div>
                </div>
                {preview && (
                  <div className="text-center mb-3">
                    <p className="small mb-1">Vista previa:</p>
                    <img src={preview} className="preview-image-sm" alt="Vista previa" />
                  </div>
                )}
                <button type="submit" className="btn btn-primary" disabled={busy}>
                  <i className="fas fa-camera me-2" />
                  Actualizar Foto
                </button>
              </form>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <h4 className="card-title mb-0">Cambiar Contraseña</h4>
            </div>
            <div className="card-body">
              <form onSubmit={cambiarPassword}>
                <div className="mb-3">
                  <label htmlFor="nuevaPassword" className="form-label">
                    Nueva contraseña
                  </label>
                  <input
                    type="password"
                    className="form-control"
                    id="nuevaPassword"
                    placeholder="Nueva contraseña"
                    autoComplete="new-password"
                    value={nueva}
                    onChange={(e) => setNueva(e.target.value)}
                    required
                  />
                </div>
                <div className="mb-3">
                  <label htmlFor="confirmarPassword" className="form-label">
                    Confirmar contraseña
                  </label>
                  <input
                    type="password"
                    className="form-control"
                    id="confirmarPassword"
                    placeholder="Repite la contraseña"
                    autoComplete="new-password"
                    value={confirmar}
                    onChange={(e) => setConfirmar(e.target.value)}
                    required
                  />
                </div>
                <button type="submit" className="btn btn-warning" disabled={busy}>
                  <i className="fas fa-key me-2" />
                  Cambiar Contraseña
                </button>
              </form>
            </div>
          </div>

          <div className="text-center mt-4">
            <Link to={RUTA_INICIO} className="btn btn-outline-secondary">
              <i className="fas fa-arrow-left me-2" />
              Volver al Inicio
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
