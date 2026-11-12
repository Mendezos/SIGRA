CREATE TABLE [dbo].[PlantillaContrato] (
    [IdPlantilla]          INT           IDENTITY (1, 1) NOT NULL,
    [Nombre]               VARCHAR (150) NOT NULL,
    [Descripcion]          VARCHAR (500) NULL,
    [Contenido]            VARCHAR (MAX) NOT NULL,
    [Activa]               BIT           CONSTRAINT [DF_PlantillaContrato_Activa] DEFAULT ((1)) NOT NULL,
    [MotivoDesactivacion]  VARCHAR (300) NULL,
    [FechaCreacion]        DATETIME2 (0) CONSTRAINT [DF_PlantillaContrato_Creacion] DEFAULT (sysutcdatetime()) NOT NULL,
    [IdUsuarioCrea]        INT           NULL,
    [FechaActualizacion]   DATETIME2 (0) NULL,
    [IdUsuarioActualiza]   INT           NULL,
    CONSTRAINT [PK_PlantillaContrato] PRIMARY KEY CLUSTERED ([IdPlantilla] ASC),
    CONSTRAINT [UQ_PlantillaContrato_Nombre] UNIQUE NONCLUSTERED ([Nombre] ASC),
    CONSTRAINT [FK_PlantillaContrato_UsuarioCrea] FOREIGN KEY ([IdUsuarioCrea]) REFERENCES [dbo].[Usuario] ([IdUsuario]),
    CONSTRAINT [FK_PlantillaContrato_UsuarioActualiza] FOREIGN KEY ([IdUsuarioActualiza]) REFERENCES [dbo].[Usuario] ([IdUsuario])
);
