import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { FOTO_DEFAULT, urlArchivo } from '../api.js';
import { MODULOS, RUTA_INICIO } from '../modulos.js';
import CambiarRegion from './CambiarRegion.jsx';

const MENU = [
  { to: '/usuarios', icon: 'fas fa-users', label: 'Usuarios', soloAdmin: true },
  ...Object.values(MODULOS).map((m) => ({
    to: m.ruta,
    icon: m.icono,
    label: m.menu,
    hijos: m.subtipos?.opciones.map((o) => ({ to: `${m.ruta}/${o.ruta}`, icon: o.icono, label: o.menu })),
  })),
  { to: '/archivos', icon: 'fas fa-folder-open', label: 'Archivos de auditoría' },
  { to: '/impresoras', icon: 'fas fa-print', label: 'Impresoras' },
];

function Avatar({ foto, className }) {
  return (
    <img
      src={(foto && urlArchivo(foto)) || FOTO_DEFAULT}
      alt="Foto de perfil"
      className={className}
      onError={(e) => {
        if (!e.currentTarget.src.endsWith(FOTO_DEFAULT)) e.currentTarget.src = FOTO_DEFAULT;
      }}
    />
  );
}

function LogoHeader({ onToggleNav, onToggleMin, onToggleTopbar }) {
  return (
    <div className="logo-header" data-background-color="green">
      <Link to={RUTA_INICIO} className="logo">
        <img src="/assets/img/kaiadmin/nidec.png" alt="Inventario IT" className="navbar-brand" height="40" />
        <div className="logo-text">Inventario IT</div>
      </Link>
      <div className="nav-toggle">
        <button type="button" className="btn btn-toggle toggle-sidebar" onClick={onToggleMin} aria-label="Contraer menú">
          <i className="gg-menu-right" />
        </button>
        <button type="button" className="btn btn-toggle sidenav-toggler" onClick={onToggleNav} aria-label="Abrir menú">
          <i className="gg-menu-left" />
        </button>
      </div>
      <button type="button" className="topbar-toggler more" onClick={onToggleTopbar} aria-label="Más opciones">
        <i className="gg-more-vertical-alt" />
      </button>
    </div>
  );
}

export default function Layout() {
  const { user, esAdmin, logout } = useAuth();
  const location = useLocation();
  const [minimizado, setMinimizado] = useState(false);
  const [menuUsuario, setMenuUsuario] = useState(false);
  const [cambiarRegion, setCambiarRegion] = useState(false);
  const [abiertos, setAbiertos] = useState({}); // submenús desplegados
  const dropdownRef = useRef(null);

  // KaiAdmin usa clases en <html> para el menú en móvil
  const toggleHtml = (clase) => document.documentElement.classList.toggle(clase);

  useEffect(() => {
    document.documentElement.classList.remove('nav_open', 'topbar_open');
    setMenuUsuario(false);
  }, [location.pathname]);

  useEffect(() => {
    const fuera = (e) => dropdownRef.current && !dropdownRef.current.contains(e.target) && setMenuUsuario(false);
    document.addEventListener('mousedown', fuera);
    return () => document.removeEventListener('mousedown', fuera);
  }, []);

  const toggles = {
    onToggleNav: () => toggleHtml('nav_open'),
    onToggleMin: () => setMinimizado((m) => !m),
    onToggleTopbar: () => toggleHtml('topbar_open'),
  };

  return (
    <div className={`wrapper ${minimizado ? 'sidebar_minimize' : ''}`}>
      {/* Menú lateral */}
      <div className="sidebar" data-background-color="white">
        <div className="sidebar-logo">
          <LogoHeader {...toggles} />
        </div>
        <div className="sidebar-wrapper scrollbar scrollbar-inner">
          <div className="sidebar-content">
            <ul className="nav nav-secondary">
              {MENU.filter((m) => !m.soloAdmin || esAdmin).map((m) => {
                const activo = location.pathname.startsWith(m.to);
                if (!m.hijos) {
                  return (
                    <li key={m.to} className={`nav-item ${activo ? 'active' : ''}`}>
                      <NavLink to={m.to}>
                        <i className={m.icon} />
                        <p>{m.label}</p>
                      </NavLink>
                    </li>
                  );
                }
                const abierto = activo || abiertos[m.to];
                return (
                  <li key={m.to} className={`nav-item ${activo ? 'active submenu' : ''}`}>
                    <a
                      href={m.to}
                      className={abierto ? '' : 'collapsed'}
                      aria-expanded={abierto}
                      onClick={(e) => {
                        e.preventDefault();
                        setAbiertos((a) => ({ ...a, [m.to]: !abierto }));
                      }}
                    >
                      <i className={m.icon} />
                      <p>{m.label}</p>
                      <span className="caret" />
                    </a>
                    <div className={`collapse ${abierto ? 'show' : ''}`}>
                      <ul className="nav nav-collapse">
                        {m.hijos.map((h) => (
                          <li key={h.to} className={location.pathname.startsWith(h.to) ? 'active' : ''}>
                            <NavLink to={h.to}>
                              <span className="sub-item">{h.label}</span>
                            </NavLink>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </div>

      <div className="main-panel">
        <div className="main-header">
          <div className="main-header-logo">
            <LogoHeader {...toggles} />
          </div>
          <nav className="navbar navbar-header navbar-header-transparent navbar-expand-lg border-bottom" data-background-color="green">
            <div className="container-fluid">
              <ul className="navbar-nav topbar-nav ms-md-auto align-items-center">
                <li className="nav-item me-2">
                  <button
                    type="button"
                    className="btn-region"
                    title="Cambiar de región"
                    onClick={() => setCambiarRegion(true)}
                  >
                    <i className="fas fa-globe-americas me-2" />
                    <span className="d-none d-sm-inline">{user?.region?.nombre}</span>
                    <span className="d-sm-none">{user?.region?.clave}</span>
                    <i className="fas fa-exchange-alt ms-2 opacity-75" />
                  </button>
                </li>
                <li className="nav-item topbar-user dropdown hidden-caret" ref={dropdownRef}>
                  <a
                    className="dropdown-toggle profile-pic"
                    href="#"
                    role="button"
                    aria-expanded={menuUsuario}
                    onClick={(e) => {
                      e.preventDefault();
                      setMenuUsuario((v) => !v);
                    }}
                  >
                    <div className="avatar-sm">
                      <Avatar foto={user?.foto} className="avatar-img rounded-circle" />
                    </div>
                    <span className="profile-username">
                      <span className="op-7">Hola,</span> <span className="fw-bold">{user?.nombre}</span>
                    </span>
                  </a>
                  <ul className={`dropdown-menu dropdown-user animated fadeIn ${menuUsuario ? 'show' : ''}`}>
                    <div className="dropdown-user-scroll">
                      <li>
                        <div className="user-box">
                          <div className="avatar-lg">
                            <Avatar foto={user?.foto} className="avatar-img rounded" />
                          </div>
                          <div className="u-text">
                            <h4>{user?.usuario}</h4>
                            <p className="text-muted mb-1">
                              {user?.perfil} · {user?.region?.nombre}
                            </p>
                            <Link to="/perfil" className="btn btn-xs btn-secondary btn-sm">
                              Ver perfil
                            </Link>
                          </div>
                        </div>
                      </li>
                      <li>
                        <div className="dropdown-divider" />
                        <button
                          type="button"
                          className="dropdown-item"
                          onClick={() => {
                            setMenuUsuario(false);
                            setCambiarRegion(true);
                          }}
                        >
                          <i className="fas fa-globe-americas me-2" />
                          Cambiar de región
                        </button>
                        <button type="button" className="dropdown-item" onClick={logout}>
                          <i className="fas fa-sign-out-alt me-2" />
                          Cerrar sesión
                        </button>
                      </li>
                    </div>
                  </ul>
                </li>
              </ul>
            </div>
          </nav>
        </div>

        <Outlet />
      </div>

      <CambiarRegion show={cambiarRegion} onClose={() => setCambiarRegion(false)} />
    </div>
  );
}
