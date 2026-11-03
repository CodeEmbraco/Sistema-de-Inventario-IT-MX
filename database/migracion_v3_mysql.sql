-- Migración v2 -> v3 (MySQL / MariaDB) — NO borra datos.
-- Los equipos administrativos existentes quedan como PC.
ALTER TABLE computo_administrativo
  ADD COLUMN tipo_equipo ENUM('PC','LAPTOP') NOT NULL DEFAULT 'PC' AFTER region_id,
  ADD COLUMN hostname VARCHAR(100) NULL AFTER tipo_equipo,
  ADD COLUMN usuario_asignado VARCHAR(200) NULL AFTER hostname,
  DROP INDEX idx_compadm_region,
  ADD INDEX idx_compadm_region (region_id, tipo_equipo, deleted_at, asignado);

ALTER TABLE computo_industrial
  ADD COLUMN hostname VARCHAR(100) NULL AFTER region_id,
  ADD COLUMN usuario_asignado VARCHAR(200) NULL AFTER hostname;
