import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';

const ToastContext = createContext(null);

/** Notificaciones abajo a la derecha, como bootstrap-notify en la versión PHP. */
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const nextId = useRef(1);

  const cerrar = useCallback((id) => setToasts((t) => t.filter((x) => x.id !== id)), []);

  const mostrar = useCallback(
    (tipo, mensaje, ms = 3000) => {
      const id = nextId.current++;
      setToasts((t) => [...t.slice(-3), { id, tipo, mensaje }]); // máximo 4 a la vez
      setTimeout(() => cerrar(id), ms);
    },
    [cerrar]
  );

  const value = useMemo(
    () => ({
      exito: (m) => mostrar('success', m),
      error: (m) => mostrar('danger', m, 5000),
      aviso: (m) => mostrar('warning', m, 4000),
    }),
    [mostrar]
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toast-stack" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`alert alert-${t.tipo} toast-item shadow`} role="alert">
            <i className={`me-2 fas ${t.tipo === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}`} />
            <div className="flex-grow-1">
              <strong className="d-block">{t.tipo === 'success' ? 'Éxito' : t.tipo === 'warning' ? 'Aviso' : 'Error'}</strong>
              <span>{t.mensaje}</span>
            </div>
            <button type="button" className="btn-close ms-2" aria-label="Cerrar" onClick={() => cerrar(t.id)} />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
