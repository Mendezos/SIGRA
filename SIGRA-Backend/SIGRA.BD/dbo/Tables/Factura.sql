CREATE TABLE [dbo].[Factura] (
    [IdFactura]         INT             IDENTITY (1, 1) NOT NULL,
    [NumeroFactura]     VARCHAR (30)    NOT NULL,
    [Tipo]              VARCHAR (15)    NOT NULL,
    [IdCliente]         INT             NOT NULL,
    [IdContrato]        INT             NULL,
    [IdTicket]          INT             NULL,
    [IdVendedor]        INT             NULL,
    [Fecha]             DATE            CONSTRAINT [DF_Factura_Fecha] DEFAULT (CONVERT([date],getdate())) NOT NULL,
    [FechaVencimientoPago] DATE         NULL,
    [Moneda]            CHAR (3)        CONSTRAINT [DF_Factura_Moneda] DEFAULT ('CRC') NOT NULL,
    [Subtotal]          DECIMAL (14, 2) NOT NULL,
    [Impuesto]          DECIMAL (14, 2) CONSTRAINT [DF_Factura_Impuesto] DEFAULT ((0)) NOT NULL,
    [Total]             DECIMAL (14, 2) NOT NULL,
    [Estado]            VARCHAR (15)    CONSTRAINT [DF_Factura_Estado] DEFAULT ('Emitida') NOT NULL,
    [EstadoCobro]       VARCHAR (15)    CONSTRAINT [DF_Factura_EstadoCobro] DEFAULT ('Pendiente') NOT NULL,
    [IncluyeBaterias]   BIT             CONSTRAINT [DF_Factura_IncluyeBaterias] DEFAULT ((0)) NOT NULL,
    [Observaciones]     VARCHAR (1000)  NULL,
    [MotivoAnulacion]   VARCHAR (300)   NULL,
    [IdUsuarioRegistra] INT             NULL,
    [FechaRegistro]     DATETIME2 (0)   CONSTRAINT [DF_Factura_FechaRegistro] DEFAULT (sysutcdatetime()) NOT NULL,
    CONSTRAINT [PK_Factura] PRIMARY KEY CLUSTERED ([IdFactura] ASC),
    CONSTRAINT [UQ_Factura_Numero] UNIQUE NONCLUSTERED ([NumeroFactura] ASC),
    CONSTRAINT [CK_Factura_Tipo] CHECK ([Tipo] IN ('Venta', 'Servicio', 'Alquiler')),
    CONSTRAINT [CK_Factura_Moneda] CHECK ([Moneda] IN ('CRC', 'USD')),
    CONSTRAINT [CK_Factura_Montos] CHECK ([Subtotal] >= 0 AND [Impuesto] >= 0 AND [Total] >= 0),
    CONSTRAINT [CK_Factura_Estado] CHECK ([Estado] IN ('Emitida', 'Anulada')),
    CONSTRAINT [CK_Factura_EstadoCobro] CHECK ([EstadoCobro] IN ('Pendiente', 'Parcial', 'Pagada', 'Vencida')),
    CONSTRAINT [FK_Factura_Cliente] FOREIGN KEY ([IdCliente]) REFERENCES [dbo].[Cliente] ([IdCliente]),
    CONSTRAINT [FK_Factura_Contrato] FOREIGN KEY ([IdContrato]) REFERENCES [dbo].[Contrato] ([IdContrato]),
    CONSTRAINT [FK_Factura_Ticket] FOREIGN KEY ([IdTicket]) REFERENCES [dbo].[Ticket] ([IdTicket]),
    CONSTRAINT [FK_Factura_Vendedor] FOREIGN KEY ([IdVendedor]) REFERENCES [dbo].[Usuario] ([IdUsuario]),
    CONSTRAINT [FK_Factura_UsuarioRegistra] FOREIGN KEY ([IdUsuarioRegistra]) REFERENCES [dbo].[Usuario] ([IdUsuario])
);


GO
CREATE NONCLUSTERED INDEX [IX_Factura_Cliente]
    ON [dbo].[Factura]([IdCliente] ASC, [Fecha] DESC);


GO
CREATE NONCLUSTERED INDEX [IX_Factura_Contrato]
    ON [dbo].[Factura]([IdContrato] ASC) WHERE [IdContrato] IS NOT NULL;


GO
CREATE NONCLUSTERED INDEX [IX_Factura_EstadoCobro]
    ON [dbo].[Factura]([EstadoCobro] ASC, [Fecha] DESC);
