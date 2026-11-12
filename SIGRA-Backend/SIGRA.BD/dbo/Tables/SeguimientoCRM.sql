CREATE TABLE [dbo].[SeguimientoCRM] (
    [IdSeguimiento]     INT            IDENTITY (1, 1) NOT NULL,
    [IdProspecto]       INT            NULL,
    [IdCliente]         INT            NULL,
    [IdContactoEmpresa] INT            NULL,
    [Tipo]              VARCHAR (20)   NOT NULL,
    [FechaHora]         DATETIME2 (0)  NOT NULL,
    [FechaHoraOriginal] DATETIME2 (0)  NOT NULL,
    [Motivo]            VARCHAR (500)  NOT NULL,
    [Prioridad]         VARCHAR (10)   CONSTRAINT [DF_SeguimientoCRM_Prioridad] DEFAULT ('Media') NOT NULL,
    [IdResponsable]     INT            NOT NULL,
    [Estado]            VARCHAR (15)   CONSTRAINT [DF_SeguimientoCRM_Estado] DEFAULT ('Pendiente') NOT NULL,
    [Origen]            VARCHAR (15)   CONSTRAINT [DF_SeguimientoCRM_Origen] DEFAULT ('Manual') NOT NULL,
    [IdSerie]           INT            NULL,
    [IdCotizacion]      INT            NULL,
    [FechaReal]         DATETIME2 (0)  NULL,
    [Resultado]         VARCHAR (500)  NULL,
    [Observaciones]     VARCHAR (1000) NULL,
    [ProximoPaso]       VARCHAR (500)  NULL,
    [MotivoCancelacion] VARCHAR (500)  NULL,
    [FechaCierre]       DATETIME2 (0)  NULL,
    [IdUsuarioCierre]   INT            NULL,
    [IdInteraccion]     INT            NULL,
    [FechaAlerta]       DATETIME2 (0)  NULL,
    [FechaCreacion]     DATETIME2 (0)  CONSTRAINT [DF_SeguimientoCRM_Creacion] DEFAULT (sysutcdatetime()) NOT NULL,
    [IdUsuarioCrea]     INT            NULL,
    CONSTRAINT [PK_SeguimientoCRM] PRIMARY KEY CLUSTERED ([IdSeguimiento] ASC),
    CONSTRAINT [CK_SeguimientoCRM_Empresa] CHECK (([IdProspecto] IS NOT NULL AND [IdCliente] IS NULL) OR ([IdProspecto] IS NULL AND [IdCliente] IS NOT NULL)),
    CONSTRAINT [CK_SeguimientoCRM_Tipo] CHECK ([Tipo] IN ('Llamada', 'Visita', 'Correo', 'Reunión', 'WhatsApp', 'Otro')),
    CONSTRAINT [CK_SeguimientoCRM_Prioridad] CHECK ([Prioridad] IN ('Baja', 'Media', 'Alta')),
    CONSTRAINT [CK_SeguimientoCRM_Estado] CHECK ([Estado] IN ('Pendiente', 'Atrasado', 'Completado', 'Cancelado')),
    CONSTRAINT [CK_SeguimientoCRM_Origen] CHECK ([Origen] IN ('Manual', 'Cotización', 'Prospecto', 'Serie', 'Batería')),
    CONSTRAINT [FK_SeguimientoCRM_Prospecto] FOREIGN KEY ([IdProspecto]) REFERENCES [dbo].[Prospecto] ([IdProspecto]),
    CONSTRAINT [FK_SeguimientoCRM_Cliente] FOREIGN KEY ([IdCliente]) REFERENCES [dbo].[Cliente] ([IdCliente]),
    CONSTRAINT [FK_SeguimientoCRM_Contacto] FOREIGN KEY ([IdContactoEmpresa]) REFERENCES [dbo].[ContactoEmpresa] ([IdContactoEmpresa]),
    CONSTRAINT [FK_SeguimientoCRM_Responsable] FOREIGN KEY ([IdResponsable]) REFERENCES [dbo].[Usuario] ([IdUsuario]),
    CONSTRAINT [FK_SeguimientoCRM_Serie] FOREIGN KEY ([IdSerie]) REFERENCES [dbo].[SerieContactoCRM] ([IdSerie]),
    CONSTRAINT [FK_SeguimientoCRM_Cotizacion] FOREIGN KEY ([IdCotizacion]) REFERENCES [dbo].[Cotizacion] ([IdCotizacion]),
    CONSTRAINT [FK_SeguimientoCRM_Interaccion] FOREIGN KEY ([IdInteraccion]) REFERENCES [dbo].[InteraccionCRM] ([IdInteraccion]),
    CONSTRAINT [FK_SeguimientoCRM_UsuarioCierre] FOREIGN KEY ([IdUsuarioCierre]) REFERENCES [dbo].[Usuario] ([IdUsuario]),
    CONSTRAINT [FK_SeguimientoCRM_UsuarioCrea] FOREIGN KEY ([IdUsuarioCrea]) REFERENCES [dbo].[Usuario] ([IdUsuario])
);


GO
CREATE NONCLUSTERED INDEX [IX_SeguimientoCRM_Agenda]
    ON [dbo].[SeguimientoCRM]([IdResponsable] ASC, [Estado] ASC, [FechaHora] ASC);


GO
CREATE NONCLUSTERED INDEX [IX_SeguimientoCRM_Prospecto]
    ON [dbo].[SeguimientoCRM]([IdProspecto] ASC, [FechaHora] ASC) WHERE [IdProspecto] IS NOT NULL;


GO
CREATE NONCLUSTERED INDEX [IX_SeguimientoCRM_Cliente]
    ON [dbo].[SeguimientoCRM]([IdCliente] ASC, [FechaHora] ASC) WHERE [IdCliente] IS NOT NULL;


GO
CREATE NONCLUSTERED INDEX [IX_SeguimientoCRM_Serie]
    ON [dbo].[SeguimientoCRM]([IdSerie] ASC, [FechaHora] ASC) WHERE [IdSerie] IS NOT NULL;
