import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { api, formatBytes, formatoFecha, uploadConProgreso, urlArchivoAuditoria } from '../api.js';
import Modal, { ConfirmModal } from '../components/Modal.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { SoloLectura } from '../components/ui.jsx';

const BASE = '/api/archivos';
const MAX_MB = 500;

const EXT_IMAGEN = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg'];
const EXT_VIDEO = ['mp4', 'webm', 'mov', 'avi', 'wmv', 'mkv'];
const EXT_AUDIO = ['mp3', 'wav', 'ogg', 'm4a', 'aac', 'flac'];

const COLOR_LOG = {
  CREAR: 'success',
  EDITAR: 'info',
  ELIMINAR: 'danger',
  RESTAURAR: 'warning',
  MOVER: 'primary',
  COPIAR: 'secondary',
  RENOMBRAR: 'dark',
  CORTAR: 'warning',
  PEGAR: 'primary',
};

function Icono({ item, lista = false }) {
  let clase = 'fa-file';
  let color = '#757575';
  if (item.tipo === 'CARPETA') {
    clase = 'fa-folder';
    color = '#FFD700';
  } else {
    const ext = (item.extension || '').toLowerCase();
    if (EXT_IMAGEN.includes(ext)) [clase, color] = ['fa-file-image', '#2196F3'];
    else if (ext === 'pdf') [clase, color] = ['fa-file-pdf', '#f44336'];
    else if (['doc', 'docx', 'odt', 'rtf'].includes(ext)) [clase, color] = ['fa-file-word', '#2b5797'];
    else if (['xls', 'xlsx', 'ods', 'csv'].includes(ext)) [clase, color] = ['fa-file-excel', '#217346'];
    else if (['ppt', 'pptx', 'odp'].includes(ext)) [clase, color] = ['fa-file-powerpoint', '#d24726'];
    else if (['zip', 'rar', '7z', 'tar', 'gz', 'bz2'].includes(ext)) [clase, color] = ['fa-file-archive', '#795548'];
    else if (EXT_AUDIO.includes(ext)) [clase, color] = ['fa-file-audio', '#9C27B0'];
    else if (EXT_VIDEO.includes(ext) || ['flv'].includes(ext)) [clase, color] = ['fa-file-video', '#FF9800'];
    else if (['txt', 'log', 'ini', 'cfg', 'xml', 'json'].includes(ext)) [clase, color] = ['fa-file-alt', '#607D8B'];
  }
  return <i className={`fas ${clase} ${lista ? 'me-2' : ''}`} style={{ color }} />;
}

const urlDescarga = (id) => urlArchivoAuditoria(id);
const urlInline = (id) => urlArchivoAuditoria(id, true);

export default function Archivos() {
  const toast = useToast();
  // El perfil Usuario solo puede navegar, ver, descargar y consultar propiedades
  const { esAdmin: puedeEditar } = useAuth();

  const [carpeta, setCarpeta] = useState(null);
  const [elementos, setElementos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [seleccion, setSeleccion] = useState([]);
  const [vista, setVista] = useState(() => {
    try {
      return localStorage.getItem('archivos.vista') || 'grid';
    } catch {
      return 'grid';
    }
  });
  const [portapapeles, setPortapapeles] = useState({ items: [], operacion: null });
  const [arbol, setArbol] = useState([]);
  const [ruta, setRuta] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [menu, setMenu] = useState(null); // { x, y, item }
  const [arrastrando, setArrastrando] = useState(false);

  // Modales
  const [nuevaCarpeta, setNuevaCarpeta] = useState(null); // string | null
  const [subir, setSubir] = useState(null); // { files, progreso, errores }
  const [renombrar, setRenombrar] = useState(null); // { id, nombre }
  const [propiedades, setPropiedades] = useState(null);
  const [preview, setPreview] = useState(null);
  const [confirmarEliminar, setConfirmarEliminar] = useState(false);
  const [logs, setLogs] = useState(null);
  const [descargar, setDescargar] = useState(null);
  const [busy, setBusy] = useState(false);

  const nombreRef = useRef(null);
  const carpetaRef = useRef(carpeta);
  carpetaRef.current = carpeta;

  const hayModal = !!(nuevaCarpeta !== null || subir || renombrar || propiedades || preview || confirmarEliminar || logs || descargar);

  // ------------------------------------------------------------- Carga
  const cargarCarpeta = useCallback(
    async (id) => {
      setCarpeta(id);
      setSeleccion([]);
      setBusqueda('');
      setCargando(true);
      try {
        const [lista, migas] = await Promise.all([
          api.get(`${BASE}${id ? `?carpeta=${id}` : ''}`),
          id ? api.get(`${BASE}/${id}/breadcrumb`) : Promise.resolve({ data: [] }),
        ]);
        setElementos(lista.data);
        setRuta(migas.data);
      } catch (e) {
        toast.error(e.message || 'Error al cargar la carpeta');
      } finally {
        setCargando(false);
      }
    },
    [toast]
  );

  const cargarArbol = useCallback(() => {
    api
      .get(`${BASE}/sidebar`)
      .then((r) => setArbol(r.data))
      .catch(() => {});
  }, []);

  const refrescar = useCallback(() => {
    cargarCarpeta(carpetaRef.current);
    cargarArbol();
  }, [cargarCarpeta, cargarArbol]);

  useEffect(() => {
    cargarCarpeta(null);
    cargarArbol();
  }, [cargarCarpeta, cargarArbol]);

  // Búsqueda con espera de 300 ms (como en PHP)
  useEffect(() => {
    if (busqueda.length === 0) return undefined;
    const t = setTimeout(async () => {
      if (busqueda.length < 2) return;
      try {
        const q = new URLSearchParams({ termino: busqueda });
        if (carpetaRef.current) q.set('carpeta', carpetaRef.current);
        const r = await api.get(`${BASE}/buscar?${q}`);
        setElementos(r.data);
        setSeleccion([]);
      } catch (e) {
        toast.error(e.message);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [busqueda, toast]);

  const limpiarBusqueda = (valor) => {
    setBusqueda(valor);
    if (valor.length < 2 && busqueda.length >= 2) {
      api.get(`${BASE}${carpeta ? `?carpeta=${carpeta}` : ''}`).then((r) => setElementos(r.data)).catch(() => {});
    }
  };

  // ------------------------------------------------------------- Acciones
  const abrir = useCallback(
    (item) => {
      if (item.tipo === 'CARPETA') return cargarCarpeta(item.id);
      const ext = (item.extension || '').toLowerCase();
      if (EXT_IMAGEN.includes(ext) || EXT_VIDEO.includes(ext) || EXT_AUDIO.includes(ext)) return setPreview(item);
      if (ext === 'pdf') return window.open(urlInline(item.id), '_blank', 'noopener');
      setDescargar(item);
    },
    [cargarCarpeta]
  );

  const copiarOCortar = useCallback(
    (operacion, ids = seleccion) => {
      if (!ids.length) return;
      setPortapapeles({ items: [...ids], operacion });
      toast.exito(`${ids.length} elemento(s) ${operacion === 'CORTAR' ? 'cortado(s)' : 'copiado(s)'}`);
    },
    [seleccion, toast]
  );

  const pegar = useCallback(async () => {
    if (!portapapeles.items.length) return;
    try {
      const r = await api.post(`${BASE}/pegar`, { ...portapapeles, destino: carpetaRef.current });
      if (portapapeles.operacion === 'CORTAR') setPortapapeles({ items: [], operacion: null });
      toast.exito(r.message);
      if (r.errores?.length) toast.aviso(r.errores.join(' · '));
    } catch (e) {
      toast.error(e.data?.errores?.join(' · ') || e.message);
    }
    refrescar();
  }, [portapapeles, refrescar, toast]);

  const pedirEliminar = useCallback((ids = seleccion) => {
    if (!ids.length) return;
    setSeleccion(ids);
    setConfirmarEliminar(true);
  }, [seleccion]);

  const eliminar = async () => {
    setBusy(true);
    try {
      const r = await api.post(`${BASE}/eliminar`, { ids: seleccion });
      toast.exito(r.message);
      setConfirmarEliminar(false);
      setPortapapeles((p) => {
        const items = p.items.filter((id) => !seleccion.includes(id));
        return { items, operacion: items.length ? p.operacion : null };
      });
      refrescar();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  const pedirRenombrar = useCallback(
    (id = seleccion[0]) => {
      const item = elementos.find((x) => x.id === id);
      if (item) setRenombrar({ id: item.id, nombre: item.nombre });
    },
    [elementos, seleccion]
  );

  const guardarRenombrar = async (e) => {
    e.preventDefault();
    if (!renombrar.nombre.trim()) return toast.error('El nombre no puede estar vacío');
    setBusy(true);
    try {
      await api.patch(`${BASE}/${renombrar.id}`, { nombre: renombrar.nombre.trim() });
      toast.exito('Elemento renombrado correctamente');
      setRenombrar(null);
      refrescar();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  const crearCarpeta = async (e) => {
    e.preventDefault();
    if (!nuevaCarpeta.trim()) return toast.error('El nombre no puede estar vacío');
    setBusy(true);
    try {
      await api.post(`${BASE}/carpetas`, { nombre: nuevaCarpeta.trim(), carpeta_padre_id: carpeta });
      toast.exito('Carpeta creada correctamente');
      setNuevaCarpeta(null);
      refrescar();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  const subirArchivos = async (files) => {
    const lista = Array.from(files || []);
    if (!lista.length) return toast.error('Selecciona al menos un archivo');
    const grandes = lista.filter((f) => f.size > MAX_MB * 1024 * 1024).map((f) => `${f.name}: Excede el límite de ${MAX_MB}MB`);
    if (grandes.length) {
      setSubir({ files: lista, progreso: null, errores: grandes });
      return;
    }
    const fd = new FormData();
    lista.forEach((f) => fd.append('archivos', f));
    if (carpeta) fd.append('carpeta_padre_id', carpeta);
    setSubir({ files: lista, progreso: 0, errores: [] });
    try {
      const r = await uploadConProgreso(`${BASE}/subir`, fd, (p) => setSubir((s) => s && { ...s, progreso: p }));
      toast.exito(r.message);
      if (r.errores?.length) toast.aviso(r.errores.join(' · '));
      setSubir(null);
      refrescar();
    } catch (err) {
      setSubir((s) => ({ ...(s || { files: lista }), progreso: null, errores: err.data?.errores || [err.message] }));
    }
  };

  const verPropiedades = useCallback(
    async (id = seleccion[0]) => {
      try {
        setPropiedades((await api.get(`${BASE}/${id}`)).data);
      } catch (e) {
        toast.error(e.message || 'Error al obtener propiedades');
      }
    },
    [seleccion, toast]
  );

  const verLogs = async (id) => {
    try {
      setLogs((await api.get(`${BASE}/${id}/logs`)).data);
    } catch (e) {
      toast.error(e.message);
    }
  };

  // ------------------------------------------------------------- Selección
  const clickItem = (e, item) => {
    const id = item.id;
    if (e.ctrlKey || e.metaKey) {
      setSeleccion((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
    } else if (e.shiftKey && seleccion.length) {
      const ids = elementos.map((x) => x.id);
      const a = ids.indexOf(seleccion[seleccion.length - 1]);
      const b = ids.indexOf(id);
      if (a !== -1 && b !== -1) {
        const rango = ids.slice(Math.min(a, b), Math.max(a, b) + 1);
        setSeleccion((s) => [...s, ...rango.filter((x) => !s.includes(x))]);
      }
    } else {
      setSeleccion([id]);
    }
  };

  const toggleCheck = (id, checked) =>
    setSeleccion((s) => (checked ? (s.includes(id) ? s : [...s, id]) : s.filter((x) => x !== id)));

  const todosSeleccionados = elementos.length > 0 && seleccion.length === elementos.length;

  // ------------------------------------------------------------- Teclado
  useEffect(() => {
    const onKey = (e) => {
      if (hayModal) return;
      const tag = (e.target.tagName || '').toLowerCase();
      if (['input', 'textarea', 'select'].includes(tag) || e.target.isContentEditable) return;
      const ctrl = e.ctrlKey || e.metaKey;
      const k = e.key.toLowerCase();

      const escritura = (ctrl && ['n', 'c', 'x', 'v'].includes(k)) || e.key === 'Delete' || e.key === 'F2';
      if (escritura && !puedeEditar) return;

      if (ctrl && e.shiftKey && k === 'n') {
        e.preventDefault();
        setNuevaCarpeta('');
      } else if (ctrl && k === 'a') {
        e.preventDefault();
        setSeleccion(elementos.map((x) => x.id));
      } else if (ctrl && k === 'c') {
        e.preventDefault();
        copiarOCortar('COPIAR');
      } else if (ctrl && k === 'x') {
        e.preventDefault();
        copiarOCortar('CORTAR');
      } else if (ctrl && k === 'v') {
        e.preventDefault();
        pegar();
      } else if (e.key === 'Delete') {
        e.preventDefault();
        pedirEliminar();
      } else if (e.key === 'F2') {
        e.preventDefault();
        if (seleccion.length === 1) pedirRenombrar();
      } else if (e.key === 'F5') {
        e.preventDefault();
        refrescar();
      } else if (e.key === 'Enter' && seleccion.length === 1) {
        const item = elementos.find((x) => x.id === seleccion[0]);
        if (item) abrir(item);
      } else if (e.key === 'Backspace' && ruta.length) {
        e.preventDefault();
        cargarCarpeta(ruta.length > 1 ? ruta[ruta.length - 2].id : null);
      } else if (e.key === 'Escape') {
        setSeleccion([]);
        setMenu(null);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [hayModal, elementos, seleccion, ruta, copiarOCortar, pegar, pedirEliminar, pedirRenombrar, refrescar, abrir, cargarCarpeta, puedeEditar]);

  // Cerrar menú contextual
  useEffect(() => {
    if (!menu) return undefined;
    const cerrar = () => setMenu(null);
    document.addEventListener('click', cerrar);
    window.addEventListener('scroll', cerrar, true);
    return () => {
      document.removeEventListener('click', cerrar);
      window.removeEventListener('scroll', cerrar, true);
    };
  }, [menu]);

  useEffect(() => {
    if (nuevaCarpeta !== null || renombrar) setTimeout(() => nombreRef.current?.select(), 50);
  }, [nuevaCarpeta === null, renombrar?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const cambiarVista = (v) => {
    setVista(v);
    try {
      localStorage.setItem('archivos.vista', v);
    } catch {
      /* sin almacenamiento */
    }
  };

  const abrirMenu = (e, item) => {
    e.preventDefault();
    e.stopPropagation();
    if (!seleccion.includes(item.id)) setSeleccion([item.id]);
    const x = Math.min(e.clientX, window.innerWidth - 220);
    const y = Math.min(e.clientY, window.innerHeight - 300);
    setMenu({ x, y, item });
  };

  const accionMenu = (accion) => {
    const { item } = menu;
    setMenu(null);
    const ids = seleccion.includes(item.id) ? seleccion : [item.id];
    switch (accion) {
      case 'abrir':
        return abrir(item);
      case 'cortar':
        return copiarOCortar('CORTAR', ids);
      case 'copiar':
        return copiarOCortar('COPIAR', ids);
      case 'pegar':
        return pegar();
      case 'eliminar':
        return pedirEliminar(ids);
      case 'renombrar':
        return pedirRenombrar(item.id);
      case 'descargar':
        window.location.href = urlDescarga(item.id);
        return undefined;
      case 'propiedades':
        return verPropiedades(item.id);
      default:
        return undefined;
    }
  };

  const enPortapapeles = useMemo(
    () => new Set(portapapeles.operacion === 'CORTAR' ? portapapeles.items : []),
    [portapapeles]
  );

  // ------------------------------------------------------------- Render
  const uno = seleccion.length === 1;
  const alguno = seleccion.length > 0;

  return (
    <div className="container">
      <div className="page-inner">
        <div className="card">
          <div className="card-header">
            <div className="d-flex align-items-center flex-wrap gap-2">
              <h4 className="card-title mb-0">Administrar Archivos</h4>
              {!puedeEditar && (
                <div className="ms-auto">
                  <SoloLectura />
                </div>
              )}
            </div>
          </div>
          <div className="card-body p-0">
            <div className="file-explorer">
              {/* Barra de herramientas */}
              <div className="explorer-toolbar">
                {puedeEditar && (
                <>
                <div className="toolbar-group">
                  <button type="button" className="toolbar-btn" title="Nueva carpeta (Ctrl+Shift+N)" onClick={() => setNuevaCarpeta('')}>
                    <i className="fas fa-folder" /> Nueva carpeta
                  </button>
                  <button type="button" className="toolbar-btn" title="Subir archivo" onClick={() => setSubir({ files: [], progreso: null, errores: [] })}>
                    <i className="fas fa-upload" /> Subir
                  </button>
                </div>
                <div className="toolbar-group">
                  <button type="button" className="toolbar-btn" disabled={!alguno} title="Cortar (Ctrl+X)" onClick={() => copiarOCortar('CORTAR')}>
                    <i className="fas fa-cut" /> Cortar
                  </button>
                  <button type="button" className="toolbar-btn" disabled={!alguno} title="Copiar (Ctrl+C)" onClick={() => copiarOCortar('COPIAR')}>
                    <i className="fas fa-copy" /> Copiar
                  </button>
                  <button
                    type="button"
                    className="toolbar-btn"
                    disabled={!portapapeles.items.length}
                    title="Pegar (Ctrl+V)"
                    onClick={pegar}
                  >
                    <i className="fas fa-paste" /> Pegar
                    {portapapeles.items.length > 0 && <span className="badge bg-primary ms-1">{portapapeles.items.length}</span>}
                  </button>
                </div>
                <div className="toolbar-group">
                  <button type="button" className="toolbar-btn" disabled={!alguno} title="Eliminar (Supr)" onClick={() => pedirEliminar()}>
                    <i className="fas fa-trash" /> Eliminar
                  </button>
                  <button type="button" className="toolbar-btn" disabled={!uno} title="Renombrar (F2)" onClick={() => pedirRenombrar()}>
                    <i className="fas fa-edit" /> Renombrar
                  </button>
                </div>
                </>
                )}
                <div className="toolbar-group">
                  <button type="button" className="toolbar-btn" disabled={!uno} title="Propiedades" onClick={() => verPropiedades()}>
                    <i className="fas fa-info-circle" /> Propiedades
                  </button>
                </div>
                <div className="toolbar-group">
                  <button
                    type="button"
                    className={`toolbar-btn ${vista === 'grid' ? 'active' : ''}`}
                    title="Vista iconos"
                    onClick={() => cambiarVista('grid')}
                  >
                    <i className="fas fa-th-large" />
                  </button>
                  <button
                    type="button"
                    className={`toolbar-btn ${vista === 'list' ? 'active' : ''}`}
                    title="Vista lista"
                    onClick={() => cambiarVista('list')}
                  >
                    <i className="fas fa-list" />
                  </button>
                  <button type="button" className="toolbar-btn" title="Refrescar (F5)" onClick={refrescar}>
                    <i className="fas fa-sync-alt" />
                  </button>
                </div>
              </div>

              {/* Ruta */}
              <div className="explorer-breadcrumb">
                <button type="button" className="exp-crumb" onClick={() => cargarCarpeta(null)}>
                  <i className="fas fa-home" /> Inicio
                </button>
                {ruta.map((r) => (
                  <span key={r.id} className="d-inline-flex align-items-center">
                    <span className="exp-crumb-sep">›</span>
                    <button type="button" className="exp-crumb" onClick={() => cargarCarpeta(r.id)}>
                      <i className="fas fa-folder" /> {r.nombre}
                    </button>
                  </span>
                ))}
              </div>

              <div className="explorer-container">
                {/* Árbol lateral */}
                <div className="explorer-sidebar">
                  <div className="explorer-sidebar-header">Carpetas</div>
                  <div className={`explorer-tree-item ${carpeta === null ? 'active' : ''}`} onClick={() => cargarCarpeta(null)}>
                    <i className="fas fa-home" /> <span>Inicio</span>
                  </div>
                  {arbol.map((c) => (
                    <div key={c.id}>
                      <div className={`explorer-tree-item ${carpeta === c.id ? 'active' : ''}`} onClick={() => cargarCarpeta(c.id)}>
                        <i className="fas fa-folder" /> <span>{c.nombre}</span>
                      </div>
                      {c.hijos?.length > 0 && (
                        <div className="explorer-tree-children">
                          {c.hijos.map((h) => (
                            <div
                              key={h.id}
                              className={`explorer-tree-item ${carpeta === h.id ? 'active' : ''}`}
                              onClick={() => cargarCarpeta(h.id)}
                            >
                              <i className="fas fa-folder" /> <span>{h.nombre}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Contenido */}
                <div className="explorer-content">
                  <div className="explorer-search">
                    <input
                      type="search"
                      className="explorer-search-input"
                      placeholder="Buscar en esta carpeta..."
                      value={busqueda}
                      onChange={(e) => limpiarBusqueda(e.target.value)}
                    />
                  </div>

                  <div
                    className={`files-view ${arrastrando ? 'drop-activo' : ''}`}
                    onClick={(e) => e.target === e.currentTarget && setSeleccion([])}
                    onDragOver={(e) => {
                      if (puedeEditar && e.dataTransfer.types.includes('Files')) {
                        e.preventDefault();
                        setArrastrando(true);
                      }
                    }}
                    onDragLeave={(e) => e.currentTarget.contains(e.relatedTarget) || setArrastrando(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setArrastrando(false);
                      if (puedeEditar && e.dataTransfer.files.length) subirArchivos(e.dataTransfer.files);
                    }}
                  >
                    {cargando ? (
                      <div className="text-center text-muted p-5">
                        <span className="spinner-border spinner-border-sm me-2" /> Cargando...
                      </div>
                    ) : elementos.length === 0 ? (
                      <div className="text-center text-muted p-5">
                        <i className="fas fa-folder-open fa-3x mb-3 d-block opacity-50" />
                        {busqueda.length >= 2
                          ? 'No se encontraron resultados'
                          : puedeEditar
                            ? 'Esta carpeta está vacía. Arrastra archivos aquí para subirlos.'
                            : 'Esta carpeta está vacía.'}
                      </div>
                    ) : vista === 'grid' ? (
                      <div className="files-grid">
                        {elementos.map((item) => (
                          <div
                            key={item.id}
                            className={`file-item ${seleccion.includes(item.id) ? 'selected' : ''} ${enPortapapeles.has(item.id) ? 'cortado' : ''}`}
                            onClick={(e) => clickItem(e, item)}
                            onDoubleClick={() => abrir(item)}
                            onContextMenu={(e) => abrirMenu(e, item)}
                            title={item.nombre}
                          >
                            <div className="file-icon">
                              <Icono item={item} />
                            </div>
                            <div className="file-name">{item.nombre}</div>
                            <div className="file-details">{item.tipo === 'ARCHIVO' ? formatBytes(item['tamaño']) : ''}</div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <table className="files-list">
                        <thead>
                          <tr>
                            <th className="list-checkbox">
                              <input
                                type="checkbox"
                                aria-label="Seleccionar todo"
                                checked={todosSeleccionados}
                                onChange={(e) => setSeleccion(e.target.checked ? elementos.map((x) => x.id) : [])}
                              />
                            </th>
                            <th>Nombre</th>
                            <th>Tamaño</th>
                            <th>Tipo</th>
                            <th>Fecha modificación</th>
                          </tr>
                        </thead>
                        <tbody>
                          {elementos.map((item) => (
                            <tr
                              key={item.id}
                              className={`${seleccion.includes(item.id) ? 'selected' : ''} ${enPortapapeles.has(item.id) ? 'cortado' : ''}`}
                              onClick={(e) => e.target.type !== 'checkbox' && clickItem(e, item)}
                              onDoubleClick={() => abrir(item)}
                              onContextMenu={(e) => abrirMenu(e, item)}
                            >
                              <td className="list-checkbox">
                                <input
                                  type="checkbox"
                                  aria-label={`Seleccionar ${item.nombre}`}
                                  checked={seleccion.includes(item.id)}
                                  onChange={(e) => toggleCheck(item.id, e.target.checked)}
                                />
                              </td>
                              <td>
                                <Icono item={item} lista />
                                {item.nombre}
                              </td>
                              <td>{item.tipo === 'ARCHIVO' ? formatBytes(item['tamaño']) : '--'}</td>
                              <td>{item.tipo === 'CARPETA' ? 'Carpeta' : item.extension?.toUpperCase() || 'Archivo'}</td>
                              <td>{formatoFecha(item.updated_at)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>

                  <div className="status-bar">
                    <span>{elementos.length} elementos</span>
                    <span>
                      {portapapeles.items.length > 0 &&
                        `${portapapeles.items.length} en portapapeles (${portapapeles.operacion === 'CORTAR' ? 'cortar' : 'copiar'}) · `}
                      {seleccion.length} seleccionados
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Menú contextual */}
      {menu && (
        <div className="context-menu" style={{ top: menu.y, left: menu.x }} onClick={(e) => e.stopPropagation()}>
          <div className="context-menu-item" onClick={() => accionMenu('abrir')}>
            <i className="fas fa-external-link-alt" /> Abrir
          </div>
          {menu.item.tipo === 'ARCHIVO' && (
            <div className="context-menu-item" onClick={() => accionMenu('descargar')}>
              <i className="fas fa-download" /> Descargar
            </div>
          )}
          {puedeEditar && (
          <>
          <div className="context-menu-divider" />
          <div className="context-menu-item" onClick={() => accionMenu('cortar')}>
            <i className="fas fa-cut" /> Cortar
          </div>
          <div className="context-menu-item" onClick={() => accionMenu('copiar')}>
            <i className="fas fa-copy" /> Copiar
          </div>
          <div className={`context-menu-item ${portapapeles.items.length ? '' : 'disabled'}`} onClick={() => accionMenu('pegar')}>
            <i className="fas fa-paste" /> Pegar
          </div>
          <div className="context-menu-divider" />
          <div className="context-menu-item" onClick={() => accionMenu('eliminar')}>
            <i className="fas fa-trash" /> Eliminar
          </div>
          <div className="context-menu-item" onClick={() => accionMenu('renombrar')}>
            <i className="fas fa-edit" /> Renombrar
          </div>
          </>
          )}
          <div className="context-menu-divider" />
          <div className="context-menu-item" onClick={() => accionMenu('propiedades')}>
            <i className="fas fa-info-circle" /> Propiedades
          </div>
        </div>
      )}

      {/* Nueva carpeta */}
      <Modal show={nuevaCarpeta !== null} onClose={() => setNuevaCarpeta(null)} title="Nueva carpeta">
        <form onSubmit={crearCarpeta}>
          <div className="form-group">
            <label htmlFor="nombreCarpeta">Nombre de la carpeta</label>
            <input
              id="nombreCarpeta"
              ref={nombreRef}
              className="form-control"
              value={nuevaCarpeta ?? ''}
              onChange={(e) => setNuevaCarpeta(e.target.value)}
              autoComplete="off"
              required
            />
          </div>
          <div className="modal-footer px-0 pb-0">
            <button type="button" className="btn btn-secondary" onClick={() => setNuevaCarpeta(null)}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary" disabled={busy}>
              Crear
            </button>
          </div>
        </form>
      </Modal>

      {/* Subir */}
      <Modal show={!!subir} onClose={() => subir?.progreso === null && setSubir(null)} title="Subir archivos">
        {subir && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              subirArchivos(e.target.archivos.files);
            }}
          >
            <div className="form-group">
              <label htmlFor="archivosSubir">Seleccionar archivos</label>
              <input id="archivosSubir" name="archivos" type="file" className="form-control" multiple required disabled={subir.progreso !== null} />
              <small className="form-text text-muted">
                Tamaño máximo por archivo: {MAX_MB}MB. También puedes arrastrar archivos sobre la carpeta.
              </small>
            </div>
            {subir.progreso !== null && (
              <div className="progress mt-3" style={{ height: 20 }}>
                <div className="progress-bar progress-bar-striped progress-bar-animated" style={{ width: `${subir.progreso}%` }}>
                  {subir.progreso}%
                </div>
              </div>
            )}
            {subir.errores?.length > 0 && (
              <div className="alert alert-danger mt-3 mb-0">
                {subir.errores.map((er, i) => (
                  <div key={i}>{er}</div>
                ))}
              </div>
            )}
            <div className="modal-footer px-0 pb-0">
              <button type="button" className="btn btn-secondary" disabled={subir.progreso !== null} onClick={() => setSubir(null)}>
                Cancelar
              </button>
              <button type="submit" className="btn btn-primary" disabled={subir.progreso !== null}>
                Subir
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* Renombrar */}
      <Modal show={!!renombrar} onClose={() => setRenombrar(null)} title="Renombrar">
        {renombrar && (
          <form onSubmit={guardarRenombrar}>
            <div className="form-group">
              <label htmlFor="nuevoNombre">Nuevo nombre</label>
              <input
                id="nuevoNombre"
                ref={nombreRef}
                className="form-control"
                value={renombrar.nombre}
                onChange={(e) => setRenombrar((r) => ({ ...r, nombre: e.target.value }))}
                autoComplete="off"
                required
              />
            </div>
            <div className="modal-footer px-0 pb-0">
              <button type="button" className="btn btn-secondary" onClick={() => setRenombrar(null)}>
                Cancelar
              </button>
              <button type="submit" className="btn btn-primary" disabled={busy}>
                Renombrar
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* Propiedades */}
      <Modal show={!!propiedades} onClose={() => setPropiedades(null)} title="Propiedades">
        {propiedades && (
          <>
            <div className="property-grid">
              <div className="property-label">Nombre:</div>
              <div className="text-break">{propiedades.nombre}</div>
              <div className="property-label">Tipo:</div>
              <div>{propiedades.tipo === 'CARPETA' ? 'Carpeta' : `Archivo ${propiedades.extension || ''}`}</div>
              <div className="property-label">Tamaño:</div>
              <div>{propiedades.tipo === 'ARCHIVO' ? formatBytes(propiedades['tamaño']) : '--'}</div>
              <div className="property-label">Creado:</div>
              <div>{formatoFecha(propiedades.created_at)}</div>
              <div className="property-label">Modificado:</div>
              <div>{formatoFecha(propiedades.updated_at)}</div>
              <div className="property-label">ID:</div>
              <div>{propiedades.id}</div>
              <div className="property-label">Ruta:</div>
              <div className="text-break">{propiedades.ruta_fisica || '--'}</div>
            </div>
            <div className="text-center mt-3 d-flex gap-2 justify-content-center">
              {propiedades.tipo === 'ARCHIVO' && (
                <a href={urlInline(propiedades.id)} className="btn btn-primary" target="_blank" rel="noreferrer">
                  <i className="fas fa-external-link-alt" /> Abrir
                </a>
              )}
              <button type="button" className="btn btn-info" onClick={() => verLogs(propiedades.id)}>
                <i className="fas fa-history" /> Ver logs
              </button>
            </div>
          </>
        )}
      </Modal>

      {/* Vista previa */}
      <Modal
        show={!!preview}
        onClose={() => setPreview(null)}
        size="xl"
        title={preview?.nombre}
        bodyClass="text-center"
        footer={
          <>
            <a href={preview ? urlDescarga(preview.id) : '#'} className="btn btn-primary">
              <i className="fas fa-download" /> Descargar
            </a>
            <button type="button" className="btn btn-secondary" onClick={() => setPreview(null)}>
              Cerrar
            </button>
          </>
        }
      >
        {preview &&
          (() => {
            const ext = (preview.extension || '').toLowerCase();
            if (EXT_IMAGEN.includes(ext)) return <img src={urlInline(preview.id)} className="visor-imagen" alt={preview.nombre} />;
            if (EXT_VIDEO.includes(ext))
              return (
                <video controls className="visor-imagen" src={urlInline(preview.id)}>
                  Tu navegador no soporta la reproducción de video.
                </video>
              );
            return (
              <audio controls src={urlInline(preview.id)}>
                Tu navegador no soporta la reproducción de audio.
              </audio>
            );
          })()}
      </Modal>

      {/* Confirmar descarga (archivos sin vista previa) */}
      <Modal
        show={!!descargar}
        onClose={() => setDescargar(null)}
        title="Descargar archivo"
        footer={
          <>
            <button type="button" className="btn btn-secondary" onClick={() => setDescargar(null)}>
              Cancelar
            </button>
            <a
              href={descargar ? urlDescarga(descargar.id) : '#'}
              className="btn btn-success"
              onClick={() => setTimeout(() => setDescargar(null), 100)}
            >
              <i className="fas fa-download me-1" /> Descargar
            </a>
          </>
        }
      >
        {descargar && (
          <div className="text-center">
            <div className="file-icon-lg mb-2">
              <Icono item={descargar} />
            </div>
            <p className="mb-1">¿Desea descargar este archivo?</p>
            <strong className="text-break">{descargar.nombre}</strong>
            <div className="text-muted small">{formatBytes(descargar['tamaño'])}</div>
          </div>
        )}
      </Modal>

      {/* Logs */}
      <Modal show={!!logs} onClose={() => setLogs(null)} size="lg" title="Logs de Auditoría">
        {logs && (
          <div className="table-responsive">
            <table className="table table-striped">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Usuario</th>
                  <th>Acción</th>
                  <th>Detalles</th>
                  <th>Elemento</th>
                </tr>
              </thead>
              <tbody>
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center">
                      No hay logs para este elemento
                    </td>
                  </tr>
                ) : (
                  logs.map((l) => (
                    <tr key={l.id}>
                      <td className="text-nowrap">{formatoFecha(l.created_at)}</td>
                      <td>{l.usuario_nombre}</td>
                      <td>
                        <span className={`badge bg-${COLOR_LOG[l.accion] || 'secondary'}`}>{l.accion}</span>
                      </td>
                      <td>{l.detalles || ''}</td>
                      <td>{l.archivo_nombre}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </Modal>

      <ConfirmModal show={confirmarEliminar} onClose={() => setConfirmarEliminar(false)} onConfirm={eliminar} busy={busy}>
        <p className="mb-0">
          {seleccion.length === 1
            ? '¿Está seguro que desea eliminar este elemento?'
            : `¿Está seguro que desea eliminar ${seleccion.length} elementos?`}{' '}
          Las carpetas se eliminan con todo su contenido.
        </p>
      </ConfirmModal>
    </div>
  );
}
