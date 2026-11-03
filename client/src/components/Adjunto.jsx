import { useState } from 'react';
import { Campo } from './ui.jsx';

/**
 * Sección "archivo adjunto" de los formularios de edición (responsiva, foto, imagen).
 * Muestra el archivo actual con botones Ver/Eliminar y un input para subir uno nuevo.
 */
export default function Adjunto({ titulo, actual, onVer, onEliminar, accept, maxMB, ayuda, onFile, toast }) {
  const [preview, setPreview] = useState(null);

  const elegir = (e) => {
    const f = e.target.files[0] || null;
    if (f && f.size > maxMB * 1024 * 1024) {
      toast.error(`El archivo es demasiado grande. Máximo ${maxMB}MB`);
      e.target.value = '';
      onFile(null);
      setPreview(null);
      return;
    }
    onFile(f);
    setPreview(f && f.type.startsWith('image/') ? URL.createObjectURL(f) : null);
  };

  return (
    <div className="card mt-3 mb-0">
      <div className="card-header">
        <h6 className="mb-0">{titulo} (Opcional)</h6>
      </div>
      <div className="card-body">
        {actual && (
          <div className="alert alert-info d-flex flex-wrap align-items-center gap-2">
            <span className="text-break">
              <strong>Archivo actual:</strong> {actual.ruta.split('/').pop()}
            </span>
            <span className="ms-auto d-flex gap-2">
              <button type="button" className="btn btn-sm btn-info" onClick={onVer}>
                <i className="fas fa-eye" /> Ver
              </button>
              <button type="button" className="btn btn-sm btn-danger" onClick={onEliminar}>
                <i className="fas fa-trash" /> Eliminar
              </button>
            </span>
          </div>
        )}
        <Campo label={actual ? 'Reemplazar archivo:' : 'Subir archivo:'}>
          <input type="file" className="form-control" accept={accept} onChange={elegir} />
          <small className="form-text text-muted">{ayuda}</small>
        </Campo>
        {preview && <img src={preview} alt="Vista previa" className="preview-image-sm mt-2" />}
      </div>
    </div>
  );
}
