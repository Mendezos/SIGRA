CREATE TABLE [dbo].[RepetidoraDetalle] (
    [IdEquipo]             INT           NOT NULL,
    [Frecuencia]           VARCHAR (30)  NULL,
    [Potencia]             VARCHAR (30)  NULL,
    [DireccionInstalacion] VARCHAR (200) NULL,
    [CoordenadasGPS]       VARCHAR (50)  NULL,
    [TipoPropiedad]        VARCHAR (50)  NULL,
    CONSTRAINT [PK_RepetidoraDetalle] PRIMARY KEY CLUSTERED ([IdEquipo] ASC),
    CONSTRAINT [FK_RepetidoraDetalle_Equipo] FOREIGN KEY ([IdEquipo]) REFERENCES [dbo].[Equipo] ([IdEquipo])
);

