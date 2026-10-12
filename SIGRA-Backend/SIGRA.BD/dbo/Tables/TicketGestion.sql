CREATE TABLE [dbo].[TicketGestion] (
    [IdTicket] INT NOT NULL,
    [NumeroBoleta] BIGINT NOT NULL,
    [Solicitud] UNIQUEIDENTIFIER NOT NULL,
    [Empresa] NVARCHAR(150) NOT NULL,
    [Contacto] NVARCHAR(150) NOT NULL,
    [Telefono] NVARCHAR(20) NOT NULL,
    [Correo] NVARCHAR(150) NULL,
    [Cargo] NVARCHAR(100) NULL,
    [IdUsuarioRegistro] INT NOT NULL,
    [IdTecnicoAsignado] INT NULL,
    [IdTecnicoCierre] INT NULL,
    [FechaRecepcionFisica] DATETIME2 NULL,
    [FechaAsignacion] DATETIME2 NULL,
    [FechaInicio] DATETIME2 NULL,
    [FechaCierre] DATETIME2 NULL,
    [FechaEstimada] DATETIME2 NULL,
    [EstadoAsignacion] NVARCHAR(50) NULL,
    [Motivo] NVARCHAR(500) NULL,
    [FacturaEmitida] BIT CONSTRAINT [DF_TicketGestion_Factura] DEFAULT (0) NOT NULL,
    [TrabajoJson] NVARCHAR(MAX) CONSTRAINT [DF_TicketGestion_Trabajo] DEFAULT (N'{}') NOT NULL,
    [ComprobanteOriginal] NVARCHAR(MAX) NULL,
    [Version] ROWVERSION NOT NULL,
    CONSTRAINT [PK_TicketGestion] PRIMARY KEY ([IdTicket]),
    CONSTRAINT [UQ_TicketGestion_Numero] UNIQUE ([NumeroBoleta]),
    CONSTRAINT [UQ_TicketGestion_Solicitud] UNIQUE ([Solicitud]),
    CONSTRAINT [CK_TicketGestion_Trabajo] CHECK (ISJSON([TrabajoJson]) = 1),
    CONSTRAINT [FK_TicketGestion_Ticket] FOREIGN KEY ([IdTicket]) REFERENCES [dbo].[Ticket] ([IdTicket]),
    CONSTRAINT [FK_TicketGestion_Registro] FOREIGN KEY ([IdUsuarioRegistro]) REFERENCES [dbo].[Usuario] ([IdUsuario]),
    CONSTRAINT [FK_TicketGestion_Tecnico] FOREIGN KEY ([IdTecnicoAsignado]) REFERENCES [dbo].[Usuario] ([IdUsuario]),
    CONSTRAINT [FK_TicketGestion_Cierre] FOREIGN KEY ([IdTecnicoCierre]) REFERENCES [dbo].[Usuario] ([IdUsuario])
);
GO
CREATE INDEX [IX_TicketGestion_Tecnico] ON [dbo].[TicketGestion] ([IdTecnicoAsignado]);
GO
CREATE INDEX [IX_TicketGestion_Cierre] ON [dbo].[TicketGestion] ([FechaCierre], [IdTecnicoCierre]);
