/**
 * Cambia (o crea) la contraseña de un usuario directamente en la base de datos,
 * guardándola cifrada con bcrypt como lo hace el sistema.
 *
 * Uso (desde la carpeta server):
 *   node scripts/cambiar-password.js <usuario> <nueva-contraseña> [planta]
 *
 *   planta: MX (Nidec GA Cold Mexico, por defecto) o ATL (Nidec Atlanta)
 *
 * Ejemplo:
 *   node scripts/cambiar-password.js admaromero Nidec123 MX
 */
import bcrypt from 'bcryptjs';
import { col, execute, queryOne } from '../src/db.js';

const [usuario, password, planta = 'MX'] = process.argv.slice(2);
if (!usuario || !password) {
  console.log('Uso: node scripts/cambiar-password.js <usuario> <nueva-contraseña> [MX|ATL]');
  process.exit(1);
}

try {
  const region = await queryOne('SELECT id, nombre FROM regiones WHERE clave = ?', [planta.toUpperCase()]);
  if (!region) throw new Error(`La planta "${planta}" no existe (usa MX o ATL)`);

  const u = await queryOne('SELECT id, estado FROM usuarios WHERE usuario = ? AND region_id = ?', [usuario, region.id]);
  if (!u) throw new Error(`El usuario "${usuario}" no existe en ${region.nombre}`);

  const hash = await bcrypt.hash(password, 12);
  await execute(`UPDATE usuarios SET ${col('password')} = ?, estado = 1 WHERE id = ?`, [hash, u.id]);
  console.log(`Listo: contraseña actualizada para "${usuario}" en ${region.nombre} (usuario activado).`);
  process.exit(0);
} catch (err) {
  console.error('Error:', err.message);
  process.exit(1);
}