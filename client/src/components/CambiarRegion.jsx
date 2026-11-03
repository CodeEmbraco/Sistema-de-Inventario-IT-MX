import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Modal from './Modal.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { useRegiones } from '../regiones.js';
import { RUTA_INICIO } from '../modulos.js';

/**
 * Cambiar de región (planta). Cada planta tiene sus propios usuarios, así que se pide
 * la contraseña de la cuenta en la planta destino. Si falla, la sesión actual sigue igual.
 */
export default function CambiarRegion({ show, onClose }) {
  const { user, login } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const regiones = useRegiones();

  const otra = regiones.find((r) => r.id !== user?.region?.id);
  const [region, setRegion] = useState(otra?.id);
  const [usuario, setUsuario] = useState(user?.usuario || '');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!show) return;
    setRegion(regiones.find((r) => r.id !== user?.region?.id)?.id);
    setUsuario(user?.usuario || '');
    setPassword('');
    setError('');
  }, [show, regiones, user]);

  const enviar = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const u = await login(usuario.trim(), password, region);
      toast.exito(`Ahora estás en ${u.region?.nombre}`);
      onClose();
      // Usuarios solo existe para administradores: si el nuevo perfil no lo es, ir al inicio
      if (location.pathname.startsWith('/usuarios') && u.perfil !== 'Administrador') navigate(RUTA_INICIO);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal show={show} onClose={onClose} title="Cambiar de región">
      <form onSubmit={enviar}>
        <p className="text-muted small">
          Estás en <strong>{user?.region?.nombre}</strong>. Cada planta tiene sus propios usuarios y su propia
          información: ingresa con tu cuenta de la planta a la que quieres cambiar.
        </p>
        <div className="form-group">
          <label htmlFor="region-destino">Planta</label>
          <div className="region-opciones" id="region-destino">
            {regiones.map((r) => (
              <label key={r.id} className={`region-opcion ${region === r.id ? 'activa' : ''} ${r.id === user?.region?.id ? 'actual' : ''}`}>
                <input
                  type="radio"
                  name="region"
                  value={r.id}
                  checked={region === r.id}
                  disabled={r.id === user?.region?.id}
                  onChange={() => setRegion(r.id)}
                />
                <i className="fas fa-industry" />
                <span>
                  {r.nombre}
                  {r.id === user?.region?.id && <small className="d-block text-muted">Planta actual</small>}
                </span>
              </label>
            ))}
          </div>
        </div>
        <div className="form-group">
          <label htmlFor="region-usuario">Usuario</label>
          <input
            id="region-usuario"
            className="form-control"
            value={usuario}
            onChange={(e) => setUsuario(e.target.value)}
            autoComplete="username"
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="region-password">Contraseña</label>
          <input
            id="region-password"
            type="password"
            className="form-control"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
            autoFocus
          />
        </div>
        {error && <div className="alert alert-danger py-2 mb-0">{error}</div>}
        <div className="modal-footer px-0 pb-0">
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Cancelar
          </button>
          <button type="submit" className="btn btn-primary" disabled={busy || !region}>
            {busy && <span className="spinner-border spinner-border-sm me-2" />}
            Cambiar
          </button>
        </div>
      </form>
    </Modal>
  );
}
