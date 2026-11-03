/* =====================================================================
   Migración v2 -> v3 (SQL Server) — NO borra datos
   - Cómputo administrativo: tipo de equipo (submódulos PC / Laptop),
     hostname y usuario.
   - Cómputo industrial: hostname y usuario.
   Los equipos administrativos que ya existían quedan como PC; cámbialos
   a Laptop desde el sistema si corresponde.
   Úsalo solo si ya ejecutaste sis_invit_sqlserver.sql (versión 2).
   ===================================================================== */
USE sis_invit;
GO
SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

IF COL_LENGTH('dbo.computo_administrativo', 'tipo_equipo') IS NULL
BEGIN
    ALTER TABLE dbo.computo_administrativo ADD
        tipo_equipo NVARCHAR(10) NOT NULL CONSTRAINT df_compadm_tipo DEFAULT N'PC'
            CONSTRAINT ck_compadm_tipo CHECK (tipo_equipo IN (N'PC', N'LAPTOP'));
END;
IF COL_LENGTH('dbo.computo_administrativo', 'hostname') IS NULL
    ALTER TABLE dbo.computo_administrativo ADD hostname NVARCHAR(100) NULL;
IF COL_LENGTH('dbo.computo_administrativo', 'usuario_asignado') IS NULL
    ALTER TABLE dbo.computo_administrativo ADD usuario_asignado NVARCHAR(200) NULL;

IF COL_LENGTH('dbo.computo_industrial', 'hostname') IS NULL
    ALTER TABLE dbo.computo_industrial ADD hostname NVARCHAR(100) NULL;
IF COL_LENGTH('dbo.computo_industrial', 'usuario_asignado') IS NULL
    ALTER TABLE dbo.computo_industrial ADD usuario_asignado NVARCHAR(200) NULL;
GO

IF EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_compadm_region' AND object_id = OBJECT_ID('dbo.computo_administrativo'))
    DROP INDEX idx_compadm_region ON dbo.computo_administrativo;
CREATE INDEX idx_compadm_region ON dbo.computo_administrativo (region_id, tipo_equipo, deleted_at, asignado);
GO
