import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { FOTO_DEFAULT, urlArchivo } from '../api.js';
import { MODULOS, RUTA_INICIO } from '../modulos.js';
import Icono from './Icono.jsx';

/**
 * Menú superior (estilo portal Nidec):
 *  logo · módulos en "píldoras" · planta · modo oscuro · usuario.
 * Cómputo agrupa Administrativo PC / Laptop e Industrial.
 */
const adm = MODULOS.computo_administrativo;
const MENU = [
  { to: RUTA_INICIO, icono: 'inicio', label: 'Inicio' },
  { to: MODULOS.celulares.ruta, icono: 'celular', label: 'Celulares' },
  {
    id: 'computo',
    icono: 'laptop',
    label: 'Cómputo',
    activoSi: ['/computo-'],
    hijos: [
      ...adm.subtipos.opciones.map((o) => ({ to: `${adm.ruta}/${o.ruta}`, icono: o.icono, label: `Administrativo · ${o.menu}` })),
      { to: MODULOS.computo_industrial.ruta, icono: 'industria', label: 'Industrial' },
    ],
  },
  { to: MODULOS.monitores.ruta, icono: 'monitor', label: 'Monitores' },
  { to: MODULOS.proyectores.ruta, icono: 'proyector', label: 'Proyectores' },
  { to: '/impresoras', icono: 'impresora', label: 'Impresoras' },
  { to: '/archivos', icono: 'carpeta', label: 'Archivos' },
];

export function Avatar({ user, size = 34 }) {
  const [error, setError] = useState(false);
  const iniciales = String(user?.nombre || '?')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase();
  const foto = user?.foto && !user.foto.includes('/default/') ? urlArchivo(user.foto) : null;
  if (foto && !error) {
    return <img src={foto} alt="" className="avatar" style={{ width: size, height: size }} onError={() => setError(true)} />;
  }
  return (
    <span className="avatar avatar-iniciales" style={{ width: size, height: size }} aria-hidden="true">
      {iniciales}
    </span>
  );
}

/** Modo claro / oscuro (se recuerda en este navegador). */
export function useTema() {
  const [tema, setTema] = useState(() => {
    try {
      return localStorage.getItem('inventario.tema') || 'claro';
    } catch {
      return 'claro';
    }
  });
  useEffect(() => {
    document.documentElement.dataset.tema = tema;
    try {
      localStorage.setItem('inventario.tema', tema);
    } catch {
      /* sin almacenamiento */
    }
  }, [tema]);
  return [tema, () => setTema((t) => (t === 'oscuro' ? 'claro' : 'oscuro'))];
}

/** Cierra un menú desplegable al hacer clic fuera o presionar Escape. */
function useCerrarFuera(abierto, cerrar) {
  const ref = useRef(null);
  useEffect(() => {
    if (!abierto) return undefined;
    const clic = (e) => ref.current && !ref.current.contains(e.target) && cerrar();
    const tecla = (e) => e.key === 'Escape' && cerrar();
    document.addEventListener('mousedown', clic);
    document.addEventListener('keydown', tecla);
    return () => {
      document.removeEventListener('mousedown', clic);
      document.removeEventListener('keydown', tecla);
    };
  }, [abierto, cerrar]);
  return ref;
}

function MenuDesplegable({ item, ruta }) {
  const [abierto, setAbierto] = useState(false);
  const ref = useCerrarFuera(abierto, () => setAbierto(false));
  const activo = item.activoSi.some((p) => ruta.startsWith(p));
  useEffect(() => { setAbierto(false); }, [ruta]);
  return (
    <div className="nav-desplegable" ref={ref}>
      <button
        type="button"
        className={`nav-pildora ${activo ? 'activa' : ''}`}
        aria-expanded={abierto}
        aria-haspopup="true"
        onClick={() => setAbierto((v) => !v)}
      >
        <Icono nombre={item.icono} size={16} />
        <span>{item.label}</span>
        <Icono nombre="abajo" size={14} />
      </button>
      {abierto && (
        <div className="menu-flotante" role="menu">
          {item.hijos.map((h) => (
            <NavLink key={h.to} to={h.to} role="menuitem" className={({ isActive }) => `menu-opcion ${isActive ? 'activa' : ''}`}>
              <Icono nombre={h.icono} size={17} />
              {h.label}
            </NavLink>
          ))}
        </div>
      )}
    </div>
  );
}

function SelectorPlanta() {
  const { user, cambiarPlanta } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [abierto, setAbierto] = useState(false);
  const ref = useCerrarFuera(abierto, () => setAbierto(false));
  const plantas = user.plantas || [user.region];

  const elegir = async (p) => {
    setAbierto(false);
    if (p.id === user.region?.id) return;
    try {
      await cambiarPlanta(p.id);
      toast.exito(`Ahora estás en ${p.nombre}`);
      navigate(RUTA_INICIO);
    } catch (e) {
      toast.error(e.message);
    }
  };

  return (
    <div className="nav-desplegable" ref={ref}>
      <button
        type="button"
        className="btn-planta"
        aria-expanded={abierto}
        aria-haspopup="true"
        onClick={() => setAbierto((v) => !v)}
        title={plantas.length > 1 ? 'Cambiar de planta' : 'Planta'}
      >
        <Icono nombre="planta" size={16} />
        <span className="btn-planta-texto">{user.region?.nombre}</span>
        {plantas.length > 1 && <Icono nombre="abajo" size={14} />}
      </button>
      {abierto && (
        <div className="menu-flotante menu-derecha" role="menu">
          <div className="menu-titulo">Cambiar de planta</div>
          {plantas.map((p) => (
            <button key={p.id} type="button" role="menuitem" className={`menu-opcion ${p.id === user.region?.id ? 'activa' : ''}`} onClick={() => elegir(p)}>
              <Icono nombre={p.id === user.region?.id ? 'check' : 'planta'} size={17} />
              <span>
                {p.nombre}
                <small>{p.clave}</small>
              </span>
            </button>
          ))}
          {plantas.length < 2 && <p className="menu-nota">Tu usuario solo tiene acceso a esta planta.</p>}
        </div>
      )}
    </div>
  );
}

function MenuUsuario() {
  const { user, logout, esAdmin } = useAuth();
  const [abierto, setAbierto] = useState(false);
  const ref = useCerrarFuera(abierto, () => setAbierto(false));
  const location = useLocation();
  useEffect(() => { setAbierto(false); }, [location.pathname]);

  return (
    <div className="nav-desplegable" ref={ref}>
      <button type="button" className="btn-usuario" aria-expanded={abierto} aria-haspopup="true" onClick={() => setAbierto((v) => !v)}>
        <Avatar user={user} />
        <span className="btn-usuario-texto">
          <strong>{user.nombre}</strong>
          <small>
            {user.perfil}
            {!esAdmin && ' · solo lectura'}
          </small>
        </span>
      </button>
      {abierto && (
        <div className="menu-flotante menu-derecha" role="menu">
          <Link to="/perfil" role="menuitem" className="menu-opcion">
            <Icono nombre="usuario" size={17} /> Mi perfil
          </Link>
          {esAdmin && (
            <Link to="/usuarios" role="menuitem" className="menu-opcion">
              <Icono nombre="usuarios" size={17} /> Usuarios
            </Link>
          )}
          <button type="button" role="menuitem" className="menu-opcion" onClick={logout}>
            <Icono nombre="salir" size={17} /> Cerrar sesión
          </button>
        </div>
      )}
    </div>
  );
}

export default function Layout() {
  const { user, logout, esAdmin } = useAuth();
  const location = useLocation();
  const [tema, alternarTema] = useTema();
  const [menuMovil, setMenuMovil] = useState(false);
  useEffect(() => { setMenuMovil(false); }, [location.pathname]);
  useEffect(() => { window.scrollTo(0, 0); }, [location.pathname]);

  return (
    <div className="app">
      <header className="barra">
        <div className="barra-interior">
          <Link to={RUTA_INICIO} className="marca" aria-label="Inventario TI, inicio">
            <img src="/assets/img/marca/nidec-blanco.png" alt="Nidec" className="marca-logo" />
            <span className="marca-separador" aria-hidden="true" />
            <span className="marca-nombre">Inventario TI</span>
          </Link>

          <button type="button" className="btn-icono btn-menu-movil" aria-label="Abrir menú" aria-expanded={menuMovil} onClick={() => setMenuMovil((v) => !v)}>
            <Icono nombre={menuMovil ? 'cerrar' : 'menu'} size={20} />
          </button>

          <nav className={`nav-principal ${menuMovil ? 'abierto' : ''}`} aria-label="Módulos">
            {MENU.map((m) =>
              m.hijos ? (
                <MenuDesplegable key={m.id} item={m} ruta={location.pathname} />
              ) : (
                <NavLink key={m.to} to={m.to} className={({ isActive }) => `nav-pildora ${isActive ? 'activa' : ''}`}>
                  <Icono nombre={m.icono} size={16} />
                  <span>{m.label}</span>
                </NavLink>
              )
            )}
            {esAdmin && (
              <NavLink to="/usuarios" className={({ isActive }) => `nav-pildora solo-movil ${isActive ? 'activa' : ''}`}>
                <Icono nombre="usuarios" size={16} />
                <span>Usuarios</span>
              </NavLink>
            )}
          </nav>

          <div className="barra-acciones">
            <SelectorPlanta />
            <button
              type="button"
              className="btn-icono"
              onClick={alternarTema}
              aria-label={tema === 'oscuro' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
              title={tema === 'oscuro' ? 'Modo claro' : 'Modo oscuro'}
            >
              <Icono nombre={tema === 'oscuro' ? 'sol' : 'luna'} size={18} />
            </button>
            <MenuUsuario />
            <button type="button" className="btn-icono" onClick={logout} aria-label="Cerrar sesión" title="Cerrar sesión">
              <Icono nombre="salir" size={18} />
            </button>
          </div>
        </div>
      </header>

      <main className="contenido">
        <Outlet />
      </main>

      <footer className="pie">
        <span>Inventario TI · {user.region?.nombre}</span>
        <span>© {new Date().getFullYear()} Nidec. Uso interno.</span>
      </footer>
    </div>
  );
}

export { FOTO_DEFAULT };
