-- Cada edición de una plantilla crea una versión nueva; los contratos conservan la versión con la que se registraron.
CREATE TABLE [dbo].[PlantillaContratoVersion] (
    [IdVersion]              INT           IDENTITY (1, 1) NOT NULL,
    [IdPlantilla]            INT           NOT NULL,
    [Version]                INT           NOT NULL,
    [Clausulas]              VARCHAR (MAX) NOT NULL,
    [Responsabilidades]      VARCHAR (MAX) NOT NULL,
    [CondicionesCancelacion] VARCHAR (MAX) NULL,
    [Motivo]                 VARCHAR (300) NULL,
    [IdUsuario]              INT           NOT NULL,
    [Fecha]                  DATETIME2     CONSTRAINT [DF_PlantillaContratoVersion_Fecha] DEFAULT (SYSUTCDATETIME()) NOT NULL,
    CONSTRAINT [PK_PlantillaContratoVersion] PRIMARY KEY CLUSTERED ([IdVersion] ASC),
    CONSTRAINT [UQ_PlantillaContratoVersion] UNIQUE ([IdPlantilla], [Version]),
    CONSTRAINT [FK_PlantillaContratoVersion_Plantilla] FOREIGN KEY ([IdPlantilla]) REFERENCES [dbo].[PlantillaContrato] ([IdPlantilla]),
    CONSTRAINT [FK_PlantillaContratoVersion_Usuario] FOREIGN KEY ([IdUsuario]) REFERENCES [dbo].[Usuario] ([IdUsuario])
);
