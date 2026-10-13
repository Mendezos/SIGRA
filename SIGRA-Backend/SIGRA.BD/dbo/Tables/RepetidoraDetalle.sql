CREATE TABLE [dbo].[RepetidoraDetalle] (
    [IdEquipo]             INT           NOT NULL,
    [Frecuencia]           VARCHAR (30)  NULL,
    [Potencia]             VARCHAR (30)  NULL,
    [DireccionInstalacion] VARCHAR (200) NULL,
    [CoordenadasGPS]       VARCHAR (50)  NULL,
    [TipoPropiedad]        VARCHAR (50)  NULL,
    [FrecuenciaRecepcion]  VARCHAR (30)  NULL,
    [Accesorios]           VARCHAR (500) NULL,
    [FechaRegistro]        DATETIME      CONSTRAINT [DF_RepetidoraDetalle_FechaRegistro] DEFAULT (getdate()) NOT NULL,
    [IdUsuarioRegistro]    INT           NULL,
    [Clasificacion]        VARCHAR (30)  NULL,
    [Facturable]           AS (CONVERT([bit], CASE WHEN [Clasificacion] = 'Alquilada por Radifax' THEN 1 WHEN [Clasificacion] = 'Propia del cliente' THEN 0 END)) PERSISTED,
    CONSTRAINT [PK_RepetidoraDetalle] PRIMARY KEY CLUSTERED ([IdEquipo] ASC),
    CONSTRAINT [FK_RepetidoraDetalle_Equipo] FOREIGN KEY ([IdEquipo]) REFERENCES [dbo].[Equipo] ([IdEquipo]),
    CONSTRAINT [FK_RepetidoraDetalle_Usuario] FOREIGN KEY ([IdUsuarioRegistro]) REFERENCES [dbo].[Usuario] ([IdUsuario]),
    CONSTRAINT [CK_RepetidoraDetalle_Clasificacion] CHECK ([Clasificacion] IS NULL OR [Clasificacion] IN ('Alquilada por Radifax', 'Propia del cliente'))
);
