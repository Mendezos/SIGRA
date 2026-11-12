CREATE TABLE [dbo].[PlantillaContrato] (
    [IdPlantilla]    INT           IDENTITY (1, 1) NOT NULL,
    [Nombre]         VARCHAR (120) NOT NULL,
    [IdCategoria]    INT           NULL,
    [Activa]         BIT           CONSTRAINT [DF_PlantillaContrato_Activa] DEFAULT ((1)) NOT NULL,
    [VersionActual]  INT           CONSTRAINT [DF_PlantillaContrato_Version] DEFAULT ((1)) NOT NULL,
    [FechaCreacion]  DATETIME2     CONSTRAINT [DF_PlantillaContrato_Fecha] DEFAULT (SYSUTCDATETIME()) NOT NULL,
    [IdUsuario]      INT           NOT NULL,
    CONSTRAINT [PK_PlantillaContrato] PRIMARY KEY CLUSTERED ([IdPlantilla] ASC),
    CONSTRAINT [FK_PlantillaContrato_Categoria] FOREIGN KEY ([IdCategoria]) REFERENCES [dbo].[CategoriaEquipo] ([IdCategoria]),
    CONSTRAINT [FK_PlantillaContrato_Usuario] FOREIGN KEY ([IdUsuario]) REFERENCES [dbo].[Usuario] ([IdUsuario])
);


GO
-- Solo puede haber una plantilla activa con un mismo nombre.
CREATE UNIQUE NONCLUSTERED INDEX [UQ_PlantillaContrato_NombreActiva]
    ON [dbo].[PlantillaContrato]([Nombre] ASC) WHERE [Activa] = 1;
