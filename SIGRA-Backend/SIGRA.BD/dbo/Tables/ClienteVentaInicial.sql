-- Venta con la que un prospecto pasó a ser cliente (CRMGPSC-019).
CREATE TABLE [dbo].[ClienteVentaInicial] (
    [IdVentaInicial] INT             IDENTITY (1, 1) NOT NULL,
    [IdCliente]      INT             NOT NULL,
    [IdProspecto]    INT             NULL,
    [Producto]       VARCHAR (200)   NOT NULL,
    [Cantidad]       INT             NOT NULL,
    [Monto]          DECIMAL (14, 2) NOT NULL,
    [Moneda]         CHAR (3)        NOT NULL,
    [Fecha]          DATE            NOT NULL,
    [IdUsuario]      INT             NOT NULL,
    [FechaRegistro]  DATETIME2 (0)   CONSTRAINT [DF_ClienteVentaInicial_FechaRegistro] DEFAULT (sysutcdatetime()) NOT NULL,
    CONSTRAINT [PK_ClienteVentaInicial] PRIMARY KEY CLUSTERED ([IdVentaInicial] ASC),
    CONSTRAINT [CK_ClienteVentaInicial_Cantidad] CHECK ([Cantidad] > 0),
    CONSTRAINT [CK_ClienteVentaInicial_Monto] CHECK ([Monto] > 0),
    CONSTRAINT [CK_ClienteVentaInicial_Moneda] CHECK ([Moneda] IN ('CRC', 'USD')),
    CONSTRAINT [FK_ClienteVentaInicial_Cliente] FOREIGN KEY ([IdCliente]) REFERENCES [dbo].[Cliente] ([IdCliente]),
    CONSTRAINT [FK_ClienteVentaInicial_Prospecto] FOREIGN KEY ([IdProspecto]) REFERENCES [dbo].[Prospecto] ([IdProspecto]),
    CONSTRAINT [FK_ClienteVentaInicial_Usuario] FOREIGN KEY ([IdUsuario]) REFERENCES [dbo].[Usuario] ([IdUsuario])
);
