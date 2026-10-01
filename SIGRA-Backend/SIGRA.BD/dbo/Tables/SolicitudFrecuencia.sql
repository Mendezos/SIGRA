CREATE TABLE [dbo].[SolicitudFrecuencia] (
    [IdSolicitud]      INT          IDENTITY (1, 1) NOT NULL,
    [IdCliente]        INT          NOT NULL,
    [IdEquipo]         INT          NOT NULL,
    [IdUsuario]        INT          NOT NULL,
    [Estado]           VARCHAR (30) CONSTRAINT [DF_SolicitudFrecuencia_Estado] DEFAULT ('Pendiente') NOT NULL,
    [FechaSolicitud]   DATE         CONSTRAINT [DF_SolicitudFrecuencia_Fecha] DEFAULT (CONVERT([date],getdate())) NOT NULL,
    [FechaVencimiento] DATE         NULL,
    CONSTRAINT [PK_SolicitudFrecuencia] PRIMARY KEY CLUSTERED ([IdSolicitud] ASC),
    CONSTRAINT [CK_SolicitudFrecuencia_Fechas] CHECK ([FechaVencimiento] IS NULL OR [FechaVencimiento]>[FechaSolicitud]),
    CONSTRAINT [CK_SolicitudFrecuencia_Estado] CHECK ([Estado] IN ('Pendiente', 'Aprobada', 'Rechazada', 'Vencida')),
    CONSTRAINT [FK_SolicitudFrecuencia_Cliente] FOREIGN KEY ([IdCliente]) REFERENCES [dbo].[Cliente] ([IdCliente]),
    CONSTRAINT [FK_SolicitudFrecuencia_Equipo] FOREIGN KEY ([IdEquipo]) REFERENCES [dbo].[Equipo] ([IdEquipo]),
    CONSTRAINT [FK_SolicitudFrecuencia_Usuario] FOREIGN KEY ([IdUsuario]) REFERENCES [dbo].[Usuario] ([IdUsuario])
);


GO
CREATE NONCLUSTERED INDEX [IX_SolicitudFrecuencia_IdEquipo]
    ON [dbo].[SolicitudFrecuencia]([IdEquipo] ASC);


GO
CREATE NONCLUSTERED INDEX [IX_SolicitudFrecuencia_IdCliente]
    ON [dbo].[SolicitudFrecuencia]([IdCliente] ASC);

