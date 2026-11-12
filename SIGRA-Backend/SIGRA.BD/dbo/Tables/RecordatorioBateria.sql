CREATE TABLE [dbo].[RecordatorioBateria] (
    [IdRecordatorio]      INT            IDENTITY (1, 1) NOT NULL,
    [IdCliente]           INT            NOT NULL,
    [IdContactoEmpresa]   INT            NULL,
    [IdFactura]           INT            NULL,
    [NumeroFactura]       VARCHAR (30)   NULL,
    [IdModelo]            INT            NULL,
    [ModeloBateria]       VARCHAR (150)  NOT NULL,
    [Cantidad]            INT            NOT NULL,
    [FechaCompra]         DATE           NOT NULL,
    [FechaRecordatorio]   DATE           NOT NULL,
    [IdVendedor]          INT            NOT NULL,
    [Estado]              VARCHAR (15)   CONSTRAINT [DF_RecordatorioBateria_Estado] DEFAULT ('Pendiente') NOT NULL,
    [FechaNotificacion]   DATETIME2 (0)  NULL,
    [FechaAtencion]       DATETIME2 (0)  NULL,
    [MedioAtencion]       VARCHAR (20)   NULL,
    [ResultadoAtencion]   VARCHAR (500)  NULL,
    [ObservacionAtencion] VARCHAR (1000) NULL,
    [ProximoPasoAtencion] VARCHAR (500)  NULL,
    [IdUsuarioAtencion]   INT            NULL,
    [IdRecordatorioNuevo] INT            NULL,
    [MotivoCierre]        VARCHAR (300)  NULL,
    [FechaCierre]         DATETIME2 (0)  NULL,
    [FechaCreacion]       DATETIME2 (0)  CONSTRAINT [DF_RecordatorioBateria_Creacion] DEFAULT (sysutcdatetime()) NOT NULL,
    [IdUsuarioCrea]       INT            NULL,
    CONSTRAINT [PK_RecordatorioBateria] PRIMARY KEY CLUSTERED ([IdRecordatorio] ASC),
    CONSTRAINT [CK_RecordatorioBateria_Cantidad] CHECK ([Cantidad] > 0),
    CONSTRAINT [CK_RecordatorioBateria_Fechas] CHECK ([FechaRecordatorio] > [FechaCompra]),
    CONSTRAINT [CK_RecordatorioBateria_Estado] CHECK ([Estado] IN ('Pendiente', 'Notificado', 'Atendido', 'Cerrado')),
    CONSTRAINT [CK_RecordatorioBateria_Medio] CHECK ([MedioAtencion] IS NULL OR [MedioAtencion] IN ('Llamada', 'Correo', 'Visita', 'WhatsApp', 'Otro')),
    CONSTRAINT [FK_RecordatorioBateria_Cliente] FOREIGN KEY ([IdCliente]) REFERENCES [dbo].[Cliente] ([IdCliente]),
    CONSTRAINT [FK_RecordatorioBateria_Contacto] FOREIGN KEY ([IdContactoEmpresa]) REFERENCES [dbo].[ContactoEmpresa] ([IdContactoEmpresa]),
    CONSTRAINT [FK_RecordatorioBateria_Factura] FOREIGN KEY ([IdFactura]) REFERENCES [dbo].[Factura] ([IdFactura]),
    CONSTRAINT [FK_RecordatorioBateria_Modelo] FOREIGN KEY ([IdModelo]) REFERENCES [dbo].[ModeloEquipo] ([IdModelo]),
    CONSTRAINT [FK_RecordatorioBateria_Vendedor] FOREIGN KEY ([IdVendedor]) REFERENCES [dbo].[Usuario] ([IdUsuario]),
    CONSTRAINT [FK_RecordatorioBateria_UsuarioAtencion] FOREIGN KEY ([IdUsuarioAtencion]) REFERENCES [dbo].[Usuario] ([IdUsuario]),
    CONSTRAINT [FK_RecordatorioBateria_Nuevo] FOREIGN KEY ([IdRecordatorioNuevo]) REFERENCES [dbo].[RecordatorioBateria] ([IdRecordatorio]),
    CONSTRAINT [FK_RecordatorioBateria_UsuarioCrea] FOREIGN KEY ([IdUsuarioCrea]) REFERENCES [dbo].[Usuario] ([IdUsuario])
);


GO
CREATE NONCLUSTERED INDEX [IX_RecordatorioBateria_Vendedor]
    ON [dbo].[RecordatorioBateria]([IdVendedor] ASC, [Estado] ASC, [FechaRecordatorio] ASC);


GO
CREATE NONCLUSTERED INDEX [IX_RecordatorioBateria_Cliente]
    ON [dbo].[RecordatorioBateria]([IdCliente] ASC, [Estado] ASC);
