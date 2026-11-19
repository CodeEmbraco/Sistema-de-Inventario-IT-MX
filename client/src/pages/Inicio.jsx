import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, formatoFecha } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { MODULOS } from '../modulos.js';
import Icono from '../components/Icono.jsx';
import { textoFecha } from '../components/ui.jsx';

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const DIAS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
const NOMBRE_MODULO = {
  celulares: 'Celular',
  computo_administrativo: 'Cómputo administrativo',
  computo_industrial: 'Cómputo industrial',
  monitores: 'Monitor',
  proyectores: 'Proyector',
};

const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

function saludo() {
  const h = new Date().getHours();
  return h < 12 ? 'Buenos días' : h < 19 ? 'Buenas tardes' : 'Buenas noches';
}

function semanaDelAnio(d) {
  const f = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dia = f.getUTCDay() || 7;
  f.setUTCDate(f.getUTCDate() + 4 - dia);
  const inicio = new Date(Date.UTC(f.getUTCFullYear(), 0, 1));
  return Math.ceil(((f - inicio) / 86400000 + 1) / 7);
}

/** Ruta del módulo de un registro (Cómputo administrativo va a PC o Laptop). */
function rutaDe(v) {
  const m = MODULOS[v.modulo];
  if (!m) return '/';
  if (m.subtipos) return `${m.ruta}/${v.tipo_equipo === 'LAPTOP' ? 'laptop' : 'pc'}`;
  return m.ruta;
}

function diasPara(valor, hoy) {
  const [a, m, d] = valor.split('-').map(Number);
  const [ha, hm, hd] = hoy.split('-').map(Number);
  return Math.round((new Date(a, m - 1, d) - new Date(ha, hm - 1, hd)) / 86400000);
}

function Calendario({ fechas, hoy }) {
  const base = new Date();
  const [mes, setMes] = useState(new Date(base.getFullYear(), base.getMonth(), 1));
  const celdas = useMemo(() => {
    const primero = (mes.getDay() + 6) % 7; // lunes = 0
    const dias = new Date(mes.getFullYear(), mes.getMonth() + 1, 0).getDate();
    return [...Array(primero).fill(null), ...Array.from({ length: dias }, (_, i) => new Date(mes.getFullYear(), mes.getMonth(), i + 1))];
  }, [mes]);
  const mover = (n) => setMes((m) => new Date(m.getFullYear(), m.getMonth() + n, 1));

  return (
    <div className="calendario">
      <div className="calendario-cabecera">
        <h2>
          {cap(MESES[mes.getMonth()])} <span>{mes.getFullYear()}</span>
        </h2>
        <div className="d-flex gap-1">
          <button type="button" className="btn-icono-claro" onClick={() => mover(-1)} aria-label="Mes anterior">
            <Icono nombre="izquierda" size={18} />
          </button>
          <button type="button" className="btn-icono-claro" onClick={() => mover(1)} aria-label="Mes siguiente">
            <Icono nombre="derecha" size={18} />
          </button>
        </div>
      </div>
      <div className="calendario-rejilla">
        {DIAS.map((d, i) => (
          <span key={i} className="calendario-dia-semana">
            {d}
          </span>
        ))}
        {celdas.map((d, i) => {
          if (!d) return <span key={i} />;
          const f = iso(d);
          const n = fechas?.[f];
          const clase = f === hoy ? 'hoy' : n ? (f < hoy ? 'vencida' : 'vigencia') : '';
          return (
            <span key={i} className={`calendario-dia ${clase}`} title={n ? `${n} vigencia(s) el ${textoFecha(f)}` : undefined}>
              {d.getDate()}
            </span>
          );
        })}
      </div>
      <div className="calendario-leyenda">
        <span>
          <i className="punto punto-hoy" /> Hoy
        </span>
        <span>
          <i className="punto punto-vigencia" /> Vence vigencia
        </span>
        <span>
          <i className="punto punto-vencida" /> Vencida
        </span>
      </div>
    </div>
  );
}

export default function Inicio() {
  const { user } = useAuth();
  const [datos, setDatos] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .get('/api/resumen')
      .then((r) => setDatos(r.data))
      .catch((e) => setError(e.message));
  }, []);

  const ahora = new Date();
  const fechaLarga = cap(ahora.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' }));
  const primerNombre = String(user.nombre || '').split(/\s+/)[0];
  const m = datos?.modulos;
  const cargando = !datos && !error;
  const val = (x) => (cargando ? '···' : x ?? 0);

  const tarjetas = [
    {
      to: `${MODULOS.computo_administrativo.ruta}/pc`,
      icono: 'laptop',
      label: 'Equipos de cómputo',
      valor: val(m && m.computo_administrativo.total + m.computo_industrial.total),
      nota: m
        ? `${m.computo_administrativo.PC?.total ?? 0} PC · ${m.computo_administrativo.LAPTOP?.total ?? 0} Laptop · ${m.computo_industrial.total} Industrial`
        : 'Administrativo e industrial',
    },
    {
      to: MODULOS.celulares.ruta,
      icono: 'celular',
      label: 'Celulares',
      valor: val(m?.celulares.total),
      nota: m ? `${m.celulares.asignados} asignados` : 'Asignados y disponibles',
    },
    {
      to: MODULOS.monitores.ruta,
      icono: 'monitor',
      label: 'Monitores y proyectores',
      valor: val(m && m.monitores.total + m.proyectores.total),
      nota: m ? `${m.monitores.total} monitores · ${m.proyectores.total} proyectores` : 'Periféricos',
    },
    {
      to: null,
      icono: 'reloj',
      label: 'Vigencias',
      valor: val(datos && datos.vencidas + datos.por_vencer),
      nota: datos ? `${datos.vencidas} vencidas · ${datos.por_vencer} vencen en 30 días` : 'Por vencer y vencidas',
      alerta: datos && datos.vencidas > 0,
    },
  ];

  return (
    <>
      <section className="hero hero-inicio">
        <div className="contenedor">
          <div className="hero-fila">
            <div className="hero-texto">
              <p className="hero-eyebrow">{fechaLarga}</p>
              <h1 className="hero-titulo hero-titulo-grande">
                {saludo()}, {primerNombre}
              </h1>
              <p className="hero-sub">Este es el resumen del inventario de TI de {user.region?.nombre}.</p>
            </div>
            <div className="fecha-tarjeta" aria-hidden="true">
              <span className="fecha-dia">
                <small>{ahora.toLocaleDateString('es-MX', { weekday: 'short' }).replace('.', '').toUpperCase()}</small>
                {ahora.getDate()}
              </span>
              <span>
                <strong>
                  {cap(MESES[ahora.getMonth()])} de {ahora.getFullYear()}
                </strong>
                <small>Semana {semanaDelAnio(ahora)} del año</small>
              </span>
            </div>
          </div>

          <div className="kpis">
            {tarjetas.map((k) => {
              const contenido = (
                <>
                  <span className="kpi-icono">
                    <Icono nombre={k.icono} size={18} />
                  </span>
                  {k.to && <Icono nombre="flecha" size={16} className="kpi-flecha" />}
                  <span className="kpi-label">{k.label}</span>
                  <strong className="kpi-valor">{k.valor}</strong>
                  <span className="kpi-nota">{k.nota}</span>
                </>
              );
              return k.to ? (
                <Link key={k.label} to={k.to} className="kpi kpi-enlace">
                  {contenido}
                </Link>
              ) : (
                <div key={k.label} className={`kpi ${k.alerta ? 'kpi-rojo' : ''}`}>
                  {contenido}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <div className="contenedor sobre-hero">
        {error && <div className="alert alert-danger">{error}</div>}
        <div className="inicio-rejilla">
          <div className="inicio-columna">
            <section className="panel">
              <div className="panel-cabecera">
                <h2 className="panel-titulo">Vigencias próximas</h2>
                <span className="texto-tenue ms-auto">Vencidas y próximos 60 días</span>
              </div>
              {cargando ? (
                <p className="texto-tenue mb-0">
                  <span className="spinner-border spinner-border-sm me-2" /> Cargando…
                </p>
              ) : !datos?.proximas.length ? (
                <div className="vacio">
                  <Icono nombre="check" size={22} />
                  <p>No hay vigencias vencidas ni por vencer en los próximos 60 días.</p>
                </div>
              ) : (
                <ul className="lista">
                  {datos.proximas.map((v) => {
                    const dias = diasPara(v.vigencia, datos.hoy);
                    return (
                      <li key={`${v.modulo}-${v.id}`} className="lista-item">
                        <span className={`lista-icono ${dias < 0 ? 'lista-icono-rojo' : ''}`}>
                          <Icono nombre={MODULOS[v.modulo]?.icono || 'documento'} size={18} />
                        </span>
                        <span className="lista-texto">
                          <strong>{v.equipo}</strong>
                          <small>
                            {NOMBRE_MODULO[v.modulo]}
                            {v.tipo_equipo ? ` · ${v.tipo_equipo === 'LAPTOP' ? 'Laptop' : 'PC'}` : ''} · Serie {v.numero_serie || '—'}
                            {v.usuario ? ` · ${v.usuario}` : ''}
                          </small>
                        </span>
                        <span className={`pildora ${dias < 0 ? 'pildora-roja' : 'pildora-ambar'}`}>
                          {dias < 0 ? `Vencida hace ${-dias} d` : dias === 0 ? 'Vence hoy' : `Vence en ${dias} d`}
                        </span>
                        <span className="lista-fecha">{textoFecha(v.vigencia)}</span>
                        <Link to={rutaDe(v)} className="btn-accion" aria-label={`Ir a ${NOMBRE_MODULO[v.modulo]}`} title="Ir al módulo">
                          <Icono nombre="derecha" size={17} />
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>

            <section className="panel">
              <div className="panel-cabecera">
                <h2 className="panel-titulo">Actividad reciente</h2>
              </div>
              {cargando ? (
                <p className="texto-tenue mb-0">Cargando…</p>
              ) : !datos?.actividad.length ? (
                <div className="vacio">
                  <Icono nombre="actividad" size={22} />
                  <p>Aún no hay movimientos en esta planta.</p>
                </div>
              ) : (
                <ul className="lista">
                  {datos.actividad.map((a) => (
                    <li key={a.id} className="lista-item">
                      <span
                        className={`lista-icono ${a.accion === 'ELIMINAR' ? 'lista-icono-rojo' : a.accion === 'EDITAR' ? 'lista-icono-gris' : ''}`}
                      >
                        <Icono nombre={a.accion === 'CREAR' ? 'mas' : a.accion === 'ELIMINAR' ? 'eliminar' : 'editar'} size={17} />
                      </span>
                      <span className="lista-texto">
                        <strong>{a.detalles || a.accion}</strong>
                        <small>
                          {NOMBRE_MODULO[a.modulo] || a.modulo} · {a.usuario}
                        </small>
                      </span>
                      <span className="lista-fecha">{formatoFecha(a.created_at)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>

          <aside className="panel panel-lateral">
            <Calendario fechas={datos?.fechas} hoy={datos?.hoy || iso(new Date())} />
            <div className="accesos">
              <h3>Accesos rápidos</h3>
              <Link to="/impresoras" className="acceso">
                <Icono nombre="impresora" size={18} />
                <span>
                  Impresoras
                  <small>{m ? `${m.impresoras.activas} activas de ${m.impresoras.total}` : 'Estado y tóner'}</small>
                </span>
                <Icono nombre="derecha" size={16} />
              </Link>
              <Link to="/archivos" className="acceso">
                <Icono nombre="carpeta" size={18} />
                <span>
                  Archivos de auditoría
                  <small>Documentos de la planta</small>
                </span>
                <Icono nombre="derecha" size={16} />
              </Link>
            </div>
          </aside>
        </div>
      </div>
    </>
  );
}
