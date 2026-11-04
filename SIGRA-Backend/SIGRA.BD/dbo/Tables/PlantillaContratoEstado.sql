-- Historial de desactivaciones y reactivaciones de una plantilla, con su motivo.
CREATE TABLE [dbo].[PlantillaContratoEstado] (
    [IdCambio]    INT           IDENTITY (1, 1) NOT NULL,
    [IdPlantilla] INT           NOT NULL,
    [Activa]      BIT           NOT NULL,
    [Motivo]      VARCHAR (300) NULL,
    [IdUsuario]   INT           NOT NULL,
    [Fecha]       DATETIME2     CONSTRAINT [DF_PlantillaContratoEstado_Fecha] DEFAULT (SYSUTCDATETIME()) NOT NULL,
    CONSTRAINT [PK_PlantillaContratoEstado] PRIMARY KEY CLUSTERED ([IdCambio] ASC),
    CONSTRAINT [FK_PlantillaContratoEstado_Plantilla] FOREIGN KEY ([IdPlantilla]) REFERENCES [dbo].[PlantillaContrato] ([IdPlantilla]),
    CONSTRAINT [FK_PlantillaContratoEstado_Usuario] FOREIGN KEY ([IdUsuario]) REFERENCES [dbo].[Usuario] ([IdUsuario])
);
