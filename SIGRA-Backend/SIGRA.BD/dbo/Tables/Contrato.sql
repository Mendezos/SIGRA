CREATE TABLE [dbo].[Contrato] (
    [IdContrato]       INT             IDENTITY (1, 1) NOT NULL,
    [IdCliente]        INT             NOT NULL,
    [Estado]           VARCHAR (30)    CONSTRAINT [DF_Contrato_Estado] DEFAULT ('Activo') NOT NULL,
    [FechaInicio]      DATE            NOT NULL,
    [FechaVencimiento] DATE            NOT NULL,
    [MontoMensual]     DECIMAL (12, 2) NOT NULL,
    [Condiciones]      VARCHAR (MAX)   NULL,
    [IdVendedor]       INT             NULL,
    CONSTRAINT [PK_Contrato] PRIMARY KEY CLUSTERED ([IdContrato] ASC),
    CONSTRAINT [CK_Contrato_Fechas] CHECK ([FechaVencimiento]>[FechaInicio]),
    CONSTRAINT [CK_Contrato_Monto] CHECK ([MontoMensual]>=(0)),
    CONSTRAINT [FK_Contrato_Vendedor] FOREIGN KEY ([IdVendedor]) REFERENCES [dbo].[Usuario] ([IdUsuario]),
    CONSTRAINT [FK_Contrato_Cliente] FOREIGN KEY ([IdCliente]) REFERENCES [dbo].[Cliente] ([IdCliente])
);


GO
CREATE NONCLUSTERED INDEX [IX_Contrato_Estado]
    ON [dbo].[Contrato]([Estado] ASC);


GO
CREATE NONCLUSTERED INDEX [IX_Contrato_IdCliente]
    ON [dbo].[Contrato]([IdCliente] ASC);

