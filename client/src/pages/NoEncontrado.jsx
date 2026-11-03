import { Link } from 'react-router-dom';
import { RUTA_INICIO } from '../modulos.js';

export default function NoEncontrado() {
  return (
    <div className="container">
      <div className="page-inner text-center py-5">
        <h1 className="display-1 fw-bold text-danger mb-0">404</h1>
        <h2 className="h4 my-3">¡Oops! Página no encontrada</h2>
        <p className="text-muted">Lo sentimos, la página que buscas no existe.</p>
        <Link to={RUTA_INICIO} className="btn btn-primary">
          Volver a la página principal
        </Link>
      </div>
    </div>
  );
}
