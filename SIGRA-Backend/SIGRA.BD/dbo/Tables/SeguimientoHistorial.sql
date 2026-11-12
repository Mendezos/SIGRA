CREATE TABLE [dbo].[SeguimientoHistorial] (
    [IdHistorial]       INT           IDENTITY (1, 1) NOT NULL,
    [IdSeguimiento]     INT           NOT NULL,
    [Accion]            VARCHAR (20)  NOT NULL,
    [FechaHoraAnterior] DATETIME2 (0) NULL,
    [FechaHoraNueva]    DATETIME2 (0) NULL,
    [Motivo]            VARCHAR (500) NULL,
    [IdUsuario]         INT           NULL,
    [Fecha]             DATETIME2 (0) CONSTRAINT [DF_SeguimientoHistorial_Fecha] DEFAULT (sysutcdatetime()) NOT NULL,
    CONSTRAINT [PK_SeguimientoHistorial] PRIMARY KEY CLUSTERED ([IdHistorial] ASC),
    CONSTRAINT [CK_SeguimientoHistorial_Accion] CHECK ([Accion] IN ('Creado', 'Reprogramado', 'Completado', 'Cancelado', 'Reasignado')),
    CONSTRAINT [FK_SeguimientoHistorial_Seguimiento] FOREIGN KEY ([IdSeguimiento]) REFERENCES [dbo].[SeguimientoCRM] ([IdSeguimiento]),
    CONSTRAINT [FK_SeguimientoHistorial_Usuario] FOREIGN KEY ([IdUsuario]) REFERENCES [dbo].[Usuario] ([IdUsuario])
);


GO
CREATE NONCLUSTERED INDEX [IX_SeguimientoHistorial_Seguimiento]
    ON [dbo].[SeguimientoHistorial]([IdSeguimiento] ASC, [Fecha] ASC);
