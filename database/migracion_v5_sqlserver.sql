/* =====================================================================
   Migración a v5 (SQL Server) — NO borra datos. Se puede ejecutar más de una vez.
   - Mismos campos en Cómputo administrativo (PC/Laptop), Cómputo industrial,
     Monitores y Proyectores: marca, modelo, SO, procesador, HD, RAM,
     adaptador cargador y responsiva.
   - Tabla usuario_regiones: plantas extra a las que puede entrar un usuario.
   Sirve para bases en versión 3 o 4.
   ===================================================================== */
USE sis_invit;
GO
SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

IF COL_LENGTH('dbo.computo_administrativo', 'numero_serie') IS NULL ALTER TABLE dbo.computo_administrativo ADD numero_serie NVARCHAR(100) NULL;
IF COL_LENGTH('dbo.computo_administrativo', 'marca') IS NULL ALTER TABLE dbo.computo_administrativo ADD marca NVARCHAR(100) NULL;
IF COL_LENGTH('dbo.computo_administrativo', 'modelo') IS NULL ALTER TABLE dbo.computo_administrativo ADD modelo NVARCHAR(100) NULL;
IF COL_LENGTH('dbo.computo_administrativo', 'responsiva') IS NULL ALTER TABLE dbo.computo_administrativo ADD responsiva NVARCHAR(500) NULL;
GO
IF COL_LENGTH('dbo.computo_industrial', 'numero_serie') IS NULL ALTER TABLE dbo.computo_industrial ADD numero_serie NVARCHAR(100) NULL;
IF COL_LENGTH('dbo.computo_industrial', 'marca') IS NULL ALTER TABLE dbo.computo_industrial ADD marca NVARCHAR(100) NULL;
IF COL_LENGTH('dbo.computo_industrial', 'modelo') IS NULL ALTER TABLE dbo.computo_industrial ADD modelo NVARCHAR(100) NULL;
IF COL_LENGTH('dbo.computo_industrial', 'responsiva') IS NULL ALTER TABLE dbo.computo_industrial ADD responsiva NVARCHAR(500) NULL;
GO
IF COL_LENGTH('dbo.monitores', 'sistema_operativo') IS NULL ALTER TABLE dbo.monitores ADD sistema_operativo NVARCHAR(100) NULL;
IF COL_LENGTH('dbo.monitores', 'procesador') IS NULL ALTER TABLE dbo.monitores ADD procesador NVARCHAR(150) NULL;
IF COL_LENGTH('dbo.monitores', 'hd') IS NULL ALTER TABLE dbo.monitores ADD hd NVARCHAR(50) NULL;
IF COL_LENGTH('dbo.monitores', 'ram') IS NULL ALTER TABLE dbo.monitores ADD ram NVARCHAR(50) NULL;
IF COL_LENGTH('dbo.monitores', 'adaptador_cargador') IS NULL ALTER TABLE dbo.monitores ADD adaptador_cargador NVARCHAR(150) NULL;
IF COL_LENGTH('dbo.monitores', 'responsiva') IS NULL ALTER TABLE dbo.monitores ADD responsiva NVARCHAR(500) NULL;
GO
IF COL_LENGTH('dbo.proyectores', 'sistema_operativo') IS NULL ALTER TABLE dbo.proyectores ADD sistema_operativo NVARCHAR(100) NULL;
IF COL_LENGTH('dbo.proyectores', 'procesador') IS NULL ALTER TABLE dbo.proyectores ADD procesador NVARCHAR(150) NULL;
IF COL_LENGTH('dbo.proyectores', 'hd') IS NULL ALTER TABLE dbo.proyectores ADD hd NVARCHAR(50) NULL;
IF COL_LENGTH('dbo.proyectores', 'ram') IS NULL ALTER TABLE dbo.proyectores ADD ram NVARCHAR(50) NULL;
IF COL_LENGTH('dbo.proyectores', 'adaptador_cargador') IS NULL ALTER TABLE dbo.proyectores ADD adaptador_cargador NVARCHAR(150) NULL;
IF COL_LENGTH('dbo.proyectores', 'responsiva') IS NULL ALTER TABLE dbo.proyectores ADD responsiva NVARCHAR(500) NULL;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'uq_compadm_serie')
    CREATE UNIQUE INDEX uq_compadm_serie ON dbo.computo_administrativo (region_id, numero_serie)
        WHERE deleted_at IS NULL AND numero_serie IS NOT NULL;
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'uq_compind_serie')
    CREATE UNIQUE INDEX uq_compind_serie ON dbo.computo_industrial (region_id, numero_serie)
        WHERE deleted_at IS NULL AND numero_serie IS NOT NULL;
GO

IF OBJECT_ID('dbo.usuario_regiones', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.usuario_regiones (
        usuario_id  INT NOT NULL,
        region_id   INT NOT NULL,
        CONSTRAINT pk_usuario_regiones PRIMARY KEY (usuario_id, region_id),
        CONSTRAINT fk_usureg_usuario FOREIGN KEY (usuario_id) REFERENCES dbo.usuarios (id) ON DELETE CASCADE,
        CONSTRAINT fk_usureg_region  FOREIGN KEY (region_id)  REFERENCES dbo.regiones (id)
    );
END
GO

PRINT 'Migración v5 aplicada.';
GO
