CREATE TABLE [dbo].[Cotizacion] (
    [IdCotizacion]        INT             IDENTITY (1, 1) NOT NULL,
    [IdProspecto]         INT             NULL,
    [Fecha]               DATE            CONSTRAINT [DF_Cotizacion_Fecha] DEFAULT (CONVERT([date],getdate())) NOT NULL,
    [Monto]               DECIMAL (12, 2) NOT NULL,
    [Estado]              VARCHAR (30)    CONSTRAINT [DF_Cotizacion_Estado] DEFAULT ('Borrador') NOT NULL,
    [IdCliente]           INT             NULL,
    [IdVendedor]          INT             NULL,
    [Moneda]              CHAR (3)        CONSTRAINT [DF_Cotizacion_Moneda] DEFAULT ('CRC') NOT NULL,
    [FechaVigencia]       DATE            NULL,
    [Observaciones]       VARCHAR (1000)  NULL,
    [Version]             INT             CONSTRAINT [DF_Cotizacion_Version] DEFAULT ((1)) NOT NULL,
    [IdCotizacionOrigen]  INT             NULL,
    [FechaEnvio]          DATE            NULL,
    [FechaRespuesta]      DATE            NULL,
    [MotivoRechazo]       VARCHAR (300)   NULL,
    [MotivoInactivacion]  VARCHAR (300)   NULL,
    [FechaCreacion]       DATETIME2 (0)   CONSTRAINT [DF_Cotizacion_FechaCreacion] DEFAULT (sysutcdatetime()) NOT NULL,
    [IdUsuarioCrea]       INT             NULL,
    CONSTRAINT [PK_Cotizacion] PRIMARY KEY CLUSTERED ([IdCotizacion] ASC),
    CONSTRAINT [CK_Cotizacion_Monto] CHECK ([Monto]>=(0)),
    CONSTRAINT [CK_Cotizacion_Estado] CHECK ([Estado] IN ('Borrador', 'Enviada', 'En negociación', 'Aceptada', 'Rechazada', 'Inactiva')),
    CONSTRAINT [CK_Cotizacion_Moneda] CHECK ([Moneda] IN ('CRC', 'USD')),
    CONSTRAINT [CK_Cotizacion_Empresa] CHECK (([IdProspecto] IS NOT NULL AND [IdCliente] IS NULL) OR ([IdProspecto] IS NULL AND [IdCliente] IS NOT NULL)),
    CONSTRAINT [FK_Cotizacion_Prospecto] FOREIGN KEY ([IdProspecto]) REFERENCES [dbo].[Prospecto] ([IdProspecto]),
    CONSTRAINT [FK_Cotizacion_Cliente] FOREIGN KEY ([IdCliente]) REFERENCES [dbo].[Cliente] ([IdCliente]),
    CONSTRAINT [FK_Cotizacion_Vendedor] FOREIGN KEY ([IdVendedor]) REFERENCES [dbo].[Usuario] ([IdUsuario]),
    CONSTRAINT [FK_Cotizacion_Origen] FOREIGN KEY ([IdCotizacionOrigen]) REFERENCES [dbo].[Cotizacion] ([IdCotizacion]),
    CONSTRAINT [FK_Cotizacion_UsuarioCrea] FOREIGN KEY ([IdUsuarioCrea]) REFERENCES [dbo].[Usuario] ([IdUsuario])
);


GO
CREATE NONCLUSTERED INDEX [IX_Cotizacion_IdProspecto]
    ON [dbo].[Cotizacion]([IdProspecto] ASC);

