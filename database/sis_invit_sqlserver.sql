/* =====================================================================
   Sistema de Inventario TI — Esquema para Microsoft SQL Server
   Versión 3: plantas (regiones) + módulos Celulares, Cómputo administrativo
   (submódulos PC y Laptop), Cómputo industrial, Monitores y Proyectores.
   Si ya tienes la versión 2 instalada con datos, usa migracion_v3_sqlserver.sql.
   Compatible con SQL Server 2016 o superior / Azure SQL.

   Ejecutar en SQL Server Management Studio (SSMS) o con:
       sqlcmd -S servidor -U usuario -P clave -i sis_invit_sqlserver.sql

   ATENCIÓN: borra y vuelve a crear todas las tablas (se pierden los datos).

   Cada registro pertenece a una planta (region_id). Al iniciar sesión se
   elige la planta y el sistema solo muestra los datos de esa planta.
   Los usuarios también son de una sola planta.
   ===================================================================== */

IF DB_ID(N'sis_invit') IS NULL
    CREATE DATABASE sis_invit COLLATE Modern_Spanish_CI_AS;
GO

USE sis_invit;
GO

-- Necesarios para los índices únicos filtrados (sqlcmd los trae apagados por defecto)
SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

/* ---------------------------------------------------------------------
   1. Borrar tablas (primero las que dependen de otras).
      Incluye las tablas de la versión anterior que ya no se usan.
   --------------------------------------------------------------------- */
DROP TABLE IF EXISTS dbo.inventario_logs;
DROP TABLE IF EXISTS dbo.celulares;
DROP TABLE IF EXISTS dbo.computo_administrativo;
DROP TABLE IF EXISTS dbo.computo_industrial;
DROP TABLE IF EXISTS dbo.monitores;
DROP TABLE IF EXISTS dbo.proyectores;
DROP TABLE IF EXISTS dbo.portapapeles;
DROP TABLE IF EXISTS dbo.archivos_logs;
DROP TABLE IF EXISTS dbo.impresoras_logs;
DROP TABLE IF EXISTS dbo.camaras_logs;          -- versión anterior
DROP TABLE IF EXISTS dbo.computadoras_logs;     -- versión anterior
DROP TABLE IF EXISTS dbo.tarjetas_acceso_logs;  -- versión anterior
DROP TABLE IF EXISTS dbo.archivos;
DROP TABLE IF EXISTS dbo.impresoras;
DROP TABLE IF EXISTS dbo.camaras;               -- versión anterior
DROP TABLE IF EXISTS dbo.computadoras;          -- versión anterior
DROP TABLE IF EXISTS dbo.tarjetas_acceso;       -- versión anterior
DROP TABLE IF EXISTS dbo.usuarios;
DROP TABLE IF EXISTS dbo.regiones;
GO

/* ---------------------------------------------------------------------
   2. Plantas / regiones
   --------------------------------------------------------------------- */
CREATE TABLE dbo.regiones (
    id      INT           NOT NULL,
    clave   NVARCHAR(10)  NOT NULL,
    nombre  NVARCHAR(100) NOT NULL,
    CONSTRAINT pk_regiones PRIMARY KEY (id),
    CONSTRAINT uq_regiones_clave UNIQUE (clave)
);
GO

INSERT INTO dbo.regiones (id, clave, nombre) VALUES
    (1, N'MX',  N'Nidec GA Cold Mexico'),
    (2, N'ATL', N'Nidec Atlanta');
GO

/* ---------------------------------------------------------------------
   3. Usuarios del sistema (cada uno pertenece a una planta)
   --------------------------------------------------------------------- */
CREATE TABLE dbo.usuarios (
    id            INT IDENTITY(1,1) NOT NULL,
    region_id     INT               NOT NULL,
    nombre        NVARCHAR(200)     NOT NULL,
    usuario       NVARCHAR(100)     NOT NULL,
    [password]    NVARCHAR(255)     NOT NULL,
    perfil        NVARCHAR(30)      NOT NULL,
    foto          NVARCHAR(500)     NOT NULL,
    estado        INT               NOT NULL CONSTRAINT df_usuarios_estado DEFAULT 1,
    ultimo_login  DATETIME2(0)      NULL,        -- NULL = nunca ha iniciado sesión
    fecha         DATETIME2(0)      NOT NULL CONSTRAINT df_usuarios_fecha DEFAULT SYSDATETIME(),
    CONSTRAINT pk_usuarios PRIMARY KEY (id),
    CONSTRAINT fk_usuarios_region FOREIGN KEY (region_id) REFERENCES dbo.regiones (id),
    CONSTRAINT uq_usuarios_region_usuario UNIQUE (region_id, usuario)
);
GO

/* ---------------------------------------------------------------------
   4. Módulos de inventario nuevos
      asignado: 1 = Asignado, 0 = Sin asignar
   --------------------------------------------------------------------- */
CREATE TABLE dbo.celulares (
    id                INT IDENTITY(1,1) NOT NULL,
    region_id         INT               NOT NULL,
    numero_telefono   NVARCHAR(20)      NULL,
    usuario_asignado  NVARCHAR(200)     NULL,
    departamento      NVARCHAR(150)     NULL,
    marca             NVARCHAR(100)     NOT NULL,
    modelo            NVARCHAR(100)     NOT NULL,
    numero_serie      NVARCHAR(100)     NOT NULL,
    imei              NVARCHAR(20)      NOT NULL,
    responsiva        NVARCHAR(500)     NULL,
    fecha_asignacion  DATE              NULL,
    numero_ticket     NVARCHAR(50)      NULL,
    asignado          TINYINT           NOT NULL CONSTRAINT df_celulares_asignado DEFAULT 0,
    usuario_id        INT               NOT NULL,
    created_at        DATETIME2(0)      NOT NULL CONSTRAINT df_celulares_created DEFAULT SYSDATETIME(),
    updated_at        DATETIME2(0)      NOT NULL CONSTRAINT df_celulares_updated DEFAULT SYSDATETIME(),
    deleted_at        DATETIME2(0)      NULL,
    CONSTRAINT pk_celulares PRIMARY KEY (id),
    CONSTRAINT fk_celulares_region  FOREIGN KEY (region_id)  REFERENCES dbo.regiones (id),
    CONSTRAINT fk_celulares_usuario FOREIGN KEY (usuario_id) REFERENCES dbo.usuarios (id),
    CONSTRAINT ck_celulares_asignado CHECK (asignado IN (0, 1))
);
GO

CREATE TABLE dbo.computo_administrativo (
    id                  INT IDENTITY(1,1) NOT NULL,
    region_id           INT               NOT NULL,
    tipo_equipo         NVARCHAR(10)      NOT NULL CONSTRAINT df_compadm_tipo DEFAULT N'PC',   -- submódulo: PC | LAPTOP
    hostname            NVARCHAR(100)     NULL,
    usuario_asignado    NVARCHAR(200)     NULL,
    departamento        NVARCHAR(150)     NOT NULL,
    sistema_operativo   NVARCHAR(100)     NOT NULL,
    procesador          NVARCHAR(150)     NOT NULL,
    hd                  NVARCHAR(50)      NOT NULL,
    ram                 NVARCHAR(50)      NOT NULL,
    vigencia            DATE              NULL,
    adaptador_cargador  NVARCHAR(150)     NULL,
    numero_ticket       NVARCHAR(50)      NULL,
    asignado            TINYINT           NOT NULL CONSTRAINT df_compadm_asignado DEFAULT 0,
    usuario_id          INT               NOT NULL,
    created_at          DATETIME2(0)      NOT NULL CONSTRAINT df_compadm_created DEFAULT SYSDATETIME(),
    updated_at          DATETIME2(0)      NOT NULL CONSTRAINT df_compadm_updated DEFAULT SYSDATETIME(),
    deleted_at          DATETIME2(0)      NULL,
    CONSTRAINT pk_computo_administrativo PRIMARY KEY (id),
    CONSTRAINT fk_compadm_region  FOREIGN KEY (region_id)  REFERENCES dbo.regiones (id),
    CONSTRAINT fk_compadm_usuario FOREIGN KEY (usuario_id) REFERENCES dbo.usuarios (id),
    CONSTRAINT ck_compadm_asignado CHECK (asignado IN (0, 1)),
    CONSTRAINT ck_compadm_tipo CHECK (tipo_equipo IN (N'PC', N'LAPTOP'))
);
GO

CREATE TABLE dbo.computo_industrial (
    id                  INT IDENTITY(1,1) NOT NULL,
    region_id           INT               NOT NULL,
    hostname            NVARCHAR(100)     NULL,
    usuario_asignado    NVARCHAR(200)     NULL,
    departamento        NVARCHAR(150)     NOT NULL,
    sistema_operativo   NVARCHAR(100)     NOT NULL,
    procesador          NVARCHAR(150)     NOT NULL,
    hd                  NVARCHAR(50)      NOT NULL,
    ram                 NVARCHAR(50)      NOT NULL,
    vigencia            DATE              NULL,
    adaptador_cargador  NVARCHAR(150)     NULL,
    numero_ticket       NVARCHAR(50)      NULL,
    asignado            TINYINT           NOT NULL CONSTRAINT df_compind_asignado DEFAULT 0,
    usuario_id          INT               NOT NULL,
    created_at          DATETIME2(0)      NOT NULL CONSTRAINT df_compind_created DEFAULT SYSDATETIME(),
    updated_at          DATETIME2(0)      NOT NULL CONSTRAINT df_compind_updated DEFAULT SYSDATETIME(),
    deleted_at          DATETIME2(0)      NULL,
    CONSTRAINT pk_computo_industrial PRIMARY KEY (id),
    CONSTRAINT fk_compind_region  FOREIGN KEY (region_id)  REFERENCES dbo.regiones (id),
    CONSTRAINT fk_compind_usuario FOREIGN KEY (usuario_id) REFERENCES dbo.usuarios (id),
    CONSTRAINT ck_compind_asignado CHECK (asignado IN (0, 1))
);
GO

CREATE TABLE dbo.monitores (
    id                INT IDENTITY(1,1) NOT NULL,
    region_id         INT               NOT NULL,
    hostname          NVARCHAR(100)     NULL,
    usuario_asignado  NVARCHAR(200)     NULL,
    fecha_asignacion  DATE              NULL,
    departamento      NVARCHAR(150)     NULL,
    ubicacion         NVARCHAR(200)     NULL,
    marca             NVARCHAR(100)     NOT NULL,
    modelo            NVARCHAR(100)     NOT NULL,
    numero_serie      NVARCHAR(100)     NOT NULL,
    vigencia          DATE              NULL,
    numero_ticket     NVARCHAR(50)      NULL,
    asignado          TINYINT           NOT NULL CONSTRAINT df_monitores_asignado DEFAULT 0,
    usuario_id        INT               NOT NULL,
    created_at        DATETIME2(0)      NOT NULL CONSTRAINT df_monitores_created DEFAULT SYSDATETIME(),
    updated_at        DATETIME2(0)      NOT NULL CONSTRAINT df_monitores_updated DEFAULT SYSDATETIME(),
    deleted_at        DATETIME2(0)      NULL,
    CONSTRAINT pk_monitores PRIMARY KEY (id),
    CONSTRAINT fk_monitores_region  FOREIGN KEY (region_id)  REFERENCES dbo.regiones (id),
    CONSTRAINT fk_monitores_usuario FOREIGN KEY (usuario_id) REFERENCES dbo.usuarios (id),
    CONSTRAINT ck_monitores_asignado CHECK (asignado IN (0, 1))
);
GO

CREATE TABLE dbo.proyectores (
    id                INT IDENTITY(1,1) NOT NULL,
    region_id         INT               NOT NULL,
    hostname          NVARCHAR(100)     NULL,
    usuario_asignado  NVARCHAR(200)     NULL,
    fecha_asignacion  DATE              NULL,
    departamento      NVARCHAR(150)     NULL,
    ubicacion         NVARCHAR(200)     NULL,
    marca             NVARCHAR(100)     NOT NULL,
    modelo            NVARCHAR(100)     NOT NULL,
    numero_serie      NVARCHAR(100)     NOT NULL,
    vigencia          DATE              NULL,
    numero_ticket     NVARCHAR(50)      NULL,
    asignado          TINYINT           NOT NULL CONSTRAINT df_proyectores_asignado DEFAULT 0,
    usuario_id        INT               NOT NULL,
    created_at        DATETIME2(0)      NOT NULL CONSTRAINT df_proyectores_created DEFAULT SYSDATETIME(),
    updated_at        DATETIME2(0)      NOT NULL CONSTRAINT df_proyectores_updated DEFAULT SYSDATETIME(),
    deleted_at        DATETIME2(0)      NULL,
    CONSTRAINT pk_proyectores PRIMARY KEY (id),
    CONSTRAINT fk_proyectores_region  FOREIGN KEY (region_id)  REFERENCES dbo.regiones (id),
    CONSTRAINT fk_proyectores_usuario FOREIGN KEY (usuario_id) REFERENCES dbo.usuarios (id),
    CONSTRAINT ck_proyectores_asignado CHECK (asignado IN (0, 1))
);
GO

-- Bitácora común de los 5 módulos nuevos
CREATE TABLE dbo.inventario_logs (
    id           INT IDENTITY(1,1) NOT NULL,
    region_id    INT               NOT NULL,
    modulo       NVARCHAR(40)      NOT NULL,   -- celulares, computo_administrativo, ...
    registro_id  INT               NOT NULL,
    accion       NVARCHAR(10)      NOT NULL,
    detalles     NVARCHAR(MAX)     NULL,
    usuario_id   INT               NOT NULL,
    created_at   DATETIME2(0)      NOT NULL CONSTRAINT df_inventario_logs_created DEFAULT SYSDATETIME(),
    CONSTRAINT pk_inventario_logs PRIMARY KEY (id),
    CONSTRAINT fk_inventario_logs_region  FOREIGN KEY (region_id)  REFERENCES dbo.regiones (id),
    CONSTRAINT fk_inventario_logs_usuario FOREIGN KEY (usuario_id) REFERENCES dbo.usuarios (id),
    CONSTRAINT ck_inventario_logs_accion CHECK (accion IN (N'CREAR', N'EDITAR', N'ELIMINAR'))
);
GO

/* ---------------------------------------------------------------------
   5. Impresoras (sin cambios, solo se agrega la planta)
   --------------------------------------------------------------------- */
CREATE TABLE dbo.impresoras (
    id          INT IDENTITY(1,1) NOT NULL,
    region_id   INT               NOT NULL,
    nombre      NVARCHAR(100)     NOT NULL,
    marca       NVARCHAR(100)     NULL,
    modelo      NVARCHAR(100)     NULL,
    serie       NVARCHAR(100)     NOT NULL,
    ubicacion   NVARCHAR(200)     NULL,
    ip          NVARCHAR(15)      NULL,
    foto        NVARCHAR(255)     NULL,
    activo      TINYINT           NOT NULL CONSTRAINT df_impresoras_activo DEFAULT 1,
    usuario_id  INT               NOT NULL,
    created_at  DATETIME2(0)      NOT NULL CONSTRAINT df_impresoras_created DEFAULT SYSDATETIME(),
    updated_at  DATETIME2(0)      NOT NULL CONSTRAINT df_impresoras_updated DEFAULT SYSDATETIME(),
    deleted_at  DATETIME2(0)      NULL,
    CONSTRAINT pk_impresoras PRIMARY KEY (id),
    CONSTRAINT fk_impresoras_region  FOREIGN KEY (region_id)  REFERENCES dbo.regiones (id),
    CONSTRAINT fk_impresoras_usuario FOREIGN KEY (usuario_id) REFERENCES dbo.usuarios (id)
);
GO

CREATE TABLE dbo.impresoras_logs (
    id            INT IDENTITY(1,1) NOT NULL,
    impresora_id  INT               NOT NULL,
    accion        NVARCHAR(10)      NOT NULL,
    detalles      NVARCHAR(MAX)     NULL,
    usuario_id    INT               NOT NULL,
    created_at    DATETIME2(0)      NOT NULL CONSTRAINT df_impresoras_logs_created DEFAULT SYSDATETIME(),
    CONSTRAINT pk_impresoras_logs PRIMARY KEY (id),
    CONSTRAINT fk_logs_impresora   FOREIGN KEY (impresora_id) REFERENCES dbo.impresoras (id),
    CONSTRAINT fk_logs_usuario_imp FOREIGN KEY (usuario_id)   REFERENCES dbo.usuarios (id),
    CONSTRAINT ck_impresoras_logs_accion CHECK (accion IN (N'CREAR', N'EDITAR', N'ELIMINAR', N'ACTIVAR', N'DESACTIVAR'))
);
GO

/* ---------------------------------------------------------------------
   6. Archivos de auditoría (sin cambios, solo se agrega la planta)
   --------------------------------------------------------------------- */
CREATE TABLE dbo.archivos (
    id                INT IDENTITY(1,1) NOT NULL,
    region_id         INT               NOT NULL,
    nombre            NVARCHAR(255)     NOT NULL,
    tipo              NVARCHAR(10)      NOT NULL,
    extension         NVARCHAR(50)      NULL,
    [tamaño]          BIGINT            NULL,
    ruta_fisica       NVARCHAR(500)     NULL,
    carpeta_padre_id  INT               NULL,
    activo            TINYINT           NOT NULL CONSTRAINT df_archivos_activo DEFAULT 1,
    usuario_id        INT               NOT NULL,
    created_at        DATETIME2(0)      NOT NULL CONSTRAINT df_archivos_created DEFAULT SYSDATETIME(),
    updated_at        DATETIME2(0)      NOT NULL CONSTRAINT df_archivos_updated DEFAULT SYSDATETIME(),
    deleted_at        DATETIME2(0)      NULL,
    CONSTRAINT pk_archivos PRIMARY KEY (id),
    CONSTRAINT fk_archivos_region FOREIGN KEY (region_id) REFERENCES dbo.regiones (id),
    -- SQL Server no permite ON DELETE CASCADE en una tabla que se referencia a sí misma;
    -- no afecta porque el sistema solo marca deleted_at, nunca borra filas.
    CONSTRAINT fk_archivos_carpeta_padre FOREIGN KEY (carpeta_padre_id) REFERENCES dbo.archivos (id),
    CONSTRAINT fk_archivos_usuario FOREIGN KEY (usuario_id) REFERENCES dbo.usuarios (id),
    CONSTRAINT ck_archivos_tipo CHECK (tipo IN (N'CARPETA', N'ARCHIVO'))
);
GO

CREATE TABLE dbo.archivos_logs (
    id          INT IDENTITY(1,1) NOT NULL,
    archivo_id  INT               NOT NULL,
    accion      NVARCHAR(10)      NOT NULL,
    detalles    NVARCHAR(MAX)     NULL,
    usuario_id  INT               NOT NULL,
    created_at  DATETIME2(0)      NOT NULL CONSTRAINT df_archivos_logs_created DEFAULT SYSDATETIME(),
    CONSTRAINT pk_archivos_logs PRIMARY KEY (id),
    CONSTRAINT fk_archivos_logs_archivo FOREIGN KEY (archivo_id) REFERENCES dbo.archivos (id),
    CONSTRAINT fk_archivos_logs_usuario FOREIGN KEY (usuario_id) REFERENCES dbo.usuarios (id),
    CONSTRAINT ck_archivos_logs_accion CHECK (accion IN
        (N'CREAR', N'EDITAR', N'ELIMINAR', N'RESTAURAR', N'MOVER', N'COPIAR', N'RENOMBRAR', N'CORTAR', N'PEGAR'))
);
GO

CREATE TABLE dbo.portapapeles (
    id          INT IDENTITY(1,1) NOT NULL,
    archivo_id  INT               NOT NULL,
    operacion   NVARCHAR(10)      NOT NULL,
    usuario_id  INT               NOT NULL,
    created_at  DATETIME2(0)      NOT NULL CONSTRAINT df_portapapeles_created DEFAULT SYSDATETIME(),
    expiracion  DATETIME2(0)      NOT NULL CONSTRAINT df_portapapeles_expiracion DEFAULT DATEADD(HOUR, 1, SYSDATETIME()),
    CONSTRAINT pk_portapapeles PRIMARY KEY (id),
    CONSTRAINT fk_portapapeles_archivo FOREIGN KEY (archivo_id) REFERENCES dbo.archivos (id),
    CONSTRAINT fk_portapapeles_usuario FOREIGN KEY (usuario_id) REFERENCES dbo.usuarios (id),
    CONSTRAINT ck_portapapeles_operacion CHECK (operacion IN (N'CORTAR', N'COPIAR'))
);
GO

/* ---------------------------------------------------------------------
   7. Índices
      Los índices únicos filtrados (WHERE deleted_at IS NULL) impiden repetir
      un número de serie / IMEI dentro de la misma planta, pero permiten
      volver a registrar un equipo que se eliminó antes.
   --------------------------------------------------------------------- */
CREATE UNIQUE INDEX uq_celulares_serie      ON dbo.celulares (region_id, numero_serie) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX uq_celulares_imei       ON dbo.celulares (region_id, imei)         WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX uq_monitores_serie      ON dbo.monitores (region_id, numero_serie) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX uq_proyectores_serie    ON dbo.proyectores (region_id, numero_serie) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX uq_impresoras_serie     ON dbo.impresoras (region_id, serie)       WHERE deleted_at IS NULL;

CREATE INDEX idx_celulares_region           ON dbo.celulares (region_id, deleted_at, asignado);
CREATE INDEX idx_compadm_region             ON dbo.computo_administrativo (region_id, tipo_equipo, deleted_at, asignado);
CREATE INDEX idx_compind_region             ON dbo.computo_industrial (region_id, deleted_at, asignado);
CREATE INDEX idx_monitores_region           ON dbo.monitores (region_id, deleted_at, asignado);
CREATE INDEX idx_proyectores_region         ON dbo.proyectores (region_id, deleted_at, asignado);
CREATE INDEX idx_inventario_logs_registro   ON dbo.inventario_logs (modulo, registro_id);

CREATE INDEX idx_impresoras_region          ON dbo.impresoras (region_id, deleted_at, activo);
CREATE INDEX idx_impresoras_nombre          ON dbo.impresoras (nombre);
CREATE INDEX idx_impresoras_logs_impresora  ON dbo.impresoras_logs (impresora_id);

CREATE INDEX idx_archivos_region_padre      ON dbo.archivos (region_id, carpeta_padre_id, activo);
CREATE INDEX idx_archivos_logs_archivo      ON dbo.archivos_logs (archivo_id);
CREATE INDEX idx_portapapeles_archivo       ON dbo.portapapeles (archivo_id);
CREATE INDEX idx_portapapeles_expiracion    ON dbo.portapapeles (expiracion);
GO

/* ---------------------------------------------------------------------
   8. Triggers: equivalen a "ON UPDATE current_timestamp()" de MySQL
   --------------------------------------------------------------------- */
CREATE OR ALTER TRIGGER dbo.tr_usuarios_fecha ON dbo.usuarios AFTER UPDATE AS
BEGIN
    SET NOCOUNT ON;
    IF TRIGGER_NESTLEVEL() > 1 RETURN;
    UPDATE t SET fecha = SYSDATETIME() FROM dbo.usuarios t JOIN inserted i ON t.id = i.id;
END;
GO
CREATE OR ALTER TRIGGER dbo.tr_celulares_updated ON dbo.celulares AFTER UPDATE AS
BEGIN
    SET NOCOUNT ON;
    IF TRIGGER_NESTLEVEL() > 1 RETURN;
    UPDATE t SET updated_at = SYSDATETIME() FROM dbo.celulares t JOIN inserted i ON t.id = i.id;
END;
GO
CREATE OR ALTER TRIGGER dbo.tr_compadm_updated ON dbo.computo_administrativo AFTER UPDATE AS
BEGIN
    SET NOCOUNT ON;
    IF TRIGGER_NESTLEVEL() > 1 RETURN;
    UPDATE t SET updated_at = SYSDATETIME() FROM dbo.computo_administrativo t JOIN inserted i ON t.id = i.id;
END;
GO
CREATE OR ALTER TRIGGER dbo.tr_compind_updated ON dbo.computo_industrial AFTER UPDATE AS
BEGIN
    SET NOCOUNT ON;
    IF TRIGGER_NESTLEVEL() > 1 RETURN;
    UPDATE t SET updated_at = SYSDATETIME() FROM dbo.computo_industrial t JOIN inserted i ON t.id = i.id;
END;
GO
CREATE OR ALTER TRIGGER dbo.tr_monitores_updated ON dbo.monitores AFTER UPDATE AS
BEGIN
    SET NOCOUNT ON;
    IF TRIGGER_NESTLEVEL() > 1 RETURN;
    UPDATE t SET updated_at = SYSDATETIME() FROM dbo.monitores t JOIN inserted i ON t.id = i.id;
END;
GO
CREATE OR ALTER TRIGGER dbo.tr_proyectores_updated ON dbo.proyectores AFTER UPDATE AS
BEGIN
    SET NOCOUNT ON;
    IF TRIGGER_NESTLEVEL() > 1 RETURN;
    UPDATE t SET updated_at = SYSDATETIME() FROM dbo.proyectores t JOIN inserted i ON t.id = i.id;
END;
GO
CREATE OR ALTER TRIGGER dbo.tr_impresoras_updated ON dbo.impresoras AFTER UPDATE AS
BEGIN
    SET NOCOUNT ON;
    IF TRIGGER_NESTLEVEL() > 1 RETURN;
    UPDATE t SET updated_at = SYSDATETIME() FROM dbo.impresoras t JOIN inserted i ON t.id = i.id;
END;
GO
CREATE OR ALTER TRIGGER dbo.tr_archivos_updated ON dbo.archivos AFTER UPDATE AS
BEGIN
    SET NOCOUNT ON;
    IF TRIGGER_NESTLEVEL() > 1 RETURN;
    UPDATE t SET updated_at = SYSDATETIME() FROM dbo.archivos t JOIN inserted i ON t.id = i.id;
END;
GO

/* ---------------------------------------------------------------------
   9. Usuarios iniciales: un administrador por planta.
      Ambos usan la contraseña del admin del sistema anterior.
      Cámbiala desde "Mi perfil" después del primer acceso.
   --------------------------------------------------------------------- */
SET IDENTITY_INSERT dbo.usuarios ON;

INSERT INTO dbo.usuarios (id, region_id, nombre, usuario, [password], perfil, foto, estado, ultimo_login, fecha) VALUES
    (1, 1, N'Administrador', N'admin', N'$2y$12$XJ25Js/GEiKmvPO5ZFsOWe/YPRgtFzaDFAECo0L3gtscbueto/0WG',
        N'Administrador', N'vistas/img/usuarios/admin/191.png', 1, NULL, SYSDATETIME()),
    (2, 2, N'Administrador Atlanta', N'admin', N'$2y$12$XJ25Js/GEiKmvPO5ZFsOWe/YPRgtFzaDFAECo0L3gtscbueto/0WG',
        N'Administrador', N'vistas/img/usuarios/default/anonymous.png', 1, NULL, SYSDATETIME());

SET IDENTITY_INSERT dbo.usuarios OFF;
GO

DBCC CHECKIDENT ('dbo.usuarios', RESEED, 2);
GO
