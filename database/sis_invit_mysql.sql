-- =====================================================================
-- Sistema de Inventario TI — Esquema para MySQL 8 / MariaDB 10.4+
-- Versión 3: plantas (regiones) + módulos nuevos (cómputo administrativo con PC y Laptop).
-- Mismo diseño que sis_invit_sqlserver.sql (la base principal es SQL Server).
-- ATENCIÓN: borra y vuelve a crear todas las tablas.
-- =====================================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS inventario_logs, celulares, computo_administrativo, computo_industrial, monitores, proyectores,
  portapapeles, archivos_logs, impresoras_logs, camaras_logs, computadoras_logs, tarjetas_acceso_logs,
  archivos, impresoras, camaras, computadoras, tarjetas_acceso, usuarios, regiones;

SET FOREIGN_KEY_CHECKS = 1;

CREATE TABLE regiones (
  id      INT          NOT NULL PRIMARY KEY,
  clave   VARCHAR(10)  NOT NULL UNIQUE,
  nombre  VARCHAR(100) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_spanish_ci;

INSERT INTO regiones (id, clave, nombre) VALUES (1, 'MX', 'Nidec GA Cold Mexico'), (2, 'ATL', 'Nidec Atlanta');

CREATE TABLE usuarios (
  id            INT          NOT NULL AUTO_INCREMENT PRIMARY KEY,
  region_id     INT          NOT NULL,
  nombre        VARCHAR(200) NOT NULL,
  usuario       VARCHAR(100) NOT NULL,
  `password`    VARCHAR(255) NOT NULL,
  perfil        VARCHAR(30)  NOT NULL,
  foto          VARCHAR(500) NOT NULL,
  estado        INT          NOT NULL DEFAULT 1,
  ultimo_login  DATETIME     NULL,
  fecha         TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_usuarios_region_usuario (region_id, usuario),
  CONSTRAINT fk_usuarios_region FOREIGN KEY (region_id) REFERENCES regiones (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_spanish_ci;

CREATE TABLE celulares (
  id                INT          NOT NULL AUTO_INCREMENT PRIMARY KEY,
  region_id         INT          NOT NULL,
  numero_telefono   VARCHAR(20)  NULL,
  usuario_asignado  VARCHAR(200) NULL,
  departamento      VARCHAR(150) NULL,
  marca             VARCHAR(100) NOT NULL,
  modelo            VARCHAR(100) NOT NULL,
  numero_serie      VARCHAR(100) NOT NULL,
  imei              VARCHAR(20)  NOT NULL,
  responsiva        VARCHAR(500) NULL,
  fecha_asignacion  DATE         NULL,
  numero_ticket     VARCHAR(50)  NULL,
  asignado          TINYINT      NOT NULL DEFAULT 0,
  usuario_id        INT          NOT NULL,
  created_at        TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at        TIMESTAMP    NULL DEFAULT NULL,
  KEY idx_celulares_region (region_id, deleted_at, asignado),
  CONSTRAINT fk_celulares_region  FOREIGN KEY (region_id)  REFERENCES regiones (id),
  CONSTRAINT fk_celulares_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_spanish_ci;

CREATE TABLE computo_administrativo (
  id                  INT          NOT NULL AUTO_INCREMENT PRIMARY KEY,
  region_id           INT          NOT NULL,
  tipo_equipo         ENUM('PC','LAPTOP') NOT NULL DEFAULT 'PC',
  hostname            VARCHAR(100) NULL,
  usuario_asignado    VARCHAR(200) NULL,
  departamento        VARCHAR(150) NOT NULL,
  sistema_operativo   VARCHAR(100) NOT NULL,
  procesador          VARCHAR(150) NOT NULL,
  hd                  VARCHAR(50)  NOT NULL,
  ram                 VARCHAR(50)  NOT NULL,
  vigencia            DATE         NULL,
  adaptador_cargador  VARCHAR(150) NULL,
  numero_ticket       VARCHAR(50)  NULL,
  asignado            TINYINT      NOT NULL DEFAULT 0,
  usuario_id          INT          NOT NULL,
  created_at          TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at          TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at          TIMESTAMP    NULL DEFAULT NULL,
  KEY idx_compadm_region (region_id, tipo_equipo, deleted_at, asignado),
  CONSTRAINT fk_compadm_region  FOREIGN KEY (region_id)  REFERENCES regiones (id),
  CONSTRAINT fk_compadm_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_spanish_ci;

CREATE TABLE computo_industrial LIKE computo_administrativo;
ALTER TABLE computo_industrial
  DROP COLUMN tipo_equipo,
  ADD CONSTRAINT fk_compind_region  FOREIGN KEY (region_id)  REFERENCES regiones (id),
  ADD CONSTRAINT fk_compind_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios (id);

CREATE TABLE monitores (
  id                INT          NOT NULL AUTO_INCREMENT PRIMARY KEY,
  region_id         INT          NOT NULL,
  hostname          VARCHAR(100) NULL,
  usuario_asignado  VARCHAR(200) NULL,
  fecha_asignacion  DATE         NULL,
  departamento      VARCHAR(150) NULL,
  ubicacion         VARCHAR(200) NULL,
  marca             VARCHAR(100) NOT NULL,
  modelo            VARCHAR(100) NOT NULL,
  numero_serie      VARCHAR(100) NOT NULL,
  vigencia          DATE         NULL,
  numero_ticket     VARCHAR(50)  NULL,
  asignado          TINYINT      NOT NULL DEFAULT 0,
  usuario_id        INT          NOT NULL,
  created_at        TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at        TIMESTAMP    NULL DEFAULT NULL,
  KEY idx_monitores_region (region_id, deleted_at, asignado),
  CONSTRAINT fk_monitores_region  FOREIGN KEY (region_id)  REFERENCES regiones (id),
  CONSTRAINT fk_monitores_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_spanish_ci;

CREATE TABLE proyectores LIKE monitores;
ALTER TABLE proyectores
  ADD CONSTRAINT fk_proyectores_region  FOREIGN KEY (region_id)  REFERENCES regiones (id),
  ADD CONSTRAINT fk_proyectores_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios (id);

CREATE TABLE inventario_logs (
  id           INT         NOT NULL AUTO_INCREMENT PRIMARY KEY,
  region_id    INT         NOT NULL,
  modulo       VARCHAR(40) NOT NULL,
  registro_id  INT         NOT NULL,
  accion       ENUM('CREAR','EDITAR','ELIMINAR') NOT NULL,
  detalles     TEXT        NULL,
  usuario_id   INT         NOT NULL,
  created_at   TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_inventario_logs_registro (modulo, registro_id),
  CONSTRAINT fk_inventario_logs_region  FOREIGN KEY (region_id)  REFERENCES regiones (id),
  CONSTRAINT fk_inventario_logs_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_spanish_ci;

CREATE TABLE impresoras (
  id          INT          NOT NULL AUTO_INCREMENT PRIMARY KEY,
  region_id   INT          NOT NULL,
  nombre      VARCHAR(100) NOT NULL,
  marca       VARCHAR(100) NULL,
  modelo      VARCHAR(100) NULL,
  serie       VARCHAR(100) NOT NULL,
  ubicacion   VARCHAR(200) NULL,
  ip          VARCHAR(15)  NULL,
  foto        VARCHAR(255) NULL,
  activo      TINYINT      NOT NULL DEFAULT 1,
  usuario_id  INT          NOT NULL,
  created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at  TIMESTAMP    NULL DEFAULT NULL,
  KEY idx_impresoras_region (region_id, deleted_at, activo),
  KEY idx_impresoras_nombre (nombre),
  CONSTRAINT fk_impresoras_region  FOREIGN KEY (region_id)  REFERENCES regiones (id),
  CONSTRAINT fk_impresoras_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_spanish_ci;

CREATE TABLE impresoras_logs (
  id            INT       NOT NULL AUTO_INCREMENT PRIMARY KEY,
  impresora_id  INT       NOT NULL,
  accion        ENUM('CREAR','EDITAR','ELIMINAR','ACTIVAR','DESACTIVAR') NOT NULL,
  detalles      TEXT      NULL,
  usuario_id    INT       NOT NULL,
  created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_impresoras_logs_impresora (impresora_id),
  CONSTRAINT fk_logs_impresora   FOREIGN KEY (impresora_id) REFERENCES impresoras (id),
  CONSTRAINT fk_logs_usuario_imp FOREIGN KEY (usuario_id)   REFERENCES usuarios (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_spanish_ci;

CREATE TABLE archivos (
  id                INT          NOT NULL AUTO_INCREMENT PRIMARY KEY,
  region_id         INT          NOT NULL,
  nombre            VARCHAR(255) NOT NULL,
  tipo              ENUM('CARPETA','ARCHIVO') NOT NULL,
  extension         VARCHAR(50)  NULL,
  `tamaño`          BIGINT       NULL,
  ruta_fisica       VARCHAR(500) NULL,
  carpeta_padre_id  INT          NULL,
  activo            TINYINT      NOT NULL DEFAULT 1,
  usuario_id        INT          NOT NULL,
  created_at        TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at        TIMESTAMP    NULL DEFAULT NULL,
  KEY idx_archivos_region_padre (region_id, carpeta_padre_id, activo),
  CONSTRAINT fk_archivos_region        FOREIGN KEY (region_id)        REFERENCES regiones (id),
  CONSTRAINT fk_archivos_carpeta_padre FOREIGN KEY (carpeta_padre_id) REFERENCES archivos (id),
  CONSTRAINT fk_archivos_usuario       FOREIGN KEY (usuario_id)       REFERENCES usuarios (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_spanish_ci;

CREATE TABLE archivos_logs (
  id          INT       NOT NULL AUTO_INCREMENT PRIMARY KEY,
  archivo_id  INT       NOT NULL,
  accion      ENUM('CREAR','EDITAR','ELIMINAR','RESTAURAR','MOVER','COPIAR','RENOMBRAR','CORTAR','PEGAR') NOT NULL,
  detalles    TEXT      NULL,
  usuario_id  INT       NOT NULL,
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_archivos_logs_archivo (archivo_id),
  CONSTRAINT fk_archivos_logs_archivo FOREIGN KEY (archivo_id) REFERENCES archivos (id),
  CONSTRAINT fk_archivos_logs_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_spanish_ci;

CREATE TABLE portapapeles (
  id          INT       NOT NULL AUTO_INCREMENT PRIMARY KEY,
  archivo_id  INT       NOT NULL,
  operacion   ENUM('CORTAR','COPIAR') NOT NULL,
  usuario_id  INT       NOT NULL,
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expiracion  TIMESTAMP NOT NULL DEFAULT (CURRENT_TIMESTAMP + INTERVAL 1 HOUR),
  CONSTRAINT fk_portapapeles_archivo FOREIGN KEY (archivo_id) REFERENCES archivos (id),
  CONSTRAINT fk_portapapeles_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_spanish_ci;

-- Un administrador por planta (misma contraseña que el admin del sistema anterior)
INSERT INTO usuarios (id, region_id, nombre, usuario, `password`, perfil, foto, estado, ultimo_login) VALUES
  (1, 1, 'Administrador', 'admin', '$2y$12$XJ25Js/GEiKmvPO5ZFsOWe/YPRgtFzaDFAECo0L3gtscbueto/0WG', 'Administrador', 'vistas/img/usuarios/admin/191.png', 1, NULL),
  (2, 2, 'Administrador Atlanta', 'admin', '$2y$12$XJ25Js/GEiKmvPO5ZFsOWe/YPRgtFzaDFAECo0L3gtscbueto/0WG', 'Administrador', 'vistas/img/usuarios/default/anonymous.png', 1, NULL);
