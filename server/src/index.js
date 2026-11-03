import express from 'express';
import cookieParser from 'cookie-parser';
import fs from 'node:fs';
import path from 'node:path';
import { config, SERVER_ROOT } from './config.js';
import { DIALECTO, ping } from './db.js';
import { requireAdmin, requireAuth, requireInventario, soloAdminModifica } from './auth.js';
import { manejadorErrores } from './lib/http.js';
import { STORAGE } from './lib/files.js';

import authRoutes from './routes/auth.js';
import usuariosRoutes from './routes/usuarios.js';
import perfilRoutes from './routes/perfil.js';
import impresorasRoutes from './routes/impresoras.js';
import archivosRoutes from './routes/archivos.js';
import { crearRouterEquipos } from './routes/equipos.js';
import { MODULOS } from './modulos.js';

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', 'loopback');

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// ------------------------------------------------------------------ API
app.use('/api/auth', authRoutes);
app.use('/api/perfil', requireAuth, perfilRoutes);
app.use('/api/usuarios', requireAuth, requireAdmin, usuariosRoutes);
// Inventario: el perfil Usuario solo consulta; el Administrador agrega, edita y elimina.
// Celulares, cómputo administrativo/industrial, monitores y proyectores (ver src/modulos.js)
for (const [clave, cfg] of Object.entries(MODULOS)) {
  app.use(`/api/${clave}`, requireAuth, requireInventario, soloAdminModifica, crearRouterEquipos(clave, cfg));
}
app.use('/api/impresoras', requireAuth, requireInventario, soloAdminModifica, impresorasRoutes);
app.use('/api/archivos', requireAuth, requireInventario, soloAdminModifica, archivosRoutes);

app.get('/api/salud', async (req, res) => {
  try {
    await ping();
    res.json({ status: 'success', db: 'ok', motor: DIALECTO });
  } catch (err) {
    console.error('Error de conexión a la base de datos:', err.message);
    res.status(500).json({ status: 'error', db: err.code || 'error', motor: DIALECTO });
  }
});

app.use('/api', (req, res) => res.status(404).json({ status: 'error', message: 'Ruta no encontrada' }));

// --------------------------------------------- Archivos subidos (requieren sesión)
// Mismas rutas relativas que guarda la BD: uploads/... y vistas/img/usuarios/...
const estaticoPrivado = { dotfiles: 'deny', index: false, fallthrough: false };
// Los archivos nuevos se guardan en uploads/<PLANTA>/... (ej. uploads/MX/, uploads/ATL/):
// cada usuario solo puede abrir los de su planta. Las rutas antiguas sin planta siguen funcionando.
const soloSuPlanta = (req, res, next) => {
  const carpeta = req.path.split('/')[1] || '';
  if (/^[A-Z]{2,10}$/.test(carpeta) && carpeta !== req.user.region_clave) {
    return res.status(404).json({ status: 'error', message: 'No encontrado' });
  }
  next();
};
app.use('/uploads', requireAuth, soloSuPlanta, express.static(path.join(STORAGE, 'uploads'), estaticoPrivado));
app.use('/vistas/img', requireAuth, express.static(path.join(STORAGE, 'vistas', 'img'), estaticoPrivado));

// --------------------------------------------- Frontend compilado (producción)
const CLIENT_DIST = path.resolve(SERVER_ROOT, '..', 'client', 'dist');
if (fs.existsSync(CLIENT_DIST)) {
  app.use(express.static(CLIENT_DIST, { index: false }));
  app.get('*', (req, res) => res.sendFile(path.join(CLIENT_DIST, 'index.html')));
}

app.use(manejadorErrores);

app.listen(config.port, () => {
  console.log(`Inventario TI escuchando en http://localhost:${config.port}`);
  console.log(`Base de datos: ${DIALECTO === 'mssql' ? 'SQL Server' : 'MySQL/MariaDB'} (${config.db.host}/${config.db.database})`);
  console.log(`Archivos subidos en: ${STORAGE}`);
});
