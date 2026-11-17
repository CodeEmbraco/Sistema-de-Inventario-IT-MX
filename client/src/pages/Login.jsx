import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { simuladorActivo } from '../api.js';
import { RUTA_INICIO } from '../modulos.js';
import { regionGuardada, useRegiones } from '../regiones.js';
import Icono from '../components/Icono.jsx';

/**
 * Fondo de mosaico: cuadros grises que se aclaran hacia la derecha, con algunos
 * cuadros verde Nidec que cambian lentamente (sin animación si el sistema pide menos movimiento).
 */
function Mosaico() {
  const ref = useRef(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas.getContext('2d');
    const reducir = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const TAM = 40;
    const GAP = 2;
    let celdas = [];
    let cols = 0;
    let filas = 0;
    let timer = null;

    const tono = (x) => {
      // 0 (izquierda, casi negro) → 1 (derecha, más claro)
      const t = Math.max(0, (x / cols - 0.25) / 0.75);
      return t;
    };
    const color = (c) => {
      if (c.verde) {
        const v = c.verde;
        return v > 0.6 ? '#2a9d4b' : '#1f6a37';
      }
      const base = 16 + c.t * 70 * c.r; // 16..86
      return `rgb(${base},${base + 1},${base})`;
    };
    const pintar = (c) => {
      ctx.fillStyle = color(c);
      ctx.fillRect(c.x * TAM, c.y * TAM, TAM - GAP, TAM - GAP);
    };
    const construir = () => {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      cols = Math.ceil(window.innerWidth / TAM);
      filas = Math.ceil(window.innerHeight / TAM);
      ctx.fillStyle = '#0b0c0b';
      ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);
      celdas = [];
      for (let y = 0; y < filas; y++) {
        for (let x = 0; x < cols; x++) {
          const t = tono(x);
          const c = { x, y, t, r: 0.35 + Math.random() * 0.65, verde: t > 0.35 && Math.random() < 0.035 * t ? Math.random() : 0 };
          celdas.push(c);
          if (t > 0.02) pintar(c);
        }
      }
    };
    const animar = () => {
      for (let i = 0; i < 3; i++) {
        const c = celdas[Math.floor(Math.random() * celdas.length)];
        if (!c || c.t < 0.35) continue;
        c.verde = c.verde ? 0 : Math.random() < 0.5 ? Math.random() : 0;
        c.r = 0.35 + Math.random() * 0.65;
        pintar(c);
      }
    };

    construir();
    window.addEventListener('resize', construir);
    if (!reducir) timer = setInterval(animar, 700);
    return () => {
      window.removeEventListener('resize', construir);
      clearInterval(timer);
    };
  }, []);

  return <canvas ref={ref} className="login-mosaico" aria-hidden="true" />;
}

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [usuario, setUsuario] = useState('');
  const [password, setPassword] = useState('');
  const [verPassword, setVerPassword] = useState(false);
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [verDemo, setVerDemo] = useState(false);
  const regiones = useRegiones();
  const [region, setRegion] = useState(regionGuardada);
  const listo = usuario.trim() && password;

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

  const demo = simuladorActivo();

  return (
    <div className="login">
      <Mosaico />
      <div className="login-centro">
        <img src="/assets/img/marca/nidec-verde.png" alt="Nidec" className="login-logo" />

        <form className="login-tarjeta" onSubmit={enviar} noValidate>
          <h1>Iniciar sesión</h1>
          <p className="login-sub">Inventario de TI</p>

          <label className="login-campo">
            <span>Planta</span>
            <span className="login-control">
              <Icono nombre="planta" size={17} />
              <select value={region} onChange={(e) => setRegion(Number(e.target.value))}>
                {regiones.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.nombre}
                  </option>
                ))}
              </select>
              <Icono nombre="abajo" size={16} className="login-flecha" />
            </span>
          </label>

          <label className="login-campo">
            <span>Usuario</span>
            <span className="login-control">
              <Icono nombre="usuario" size={17} />
              <input
                type="text"
                autoComplete="username"
                value={usuario}
                onChange={(e) => setUsuario(e.target.value)}
                autoFocus
              />
            </span>
          </label>

          <label className="login-campo">
            <span>Contraseña</span>
            <span className="login-control">
              <Icono nombre="candado" size={17} />
              <input
                type={verPassword ? 'text' : 'password'}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                className="login-ver"
                onClick={() => setVerPassword((v) => !v)}
                aria-label={verPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              >
                <Icono nombre={verPassword ? 'ojoNo' : 'ojo'} size={17} />
              </button>
            </span>
          </label>

          {error && (
            <p className="login-error" role="alert">
              <Icono nombre="alerta" size={16} /> {error}
            </p>
          )}

          <button type="submit" className="login-entrar" disabled={!listo || enviando}>
            {enviando && <span className="spinner-border spinner-border-sm me-2" />}
            {enviando ? 'Entrando…' : 'Entrar'}
          </button>

          {demo && (
            <>
              <button type="button" className="login-enlace" onClick={() => setVerDemo((v) => !v)}>
                {verDemo ? 'Ocultar usuarios de prueba' : 'Ver usuarios de prueba'}
              </button>
              {verDemo && (
                <div className="login-demo">
                  {demo.usuariosDemo.map((u) => (
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
                    className="login-enlace"
                    onClick={() => {
                      demo.restablecer();
                      setError('Datos de prueba restablecidos');
                    }}
                  >
                    Restablecer datos de prueba
                  </button>
                </div>
              )}
            </>
          )}
        </form>

        <footer className="login-pie">
          <p>Inventario TI · Control de equipos</p>
          <p>
            © {new Date().getFullYear()} NIDEC GLOBAL APPLIANCE MEXICO S DE RL DE CV ·
            <br />
            Todos los derechos reservados
          </p>
        </footer>
      </div>
    </div>
  );
}
