-- Migración a v5 (MySQL / MariaDB 10.0+) — NO borra datos. Se puede ejecutar más de una vez.
-- Mismos campos en los 4 módulos de equipo y tabla usuario_regiones.

ALTER TABLE computo_administrativo
  ADD COLUMN IF NOT EXISTS numero_serie VARCHAR(100) NULL,
  ADD COLUMN IF NOT EXISTS marca VARCHAR(100) NULL,
  ADD COLUMN IF NOT EXISTS modelo VARCHAR(100) NULL,
  ADD COLUMN IF NOT EXISTS responsiva VARCHAR(500) NULL;

ALTER TABLE computo_industrial
  ADD COLUMN IF NOT EXISTS numero_serie VARCHAR(100) NULL,
  ADD COLUMN IF NOT EXISTS marca VARCHAR(100) NULL,
  ADD COLUMN IF NOT EXISTS modelo VARCHAR(100) NULL,
  ADD COLUMN IF NOT EXISTS responsiva VARCHAR(500) NULL;

ALTER TABLE monitores
  ADD COLUMN IF NOT EXISTS sistema_operativo VARCHAR(100) NULL,
  ADD COLUMN IF NOT EXISTS procesador VARCHAR(150) NULL,
  ADD COLUMN IF NOT EXISTS hd VARCHAR(50) NULL,
  ADD COLUMN IF NOT EXISTS ram VARCHAR(50) NULL,
  ADD COLUMN IF NOT EXISTS adaptador_cargador VARCHAR(150) NULL,
  ADD COLUMN IF NOT EXISTS responsiva VARCHAR(500) NULL;

ALTER TABLE proyectores
  ADD COLUMN IF NOT EXISTS sistema_operativo VARCHAR(100) NULL,
  ADD COLUMN IF NOT EXISTS procesador VARCHAR(150) NULL,
  ADD COLUMN IF NOT EXISTS hd VARCHAR(50) NULL,
  ADD COLUMN IF NOT EXISTS ram VARCHAR(50) NULL,
  ADD COLUMN IF NOT EXISTS adaptador_cargador VARCHAR(150) NULL,
  ADD COLUMN IF NOT EXISTS responsiva VARCHAR(500) NULL;

CREATE TABLE IF NOT EXISTS usuario_regiones (
  usuario_id INT NOT NULL,
  region_id  INT NOT NULL,
  PRIMARY KEY (usuario_id, region_id),
  CONSTRAINT fk_usureg_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios (id) ON DELETE CASCADE,
  CONSTRAINT fk_usureg_region  FOREIGN KEY (region_id)  REFERENCES regiones (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_spanish_ci;
