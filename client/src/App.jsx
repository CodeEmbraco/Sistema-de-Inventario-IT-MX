import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './context/AuthContext.jsx';
import Layout from './components/Layout.jsx';
import Login from './pages/Login.jsx';
import Usuarios from './pages/Usuarios.jsx';
import Perfil from './pages/Perfil.jsx';
import ModuloEquipos from './pages/ModuloEquipos.jsx';
import Impresoras from './pages/Impresoras.jsx';
import Archivos from './pages/Archivos.jsx';
import NoEncontrado from './pages/NoEncontrado.jsx';
import { MODULOS, pantallas, RUTA_INICIO } from './modulos.js';

// Se calcula una sola vez (los objetos `fijo` deben conservar su identidad entre renders)
const PANTALLAS = pantallas();

function SoloAdmin({ children }) {
  const { esAdmin } = useAuth();
  return esAdmin ? children : <Navigate to={RUTA_INICIO} replace />;
}

export default function App() {
  const { user, cargando } = useAuth();

  if (cargando) {
    return (
      <div className="d-flex vh-100 align-items-center justify-content-center">
        <span className="spinner-border text-success" role="status" aria-label="Cargando" />
      </div>
    );
  }

  if (!user) {
    return (
      <Routes>
        <Route path="*" element={<Login />} />
      </Routes>
    );
  }

  return (
    <Routes>
      {/* key = planta: al cambiar de región se vuelven a cargar todas las pantallas */}
      <Route element={<Layout key={user.region?.id} />}>
        <Route index element={<Navigate to={RUTA_INICIO} replace />} />
        <Route path="/login" element={<Navigate to={RUTA_INICIO} replace />} />
        <Route
          path="/usuarios"
          element={
            <SoloAdmin>
              <Usuarios />
            </SoloAdmin>
          }
        />
        <Route path="/perfil" element={<Perfil />} />
        {PANTALLAS.map((p) => (
          <Route key={p.ruta} path={p.ruta} element={<ModuloEquipos key={p.ruta} clave={p.clave} cfg={p.cfg} fijo={p.fijo} />} />
        ))}
        {/* Módulos con submódulos: la ruta base abre el primero (ej. /computo-administrativo -> /pc) */}
        {Object.values(MODULOS)
          .filter((m) => m.subtipos)
          .map((m) => (
            <Route key={m.ruta} path={m.ruta} element={<Navigate to={`${m.ruta}/${m.subtipos.opciones[0].ruta}`} replace />} />
          ))}
        <Route path="/impresoras" element={<Impresoras />} />
        <Route path="/archivos" element={<Archivos />} />
        <Route path="*" element={<NoEncontrado />} />
      </Route>
    </Routes>
  );
}
