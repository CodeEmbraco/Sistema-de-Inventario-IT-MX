/* =====================================================================
   Migración v3 -> v4 (SQL Server) — NO borra datos
   - Número de serie en Cómputo administrativo (PC y Laptop) y Cómputo industrial.
     Es opcional y no se puede repetir dentro de la misma planta.
   Úsalo solo si tu base ya está en la versión 3.
   ===================================================================== */
USE sis_invit;
GO
SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

IF COL_LENGTH('dbo.computo_administrativo', 'numero_serie') IS NULL
    ALTER TABLE dbo.computo_administrativo ADD numero_serie NVARCHAR(100) NULL;
IF COL_LENGTH('dbo.computo_industrial', 'numero_serie') IS NULL
    ALTER TABLE dbo.computo_industrial ADD numero_serie NVARCHAR(100) NULL;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'uq_compadm_serie')
    CREATE UNIQUE INDEX uq_compadm_serie ON dbo.computo_administrativo (region_id, numero_serie)
        WHERE deleted_at IS NULL AND numero_serie IS NOT NULL;
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'uq_compind_serie')
    CREATE UNIQUE INDEX uq_compind_serie ON dbo.computo_industrial (region_id, numero_serie)
        WHERE deleted_at IS NULL AND numero_serie IS NOT NULL;
GO

PRINT 'Migración v4 aplicada.';
GO
