import { useEffect, useState } from 'react';
import { api } from './api.js';

/** Plantas por si la lista del servidor no carga (deben coincidir con la tabla "regiones"). */
export const REGIONES_PREDETERMINADAS = [
  { id: 1, clave: 'MX', nombre: 'Nidec GA Cold Mexico' },
  { id: 2, clave: 'ATL', nombre: 'Nidec Atlanta' },
];

/** La planta principal es Nidec GA Cold Mexico; se recuerda la última elegida. */
export function regionGuardada() {
  try {
    return Number(localStorage.getItem('inventario.region')) || 1;
  } catch {
    return 1;
  }
}

export function useRegiones() {
  const [regiones, setRegiones] = useState(REGIONES_PREDETERMINADAS);
  useEffect(() => {
    api
      .get('/api/auth/regiones')
      .then((r) => r.data?.length && setRegiones(r.data))
      .catch(() => {});
  }, []);
  return regiones;
}
