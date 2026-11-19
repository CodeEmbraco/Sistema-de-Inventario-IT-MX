import { useEffect, useRef, useState } from 'react';

/**
 * Vista previa de PDF dibujada con pdf.js (no depende del visor de PDF del navegador,
 * que algunos equipos tienen desactivado o configurado para "descargar siempre").
 * pdf.js se carga solo la primera vez que se abre un PDF.
 */
const MAX_PAGINAS = 30;
let cargaPdfjs = null;

function pdfjs() {
  if (!cargaPdfjs) {
    cargaPdfjs = Promise.all([import('pdfjs-dist/build/pdf'), import('pdfjs-dist/build/pdf.worker.min.js?url')]).then(
      ([lib, worker]) => {
        lib.GlobalWorkerOptions.workerSrc = worker.default;
        return lib;
      }
    );
  }
  return cargaPdfjs;
}

export default function VisorPdf({ url, titulo = 'Documento' }) {
  const contenedor = useRef(null);
  const [estado, setEstado] = useState('cargando'); // cargando | listo | error
  const [paginas, setPaginas] = useState(0);

  useEffect(() => {
    let cancelado = false;
    let doc = null;
    const caja = contenedor.current;
    caja.innerHTML = '';
    setEstado('cargando');

    (async () => {
      try {
        const lib = await pdfjs();
        doc = await lib.getDocument({ url, withCredentials: true }).promise;
        if (cancelado) return;
        setPaginas(doc.numPages);
        const ancho = Math.max(320, caja.clientWidth - 2);
        const ratio = window.devicePixelRatio || 1;
        for (let n = 1; n <= Math.min(doc.numPages, MAX_PAGINAS); n++) {
          const pagina = await doc.getPage(n);
          if (cancelado) return;
          const base = pagina.getViewport({ scale: 1 });
          const escala = ancho / base.width;
          const vista = pagina.getViewport({ scale: escala * ratio });
          const canvas = document.createElement('canvas');
          canvas.width = vista.width;
          canvas.height = vista.height;
          canvas.style.width = `${vista.width / ratio}px`;
          canvas.style.height = `${vista.height / ratio}px`;
          canvas.setAttribute('role', 'img');
          canvas.setAttribute('aria-label', `${titulo}, página ${n}`);
          caja.appendChild(canvas);
          await pagina.render({ canvasContext: canvas.getContext('2d'), viewport: vista }).promise;
          if (n === 1 && !cancelado) setEstado('listo');
        }
        if (!cancelado) setEstado('listo');
      } catch {
        if (!cancelado) setEstado('error');
      }
    })();

    return () => {
      cancelado = true;
      doc?.destroy();
    };
  }, [url, titulo]);

  return (
    <div className="visor-pdf">
      {estado === 'cargando' && (
        <p className="texto-tenue my-3">
          <span className="spinner-border spinner-border-sm me-2" /> Cargando documento…
        </p>
      )}
      {estado === 'error' && (
        <p className="texto-tenue my-3">
          No se pudo mostrar la vista previa.{' '}
          <a href={url} target="_blank" rel="noreferrer">
            Ábrelo en otra pestaña
          </a>{' '}
          o descárgalo.
        </p>
      )}
      <div ref={contenedor} className="visor-pdf-paginas" />
      {paginas > MAX_PAGINAS && (
        <p className="texto-tenue mt-2 mb-0">
          Se muestran las primeras {MAX_PAGINAS} de {paginas} páginas. Descárgalo para verlo completo.
        </p>
      )}
    </div>
  );
}
