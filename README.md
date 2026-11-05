# Sistema de Inventario TI

Sistema de inventario de IT en **React + Node.js (Express)** con base de datos **Microsoft SQL Server**
(también funciona con MySQL/MariaDB). Usa la misma interfaz que la versión PHP (tema KaiAdmin + Bootstrap).

## Plantas (regiones)

El sistema maneja dos plantas con información **totalmente separada**:

| Planta | Clave |
|---|---|
| **Nidec GA Cold Mexico** (principal) | `MX` |
| Nidec Atlanta | `ATL` |

- En el login se elige la planta. Cada planta tiene **sus propios usuarios**, equipos, impresoras y archivos de auditoría.
- En la barra superior aparece la planta actual. Con el botón **Cambiar de región** (o desde el menú del usuario) se entra
  a la otra planta con la cuenta de esa planta. Si la contraseña es incorrecta, la sesión actual sigue igual.
- Los archivos subidos se guardan por planta (`uploads/MX/…`, `uploads/ATL/…`) y un usuario no puede abrir los de la otra planta.
- Para agregar otra planta: inserta una fila en la tabla `regiones` y crea su administrador en `usuarios`.

## Módulos

| Módulo | Campos |
|---|---|
| Usuarios (solo Administrador) | Nombre, usuario, contraseña, perfil, foto. Activar/desactivar |
| Mi perfil | Cambiar foto y contraseña |
| **Celulares** | Número de teléfono, usuario, departamento, marca, modelo, número de serie, IMEI, responsiva (archivo), fecha de asignación, número de ticket (opcional) |
| **Equipo de cómputo administrativo** · submódulos **PC** y **Laptop** | Hostname, usuario, departamento, sistema operativo, procesador, HD, RAM, vigencia, adaptador cargador, número de ticket (los mismos campos en PC y Laptop) |
| **Equipo de cómputo industrial** | Los mismos campos que el administrativo (con hostname y usuario) |
| **Monitores** | Hostname, usuario, fecha de asignación, departamento, ubicación, marca, modelo, número de serie, vigencia, número de ticket |
| **Proyectores** | Los mismos campos que monitores |
| Impresoras | Sin cambios: foto, IP y nivel de tóner por SNMP |
| Archivos de auditoría | Sin cambios: explorador con carpetas, subir, copiar/cortar/pegar, renombrar, bitácora |

**Estado de los equipos: Asignado / Sin asignar** (en lugar de activo/inactivo). Se puede filtrar por estado en cada módulo.

Reglas de captura:

- **Celulares**: marca, modelo, número de serie e IMEI siempre son obligatorios. Si está *Asignado*, también usuario, departamento y fecha de asignación.
- **Cómputo administrativo / industrial**: departamento, sistema operativo, procesador, HD y RAM son obligatorios; si está *Asignado*, también el usuario. Hostname, vigencia, adaptador cargador y ticket son opcionales.
- **PC / Laptop**: en el menú, *Cómputo administrativo* se despliega en *PC* y *Laptop*. Cada submódulo muestra y registra solo sus equipos
  (se guardan en la misma tabla, columna `tipo_equipo`). Para pasar un equipo de PC a Laptop basta con editarlo (queda en el historial).
- **Monitores / proyectores**: marca, modelo y número de serie son obligatorios. Si está *Asignado*, también usuario y fecha de asignación.
- El número de serie (y el IMEI en celulares) no se puede repetir dentro de la misma planta.
- La **vigencia** se muestra en rojo si ya venció y en amarillo si vence en los próximos 30 días.
- Cada registro guarda un **historial de cambios** (quién y qué cambió), visible en "Ver detalles".

## Perfiles

| Perfil | Puede |
|---|---|
| **Administrador** | Todo: agregar, editar y eliminar en todos los módulos, subir/mover/renombrar archivos de auditoría y administrar usuarios de su planta |
| **Usuario** | **Solo consultar**: ver listados y detalles, historial, descargar archivos y responsivas, consultar el tóner. No ve los botones de agregar, editar, eliminar, subir, cortar, pegar ni renombrar (aparece la etiqueta *Solo lectura*) |

- La restricción también la aplica el servidor: cualquier petición de escritura de un *Usuario* responde 403
  ("Tu perfil solo permite consultar la información"), aunque se intente fuera de la pantalla.
- Ambos perfiles pueden cambiar su propia foto y contraseña en *Mi perfil*.
- El perfil se elige al crear el usuario en *Usuarios* (solo Administrador).

Para cambiar qué campos son obligatorios o agregar campos, edita `server/src/modulos.js` y `client/src/modulos.js`
(y la tabla correspondiente en la base de datos).

---

## Estructura

```
sistema-inventario-ti/
├── client/                Frontend React (Vite)
│   ├── src/modulos.js     Campos de los 5 módulos de inventario (formulario y tabla)
│   ├── src/pages/         ModuloEquipos.jsx (genérico), Impresoras, Archivos, Usuarios…
│   └── src/mock/          Simulador para el modo sin servidor
├── server/                API Node.js + Express
│   ├── src/db.js          Conexión a SQL Server o MySQL
│   ├── src/modulos.js     Campos y validaciones de los 5 módulos
│   ├── src/routes/        equipos.js (genérico), impresoras, archivos, usuarios, auth…
│   └── storage/           Archivos subidos
└── database/
    ├── sis_invit_sqlserver.sql   Esquema para SQL Server (principal)
    ├── sis_invit_mysql.sql       El mismo esquema para MySQL/MariaDB
    ├── migracion_v3_*.sql        Actualiza una base v2 sin borrar datos (PC/Laptop, hostname, usuario)
    └── anterior/                 Esquema de la versión PHP (referencia)
```

## Requisitos

- **Node.js 18 o superior**
- **SQL Server 2016 o superior** (Express, Standard, Azure SQL…) — o MySQL 8 / MariaDB 10.4+

## Instalación

```bash
# 1. Base de datos: ejecuta el script en SQL Server Management Studio, o con sqlcmd:
sqlcmd -S MISERVIDOR -U sa -P "clave" -i database/sis_invit_sqlserver.sql

# 2. Dependencias
npm run instalar

# 3. Configuración
cp server/.env.example server/.env
#    edita server/.env: datos de SQL Server y JWT_SECRET

# 4. Compilar el frontend y arrancar
npm run build
npm start          # -> http://localhost:3001
```

El script crea **un administrador por planta**, ambos con usuario `admin` y la misma contraseña del admin
del sistema anterior. Cámbiala desde "Mi perfil" después de entrar.

> El script **borra y vuelve a crear** todas las tablas. No lo ejecutes sobre una base con datos que quieras conservar.

### Actualizar una base que ya tiene datos (v2 → v3)

```bash
sqlcmd -S MISERVIDOR -U sa -P "clave" -i database/migracion_v3_sqlserver.sql
# MySQL/MariaDB: mysql -u root -p sis_invit < database/migracion_v3_mysql.sql
```

Agrega las columnas nuevas sin borrar nada. Los equipos administrativos existentes quedan como **PC**; los que sean
laptops se cambian editándolos. A los equipos *Asignados* que ya existían habrá que capturarles el usuario la próxima vez que se editen.

### Configuración de SQL Server (`server/.env`)

```ini
DB_CLIENT=mssql
DB_HOST=MISERVIDOR          # nombre o IP del servidor
DB_PORT=1433
DB_INSTANCE=                # ej. SQLEXPRESS para una instancia con nombre (entonces se ignora DB_PORT)
DB_USER=inventario
DB_PASSWORD=********
DB_NAME=sis_invit
DB_ENCRYPT=false            # true para Azure SQL
DB_TRUST_CERT=true          # acepta el certificado autofirmado del servidor
```

- El usuario debe usar **autenticación de SQL Server** (usuario y contraseña). Habilítala en las propiedades del servidor
  ("SQL Server and Windows Authentication mode") si solo está la de Windows.
- Si usas una instancia con nombre (`SQLEXPRESS`), el servicio **SQL Server Browser** debe estar encendido; si no, usa el puerto fijo.
- Habilita TCP/IP en *SQL Server Configuration Manager* y abre el puerto 1433 en el firewall si el servidor está en otra máquina.
- Para comprobar la conexión: `http://localhost:3001/api/salud` debe responder `{"db":"ok","motor":"mssql"}`.

Para usar MySQL/MariaDB en lugar de SQL Server: `DB_CLIENT=mysql`, `DB_PORT=3306` y el script `database/sis_invit_mysql.sql`.

### Archivos subidos y logo

- Los archivos se guardan en `server/storage/` (o en la carpeta de `STORAGE_DIR`).
- Logo y fondo del login: copia `nidec.png` y `bg.jpg` a `client/public/assets/img/login/` y vuelve a ejecutar `npm run build`.

## Modo sin servidor (para probar solo el frontend)

Con `npm run dev:client` la app arranca **sin servidor Node ni base de datos**: el login usa usuarios de prueba y
cada módulo trabaja con datos de ejemplo guardados en el navegador, separados por planta.

| Planta | Usuario | Contraseña | Perfil |
|---|---|---|---|
| MX | `admin` | `admin123` | Administrador |
| MX | `soporte` | `soporte123` | Usuario |
| ATL | `admin` | `admin123` | Administrador |
| ATL | `tecnico` | `tecnico123` | Usuario |

`soporte` y `tecnico` tienen perfil *Usuario*: sirven para ver cómo queda la pantalla en solo lectura.

- En el login aparecen estos usuarios: un clic llena el formulario y elige la planta.
- "Restablecer datos de prueba" vuelve todo al inicio. Los archivos subidos solo duran hasta recargar la página.
- Para usar el servidor real en desarrollo: `VITE_SIN_SERVIDOR=false` en `client/.env.development`.
- `npm run build` **siempre** usa el servidor real; los usuarios de prueba no se incluyen en producción.

## Desarrollo con el servidor real

Con `VITE_SIN_SERVIDOR=false` en `client/.env.development`, en dos terminales:

```bash
npm run dev:server   # API con recarga automática en :3001
npm run dev:client   # React con recarga en caliente en :5173 (abre esta)
```

## Producción

`npm run build` genera `client/dist/` y `npm start` sirve la app **y** la API en el mismo puerto.

- **Windows**: [NSSM](https://nssm.cc/) apuntando a `node.exe server\src\index.js` (con `NODE_ENV=production`), o `pm2` con `pm2-windows-startup`.
- **Linux**: `pm2 start server/src/index.js --name inventario-ti`.
- Detrás de IIS, Apache o Nginx: proxy inverso al puerto 3001. Con HTTPS pon `COOKIE_SECURE=true`.

## API

| Ruta | Descripción |
|---|---|
| `GET /api/auth/regiones` | Plantas disponibles |
| `POST /api/auth/login` | `{ usuario, password, region_id }` (también para cambiar de región) |
| `/api/celulares`, `/api/computo_administrativo`, `/api/computo_industrial`, `/api/monitores`, `/api/proyectores` | `GET /` (`?estado=asignado\|sin_asignar`), `GET /:id`, `GET /:id/historial`, `POST /`, `PUT /:id`, `DELETE /:id`, `GET /sugerencias/:campo` |
| `/api/computo_administrativo` | Además `?tipo_equipo=PC\|LAPTOP`; `POST`/`PUT` exigen `tipo_equipo` |
| `POST /api/celulares/:id/archivo` · `DELETE …/archivo` | Subir / quitar la responsiva |
| `/api/impresoras`, `/api/archivos`, `/api/usuarios`, `/api/perfil` | Igual que antes, filtrados por planta |

Todas las rutas (excepto login y regiones) exigen sesión y solo devuelven datos de la planta de la sesión.
Las rutas `POST`, `PUT`, `PATCH` y `DELETE` de inventario, impresoras y archivos solo las puede usar el perfil Administrador.

## Cambios en la versión 3

- Cómputo administrativo dividido en submódulos **PC** y **Laptop** (mismos campos), con **hostname** y **usuario**.
- Cómputo industrial con **hostname** y **usuario**.
- Perfil **Usuario** de solo lectura en todo el inventario, impresoras y archivos; el Administrador puede agregar, editar y eliminar.
- Scripts `migracion_v3_sqlserver.sql` / `migracion_v3_mysql.sql` para actualizar sin perder datos.

## Cambios en la versión 2

- Nuevos módulos: Celulares, Cómputo administrativo, Cómputo industrial, Monitores y Proyectores.
- Se quitaron Equipos de cómputo, CCTVs y Tarjetas de acceso (y sus tablas en el nuevo esquema).
- Estado *Asignado / Sin asignar* en los módulos de equipos (Impresoras conserva Activo/Inactivo).
- Plantas Nidec GA Cold Mexico / Nidec Atlanta con datos y usuarios separados.
- Base de datos SQL Server. El número de serie se puede volver a registrar después de eliminar un equipo
  (índices únicos filtrados por `deleted_at`).
- Columna Acciones fija a la derecha en tablas anchas.
