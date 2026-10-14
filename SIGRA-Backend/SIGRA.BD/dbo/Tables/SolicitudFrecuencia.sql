CREATE TABLE [dbo].[SolicitudFrecuencia] (
    [IdSolicitud]       INT           IDENTITY (1, 1) NOT NULL,
    [IdCliente]         INT           NOT NULL,
    [IdEquipo]          INT           NOT NULL,
    [IdUsuario]         INT           NOT NULL,
    [Estado]            VARCHAR (30)  CONSTRAINT [DF_SolicitudFrecuencia_Estado] DEFAULT ('En solicitud') NOT NULL,
    [FechaSolicitud]    DATE          CONSTRAINT [DF_SolicitudFrecuencia_Fecha] DEFAULT (CONVERT([date],getdate())) NOT NULL,
    [FechaVencimiento]  DATE          NULL,
    [Frecuencia]        VARCHAR (30)  NULL,
    [Banda]             VARCHAR (30)  NULL,
    [Potencia]          VARCHAR (30)  NULL,
    [ZonaCobertura]     VARCHAR (200) NULL,
    [FechaPresentacion] DATE          NULL,
    [FechaOtorgamiento] DATE          NULL,
    [NumeroResolucion]  VARCHAR (100) NULL,
    [IdSolicitudOrigen] INT           NULL,
    [FechaCancelacion]  DATETIME      NULL,
    [MotivoCancelacion] VARCHAR (500) NULL,
    [IdUsuarioCancelacion] INT        NULL,
    CONSTRAINT [PK_SolicitudFrecuencia] PRIMARY KEY CLUSTERED ([IdSolicitud] ASC),
    CONSTRAINT [CK_SolicitudFrecuencia_Fechas] CHECK ([FechaVencimiento] IS NULL OR [FechaVencimiento]>ISNULL([FechaPresentacion],[FechaSolicitud])),
    CONSTRAINT [FK_SolicitudFrecuencia_Cliente] FOREIGN KEY ([IdCliente]) REFERENCES [dbo].[Cliente] ([IdCliente]),
    CONSTRAINT [FK_SolicitudFrecuencia_Equipo] FOREIGN KEY ([IdEquipo]) REFERENCES [dbo].[Equipo] ([IdEquipo]),
    CONSTRAINT [FK_SolicitudFrecuencia_Usuario] FOREIGN KEY ([IdUsuario]) REFERENCES [dbo].[Usuario] ([IdUsuario]),
    CONSTRAINT [FK_SolicitudFrecuencia_Origen] FOREIGN KEY ([IdSolicitudOrigen]) REFERENCES [dbo].[SolicitudFrecuencia] ([IdSolicitud]),
    CONSTRAINT [FK_SolicitudFrecuencia_UsuarioCancelacion] FOREIGN KEY ([IdUsuarioCancelacion]) REFERENCES [dbo].[Usuario] ([IdUsuario]),
    CONSTRAINT [CK_SolicitudFrecuencia_Cancelacion] CHECK ([Estado] <> 'Cancelada' OR ([FechaCancelacion] IS NOT NULL AND [MotivoCancelacion] IS NOT NULL))
);


GO
CREATE NONCLUSTERED INDEX [IX_SolicitudFrecuencia_IdEquipo]
    ON [dbo].[SolicitudFrecuencia]([IdEquipo] ASC);


GO
CREATE NONCLUSTERED INDEX [IX_SolicitudFrecuencia_IdCliente]
    ON [dbo].[SolicitudFrecuencia]([IdCliente] ASC);


GO
CREATE NONCLUSTERED INDEX [IX_SolicitudFrecuencia_IdUsuario]
    ON [dbo].[SolicitudFrecuencia]([IdUsuario] ASC);


GO
CREATE NONCLUSTERED INDEX [IX_SolicitudFrecuencia_IdSolicitudOrigen]
    ON [dbo].[SolicitudFrecuencia]([IdSolicitudOrigen] ASC);


GO
CREATE NONCLUSTERED INDEX [IX_SolicitudFrecuencia_Estado]
    ON [dbo].[SolicitudFrecuencia]([Estado] ASC);


GO
CREATE NONCLUSTERED INDEX [IX_SolicitudFrecuencia_IdCliente_Estado]
    ON [dbo].[SolicitudFrecuencia]([IdCliente] ASC, [Estado] ASC);
