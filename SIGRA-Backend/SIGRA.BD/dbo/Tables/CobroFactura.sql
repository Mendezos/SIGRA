CREATE TABLE [dbo].[CobroFactura] (
    [IdCobro]       INT             IDENTITY (1, 1) NOT NULL,
    [IdFactura]     INT             NOT NULL,
    [EstadoCobro]   VARCHAR (15)    NOT NULL,
    [Monto]         DECIMAL (14, 2) NULL,
    [FechaCobro]    DATE            CONSTRAINT [DF_CobroFactura_FechaCobro] DEFAULT (CONVERT([date],getdate())) NOT NULL,
    [MedioPago]     VARCHAR (30)    NULL,
    [Referencia]    VARCHAR (100)   NULL,
    [Observacion]   VARCHAR (500)   NULL,
    [IdUsuario]     INT             NULL,
    [FechaRegistro] DATETIME2 (0)   CONSTRAINT [DF_CobroFactura_FechaRegistro] DEFAULT (sysutcdatetime()) NOT NULL,
    CONSTRAINT [PK_CobroFactura] PRIMARY KEY CLUSTERED ([IdCobro] ASC),
    CONSTRAINT [CK_CobroFactura_Estado] CHECK ([EstadoCobro] IN ('Pendiente', 'Parcial', 'Pagada', 'Vencida')),
    CONSTRAINT [CK_CobroFactura_Monto] CHECK ([Monto] IS NULL OR [Monto] >= 0),
    CONSTRAINT [FK_CobroFactura_Factura] FOREIGN KEY ([IdFactura]) REFERENCES [dbo].[Factura] ([IdFactura]),
    CONSTRAINT [FK_CobroFactura_Usuario] FOREIGN KEY ([IdUsuario]) REFERENCES [dbo].[Usuario] ([IdUsuario])
);


GO
CREATE NONCLUSTERED INDEX [IX_CobroFactura_Factura]
    ON [dbo].[CobroFactura]([IdFactura] ASC, [FechaRegistro] DESC);
