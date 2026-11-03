import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

// Pila de modales abiertos: permite abrir uno encima de otro (ej. ver un archivo desde "Editar")
const pila = [];

/**
 * Modal de Bootstrap controlado por React (sin jQuery).
 * size: '' | 'sm' | 'lg' | 'xl'
 */
export default function Modal({ show, onClose, title, size = '', headerClass = '', children, footer, bodyClass = '' }) {
  const token = useRef({});
  const [nivel, setNivel] = useState(0);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!show) return undefined;
    const t = token.current;
    pila.push(t);
    setNivel(pila.length - 1);
    // Escape solo cierra el modal de más arriba
    const onKey = (e) => e.key === 'Escape' && pila[pila.length - 1] === t && onCloseRef.current?.();
    document.addEventListener('keydown', onKey);
    document.body.classList.add('modal-open');
    return () => {
      document.removeEventListener('keydown', onKey);
      pila.splice(pila.indexOf(t), 1);
      if (!pila.length) document.body.classList.remove('modal-open');
    };
  }, [show]);

  if (!show) return null;

  return createPortal(
    <>
      <div
        className="modal fade show d-block"
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        style={{ zIndex: 1055 + nivel * 20 }}
        onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}
      >
        <div className={`modal-dialog modal-dialog-scrollable ${size ? `modal-${size}` : ''}`}>
          <div className="modal-content">
            <div className={`modal-header ${headerClass}`}>
              <h5 className="modal-title">{title}</h5>
              <button
                type="button"
                className={`btn-close ${headerClass.includes('text-white') ? 'btn-close-white' : ''}`}
                aria-label="Cerrar"
                onClick={onClose}
              />
            </div>
            <div className={`modal-body ${bodyClass}`}>{children}</div>
            {footer && <div className="modal-footer">{footer}</div>}
          </div>
        </div>
      </div>
      <div className="modal-backdrop fade show" style={{ zIndex: 1050 + nivel * 20 }} />
    </>,
    document.body
  );
}

export function ConfirmModal({ show, onClose, onConfirm, title = 'Confirmar eliminación', children, confirmText = 'Eliminar', busy }) {
  return (
    <Modal
      show={show}
      onClose={onClose}
      title={title}
      headerClass="bg-danger text-white"
      footer={
        <>
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Cancelar
          </button>
          <button type="button" className="btn btn-danger" onClick={onConfirm} disabled={busy}>
            {busy && <span className="spinner-border spinner-border-sm me-2" />}
            {confirmText}
          </button>
        </>
      }
    >
      {children}
    </Modal>
  );
}
