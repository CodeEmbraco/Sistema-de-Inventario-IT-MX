import { useEffect, useMemo, useState } from 'react';

const TAMANOS = [10, 25, 50, 100];

function valorTexto(col, row) {
  if (col.searchValue) return String(col.searchValue(row) ?? '');
  if (col.key) return String(row[col.key] ?? '');
  return '';
}

function normalizar(s) {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

/**
 * Tabla con búsqueda, orden por columna y paginación (sustituye a DataTables).
 * columns: [{ key, header, render?(row), sortValue?(row), searchValue?(row), sortable?, className?, width? }]
 */
export default function DataTable({
  columns,
  rows,
  search = '',
  loading = false,
  defaultSort = null, // { key, dir: 'asc'|'desc' }
  rowKey = 'id',
  emptyText = 'Ningún dato disponible en esta tabla',
  tableId,
}) {
  const [sort, setSort] = useState(defaultSort);
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);

  const filtradas = useMemo(() => {
    const q = normalizar(search.trim());
    if (!q) return rows;
    return rows.filter((r) => columns.some((c) => normalizar(valorTexto(c, r)).includes(q)));
  }, [rows, columns, search]);

  const ordenadas = useMemo(() => {
    if (!sort) return filtradas;
    const col = columns.find((c) => (c.key || c.header) === sort.key);
    if (!col) return filtradas;
    const getter = col.sortValue || ((r) => r[col.key]);
    const factor = sort.dir === 'desc' ? -1 : 1;
    return [...filtradas].sort((a, b) => {
      const va = getter(a);
      const vb = getter(b);
      if (va == null && vb == null) return 0;
      if (va == null) return 1;
      if (vb == null) return -1;
      if (typeof va === 'number' && typeof vb === 'number') return (va - vb) * factor;
      return String(va).localeCompare(String(vb), 'es', { numeric: true, sensitivity: 'base' }) * factor;
    });
  }, [filtradas, sort, columns]);

  const totalPaginas = Math.max(1, Math.ceil(ordenadas.length / pageSize));
  useEffect(() => setPage(1), [search, pageSize]);
  useEffect(() => {
    if (page > totalPaginas) setPage(totalPaginas);
  }, [page, totalPaginas]);

  const inicio = (page - 1) * pageSize;
  const visibles = ordenadas.slice(inicio, inicio + pageSize);

  const ordenarPor = (col) => {
    if (col.sortable === false) return;
    const key = col.key || col.header;
    setSort((s) => (s?.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' }));
  };

  const paginas = useMemo(() => {
    const out = [];
    const desde = Math.max(1, page - 2);
    const hasta = Math.min(totalPaginas, desde + 4);
    for (let i = Math.max(1, hasta - 4); i <= hasta; i++) out.push(i);
    return out;
  }, [page, totalPaginas]);

  return (
    <div className="dt-wrapper">
      <div className="d-flex align-items-center mb-2 small text-muted">
        <label className="d-flex align-items-center gap-2 mb-0">
          Mostrar
          <select
            className="form-select form-select-sm w-auto"
            value={pageSize}
            onChange={(e) => setPageSize(Number(e.target.value))}
          >
            {TAMANOS.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
          registros
        </label>
      </div>

      <div className="table-responsive">
        <table id={tableId} className="display table table-striped table-hover dt-table">
          <thead>
            <tr>
              {columns.map((c) => {
                const key = c.key || c.header;
                const activo = sort?.key === key;
                return (
                  <th
                    key={key}
                    style={c.width ? { width: c.width } : undefined}
                    className={`${c.sortable === false ? '' : 'sortable'} ${c.className || ''}`}
                    onClick={() => ordenarPor(c)}
                  >
                    {c.header}
                    {c.sortable !== false && (
                      <i className={`fas ms-1 sort-icon ${activo ? (sort.dir === 'asc' ? 'fa-sort-up' : 'fa-sort-down') : 'fa-sort'}`} />
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={columns.length} className="text-start py-4 dt-sin-fijar">
                  <span className="dt-vacio">
                    <span className="spinner-border spinner-border-sm me-2" /> Cargando...
                  </span>
                </td>
              </tr>
            ) : visibles.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="text-start py-4 text-muted dt-sin-fijar">
                  <span className="dt-vacio">{search ? 'No se encontraron resultados' : emptyText}</span>
                </td>
              </tr>
            ) : (
              visibles.map((row) => (
                <tr key={row[rowKey]}>
                  {columns.map((c) => (
                    <td key={c.key || c.header} className={c.className}>
                      {c.render ? c.render(row) : row[c.key] ?? ''}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 small text-muted">
        <div>
          {ordenadas.length === 0
            ? 'Mostrando registros del 0 al 0 de un total de 0 registros'
            : `Mostrando registros del ${inicio + 1} al ${Math.min(inicio + pageSize, ordenadas.length)} de un total de ${ordenadas.length} registros`}
          {search && rows.length !== ordenadas.length && ` (filtrado de un total de ${rows.length} registros)`}
        </div>
        <ul className="pagination pagination-sm mb-0">
          <li className={`page-item ${page === 1 ? 'disabled' : ''}`}>
            <button type="button" className="page-link" onClick={() => setPage((p) => p - 1)}>
              Anterior
            </button>
          </li>
          {paginas.map((n) => (
            <li key={n} className={`page-item ${n === page ? 'active' : ''}`}>
              <button type="button" className="page-link" onClick={() => setPage(n)}>
                {n}
              </button>
            </li>
          ))}
          <li className={`page-item ${page === totalPaginas ? 'disabled' : ''}`}>
            <button type="button" className="page-link" onClick={() => setPage((p) => p + 1)}>
              Siguiente
            </button>
          </li>
        </ul>
      </div>
    </div>
  );
}
