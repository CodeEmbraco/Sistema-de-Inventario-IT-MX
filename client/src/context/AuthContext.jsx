import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api } from '../api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    api
      .get('/api/auth/me')
      .then((r) => setUser(r.user))
      .catch(() => setUser(null))
      .finally(() => setCargando(false));
  }, []);

  // Si cualquier petición devuelve 401, volvemos al login
  useEffect(() => {
    const salir = () => setUser(null);
    window.addEventListener('sesion-expirada', salir);
    return () => window.removeEventListener('sesion-expirada', salir);
  }, []);

  /** Inicia sesión en una planta (region_id). También se usa para cambiar de región. */
  const login = useCallback(async (usuario, password, regionId) => {
    const r = await api.post('/api/auth/login', { usuario, password, region_id: regionId });
    try {
      localStorage.setItem('inventario.region', String(regionId));
    } catch {
      /* sin almacenamiento */
    }
    setUser(r.user);
    return r.user;
  }, []);

  const logout = useCallback(async () => {
    await api.post('/api/auth/logout').catch(() => {});
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, setUser, cargando, login, logout, esAdmin: user?.perfil === 'Administrador' }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
