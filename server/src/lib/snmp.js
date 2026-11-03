import snmp from 'net-snmp';
import { config } from '../config.js';

// Printer-MIB (RFC 3805): descripción, capacidad máxima y nivel actual de cada consumible
const OID_DESC = '1.3.6.1.2.1.43.11.1.1.6.1.';
const OID_MAX = '1.3.6.1.2.1.43.11.1.1.8.1.';
const OID_ACTUAL = '1.3.6.1.2.1.43.11.1.1.9.1.';
const MAX_CARTUCHOS = 6;

function get(session, oids) {
  return new Promise((resolve) => {
    session.get(oids, (err, varbinds) => {
      if (err || !varbinds) return resolve(null);
      if (varbinds.some((vb) => snmp.isVarbindError(vb))) return resolve(null);
      resolve(varbinds.map((vb) => vb.value));
    });
  });
}

function texto(valor) {
  if (Buffer.isBuffer(valor)) return valor.toString('latin1').replace(/\0/g, '').trim();
  return String(valor ?? '').replace(/"/g, '').trim();
}

/**
 * Consulta los niveles de tóner de una impresora por SNMP v2c.
 * Equivale a la acción "consultar_toner" del PHP.
 */
export async function consultarToner(ip) {
  const session = snmp.createSession(ip, config.snmpCommunity, {
    version: snmp.Version2c,
    timeout: 1000,
    retries: 1,
  });
  session.on('error', () => {});

  try {
    const toners = [];
    for (let i = 1; i <= MAX_CARTUCHOS; i++) {
      const desc = await get(session, [OID_DESC + i]);
      if (!desc) break;

      const niveles = await get(session, [OID_MAX + i, OID_ACTUAL + i]);
      if (!niveles) continue;

      const max = Number(niveles[0]);
      const actual = Number(niveles[1]);
      // Valores negativos significan "desconocido" en Printer-MIB
      const porcentaje = max > 0 && actual >= 0 ? Math.min(100, Math.round((actual / max) * 100)) : 0;
      toners.push({ color: texto(desc[0]), porcentaje });
    }
    return toners;
  } finally {
    session.close();
  }
}
