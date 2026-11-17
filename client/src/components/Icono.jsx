/**
 * Iconos de línea (2 px), como pide el Brand Toolkit de Nidec.
 * Uso: <Icono nombre="laptop" /> — toma el color del texto (currentColor).
 */
const TRAZOS = {
  inicio: 'M3 10.5 12 3l9 7.5M5.5 9v11h13V9M10 20v-6h4v6',
  celular: 'M8 2.5h8a1.5 1.5 0 0 1 1.5 1.5v16a1.5 1.5 0 0 1-1.5 1.5H8A1.5 1.5 0 0 1 6.5 20V4A1.5 1.5 0 0 1 8 2.5zM11 18.5h2',
  laptop: 'M5 5.5h14v10H5zM2.5 18.5h19',
  pc: 'M3.5 4.5h17v11h-17zM9 20h6M12 15.5V20',
  industria: 'M3 21V10l5.5 3.5V10l5.5 3.5V5h6v16zM7 17h2M12 17h2M17 17h1',
  monitor: 'M3 4.5h18v12H3zM8.5 20.5h7M12 16.5v4',
  proyector: 'M2.5 8h19v9h-19zM6 17v2.5M18 17v2.5M7 12.5h4',
  proyectorLente: 'M15.5 12.5m-2.5 0a2.5 2.5 0 1 0 5 0a2.5 2.5 0 1 0-5 0',
  impresora: 'M7 9V3.5h10V9M7 17H4V9h16v8h-3M7 13.5h10v7H7z',
  carpeta: 'M3 6.5h6.5l2 2.5H21v10.5H3z',
  usuarios: 'M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM2.5 20c.5-3.6 3.1-5.5 6.5-5.5s6 1.9 6.5 5.5M16 4.5a3.5 3.5 0 0 1 0 7M18 14.8c2 .6 3.2 2.4 3.5 5.2',
  usuario: 'M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4.5 21c.6-4 3.5-6.5 7.5-6.5s6.9 2.5 7.5 6.5',
  candado: 'M6 10.5h12v10H6zM8.5 10.5V7.5a3.5 3.5 0 0 1 7 0v3',
  ojo: 'M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
  ojoNo: 'M3 3l18 18M10.6 5.1A10 10 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-2.9 3.9M6.6 6.6C3.8 8.4 2 12 2 12s3.5 7 10 7c1.8 0 3.4-.5 4.7-1.3M9.9 9.9a3 3 0 0 0 4.2 4.2',
  editar: 'M4 20h4L19 9l-4-4L4 16zM13.5 6.5l4 4',
  eliminar: 'M4 7h16M9.5 7V4h5v3M6 7l1 13.5h10L18 7M10 11v6M14 11v6',
  descargar: 'M12 3.5v12M7 11l5 5 5-5M4.5 20.5h15',
  mas: 'M12 5v14M5 12h14',
  buscar: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM20.5 20.5 16 16',
  luna: 'M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5z',
  sol: 'M12 16.5a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9zM12 2v2M12 20v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M2 12h2M20 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4',
  salir: 'M15 4.5h4.5v15H15M10 16.5 14.5 12 10 7.5M14.5 12H3.5',
  abajo: 'M6 9.5l6 6 6-6',
  derecha: 'M9.5 6l6 6-6 6',
  izquierda: 'M14.5 6l-6 6 6 6',
  planta: 'M3 21V10l6 4V10l6 4V5h6v16zM3 21h18',
  cambiar: 'M7 7.5h13l-3.5-3.5M17 16.5H4l3.5 3.5',
  documento: 'M6 2.5h8l4.5 4.5v14.5H6zM14 2.5V7h4.5M9 12h6M9 15.5h6',
  calendario: 'M4 5.5h16v15H4zM4 10h16M8.5 3v5M15.5 3v5',
  alerta: 'M12 3.5 2.5 20h19zM12 10v4.5M12 17.5v.01',
  reloj: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3 2',
  actividad: 'M3 12h4l3-7 4 14 3-7h4',
  flecha: 'M7 17 17 7M9 7h8v8',
  check: 'M5 12.5l4.5 4.5L19 7.5',
  cerrar: 'M6 6l12 12M18 6 6 18',
  externo: 'M14 4.5h5.5V10M19.5 4.5 11 13M18 14v5.5H4.5V6H10',
  escudo: 'M12 3 4.5 6v5.5c0 4.6 3.2 8.4 7.5 9.5 4.3-1.1 7.5-4.9 7.5-9.5V6z',
  menu: 'M4 7h16M4 12h16M4 17h16',
};

export default function Icono({ nombre, size = 18, stroke = 2, className = '', title }) {
  const d = TRAZOS[nombre];
  if (!d) return null;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={stroke}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`icono ${className}`}
      aria-hidden={title ? undefined : true}
      role={title ? 'img' : undefined}
      aria-label={title}
    >
      <path d={d} />
      {nombre === 'proyector' && <path d={TRAZOS.proyectorLente} />}
    </svg>
  );
}
