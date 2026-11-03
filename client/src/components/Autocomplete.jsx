import { useEffect, useRef, useState } from 'react';
import { api } from '../api.js';

/**
 * Campo de texto con sugerencias del servidor (a partir de 2 letras).
 * - Modo texto libre: `url` devuelve ["valor", ...]; el valor es lo que se escribe.
 * - Modo selección: `mapItem(item) => { label, value }` y onSelect(item) para guardar un id aparte.
 */
export default function Autocomplete({
  url,
  value,
  onChange,
  onSelect,
  mapItem = (v) => ({ label: v, value: v }),
  placeholder,
  required,
  name,
  id,
  minChars = 2,
}) {
  const [items, setItems] = useState([]);
  const [abierto, setAbierto] = useState(false);
  const [resaltado, setResaltado] = useState(-1);
  const ref = useRef(null);
  const ultimaBusqueda = useRef(0);

  useEffect(() => {
    const fuera = (e) => ref.current && !ref.current.contains(e.target) && setAbierto(false);
    document.addEventListener('mousedown', fuera);
    return () => document.removeEventListener('mousedown', fuera);
  }, []);

  const buscar = (texto) => {
    if (texto.length < minChars) {
      setItems([]);
      setAbierto(false);
      return;
    }
    const n = ++ultimaBusqueda.current;
    const sep = url.includes('?') ? '&' : '?';
    api
      .get(`${url}${sep}search=${encodeURIComponent(texto)}`)
      .then((r) => {
        if (n !== ultimaBusqueda.current) return; // respuesta vieja
        const lista = Array.isArray(r) ? r : [];
        setItems(lista);
        setResaltado(-1);
        setAbierto(lista.length > 0);
      })
      .catch(() => {});
  };

  const elegir = (item) => {
    const m = mapItem(item);
    onChange(m.label);
    onSelect?.(item);
    setAbierto(false);
  };

  const onKeyDown = (e) => {
    if (!abierto) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setResaltado((i) => Math.min(items.length - 1, i + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setResaltado((i) => Math.max(0, i - 1));
    } else if (e.key === 'Enter' && resaltado >= 0) {
      e.preventDefault();
      elegir(items[resaltado]);
    } else if (e.key === 'Escape') {
      setAbierto(false);
    }
  };

  return (
    <div className="search-dropdown" ref={ref}>
      <input
        type="text"
        className="form-control"
        id={id}
        name={name}
        value={value ?? ''}
        placeholder={placeholder}
        required={required}
        autoComplete="off"
        onChange={(e) => {
          onChange(e.target.value);
          onSelect?.(null);
          buscar(e.target.value);
        }}
        onKeyDown={onKeyDown}
      />
      {abierto && (
        <div className="search-results">
          {items.map((it, i) => {
            const m = mapItem(it);
            return (
              <div
                key={`${m.value}-${i}`}
                className={`search-result-item ${i === resaltado ? 'active' : ''}`}
                onMouseDown={(e) => {
                  e.preventDefault();
                  elegir(it);
                }}
              >
                {m.display ?? m.label}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
