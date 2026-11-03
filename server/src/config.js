import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const SERVER_ROOT = path.resolve(__dirname, '..');

// Siempre lee server/.env, sin importar desde qué carpeta se arranque (NSSM, pm2, etc.)
dotenv.config({ path: path.join(SERVER_ROOT, '.env'), quiet: true });

const env = process.env;

export const config = {
  port: Number(env.PORT) || 3001,
  db: {
    // "mssql" = Microsoft SQL Server (por defecto) | "mysql" = MySQL / MariaDB
    client: (env.DB_CLIENT || 'mssql').toLowerCase(),
    host: env.DB_HOST || 'localhost',
    port: Number(env.DB_PORT) || ((env.DB_CLIENT || 'mssql').toLowerCase() === 'mysql' ? 3306 : 1433),
    user: env.DB_USER || '',
    password: env.DB_PASSWORD || '',
    database: env.DB_NAME || 'sis_invit',
    // Solo SQL Server
    instance: env.DB_INSTANCE || '', // ej. SQLEXPRESS (si se usa, no hace falta DB_PORT)
    encrypt: env.DB_ENCRYPT === 'true', // true para Azure SQL
    trustServerCertificate: env.DB_TRUST_CERT !== 'false', // certificado autofirmado del servidor
  },
  jwtSecret: env.JWT_SECRET || '',
  sessionHours: Number(env.SESSION_HOURS) || 10,
  storageDir: env.STORAGE_DIR ? path.resolve(env.STORAGE_DIR) : path.join(SERVER_ROOT, 'storage'),
  snmpCommunity: env.SNMP_COMMUNITY || 'public',
  cookieSecure: env.COOKIE_SECURE === 'true',
  isProduction: env.NODE_ENV === 'production',
};

if (!config.jwtSecret || config.jwtSecret.startsWith('cambia-esto')) {
  if (config.isProduction) {
    console.error('ERROR: define JWT_SECRET en el archivo .env antes de arrancar en producción.');
    process.exit(1);
  }
  config.jwtSecret = 'solo-para-desarrollo-no-usar-en-produccion';
  console.warn('Aviso: JWT_SECRET no está definido; usando una clave de desarrollo.');
}

/** Ruta pública por defecto de la foto de usuario (igual que en la versión PHP). */
export const FOTO_DEFAULT = 'vistas/img/usuarios/default/anonymous.png';
