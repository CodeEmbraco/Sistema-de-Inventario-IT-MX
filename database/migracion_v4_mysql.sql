-- Migración v3 -> v4 (MySQL / MariaDB) — NO borra datos
-- Número de serie (opcional) en Cómputo administrativo (PC y Laptop) y Cómputo industrial.
ALTER TABLE computo_administrativo ADD COLUMN numero_serie VARCHAR(100) NULL AFTER usuario_asignado;
ALTER TABLE computo_industrial     ADD COLUMN numero_serie VARCHAR(100) NULL AFTER usuario_asignado;
