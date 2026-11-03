import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { simuladorActivo } from '../api.js';
import { RUTA_INICIO } from '../modulos.js';
import { regionGuardada, useRegiones } from '../regiones.js';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [usuario, setUsuario] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [sinLogo, setSinLogo] = useState(false);
  const regiones = useRegiones();
  const [region, setRegion] = useState(regionGuardada);

  const enviar = async (e) => {
    e.preventDefault();
    setError('');
    setEnviando(true);
    try {
      await login(usuario.trim(), password, region);
      navigate(RUTA_INICIO, { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <>
      <div className="login-background" />
      <div className="login-container">
        <div className="login-form-container">
          <div className="login-logo">
            {sinLogo ? (
              <div className="login-logo-text">
                <i className="fas fa-laptop me-2" />
                Inventario IT
              </div>
            ) : (
              <img src="/assets/img/login/nidec.png" alt="Logo" onError={() => setSinLogo(true)} />
            )}
          </div>

          <form onSubmit={enviar}>
            <div className="login-input-group">
              <i className="fas fa-industry login-input-icon" />
              <select
                className="login-input login-select"
                aria-label="Planta"
                value={region}
                onChange={(e) => setRegion(Number(e.target.value))}
              >
                {regiones.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.nombre}
                  </option>
                ))}
              </select>
            </div>
            <div className="login-input-group">
              <i className="fas fa-user login-input-icon" />
              <input
                type="text"
                className="login-input"
                placeholder="Usuario"
                autoComplete="username"
                value={usuario}
                onChange={(e) => setUsuario(e.target.value)}
                required
                autoFocus
              />
            </div>
            <div className="login-input-group">
              <i className="fas fa-lock login-input-icon" />
              <input
                type="password"
                className="login-input"
                placeholder="Contraseña"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <button type="submit" className="login-btn" disabled={enviando}>
              {enviando ? 'Ingresando…' : 'Ingresar'}
            </button>
          </form>

          {error && <div className="login-error">{error}</div>}

          {simuladorActivo() && (
            <div className="login-demo">
              <div className="login-demo-titulo">
                <i className="fas fa-flask me-1" /> Modo sin servidor
              </div>
              {simuladorActivo().usuariosDemo.map((u) => (
                <button
                  key={`${u.region_id}-${u.usuario}`}
                  type="button"
                  className="login-demo-usuario"
                  onClick={() => {
                    setRegion(u.region_id);
                    setUsuario(u.usuario);
                    setPassword(u.password);
                    setError('');
                  }}
                >
                  <span>
                    <strong>{u.usuario}</strong> / {u.password}
                  </span>
                  <small>
                    {regiones.find((r) => r.id === u.region_id)?.clave} · {u.perfil}
                  </small>
                </button>
              ))}
              <button
                type="button"
                className="login-demo-reset"
                onClick={() => {
                  simuladorActivo().restablecer();
                  setError('Datos de prueba restablecidos');
                }}
              >
                Restablecer datos de prueba
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
