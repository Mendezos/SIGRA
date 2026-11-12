CREATE TABLE [dbo].[CotizacionHistorial] (
    [IdHistorial]    INT           IDENTITY (1, 1) NOT NULL,
    [IdCotizacion]   INT           NOT NULL,
    [Accion]         VARCHAR (30)  NOT NULL,
    [EstadoAnterior] VARCHAR (20)  NULL,
    [EstadoNuevo]    VARCHAR (20)  NULL,
    [Detalle]        VARCHAR (MAX) NULL,
    [IdUsuario]      INT           NULL,
    [Fecha]          DATETIME2 (0) CONSTRAINT [DF_CotizacionHistorial_Fecha] DEFAULT (sysutcdatetime()) NOT NULL,
    CONSTRAINT [PK_CotizacionHistorial] PRIMARY KEY CLUSTERED ([IdHistorial] ASC),
    CONSTRAINT [FK_CotizacionHistorial_Cotizacion] FOREIGN KEY ([IdCotizacion]) REFERENCES [dbo].[Cotizacion] ([IdCotizacion]),
    CONSTRAINT [FK_CotizacionHistorial_Usuario] FOREIGN KEY ([IdUsuario]) REFERENCES [dbo].[Usuario] ([IdUsuario])
);


GO
CREATE NONCLUSTERED INDEX [IX_CotizacionHistorial_Cotizacion]
    ON [dbo].[CotizacionHistorial]([IdCotizacion] ASC, [Fecha] ASC);
