CREATE TABLE [dbo].[FacturaLinea] (
    [IdLinea]        INT             IDENTITY (1, 1) NOT NULL,
    [IdFactura]      INT             NOT NULL,
    [Descripcion]    VARCHAR (300)   NOT NULL,
    [IdModelo]       INT             NULL,
    [EsBateria]      BIT             CONSTRAINT [DF_FacturaLinea_EsBateria] DEFAULT ((0)) NOT NULL,
    [Cantidad]       DECIMAL (12, 2) NOT NULL,
    [PrecioUnitario] DECIMAL (14, 2) NOT NULL,
    CONSTRAINT [PK_FacturaLinea] PRIMARY KEY CLUSTERED ([IdLinea] ASC),
    CONSTRAINT [CK_FacturaLinea_Cantidad] CHECK ([Cantidad] > 0),
    CONSTRAINT [CK_FacturaLinea_Precio] CHECK ([PrecioUnitario] >= 0),
    CONSTRAINT [FK_FacturaLinea_Factura] FOREIGN KEY ([IdFactura]) REFERENCES [dbo].[Factura] ([IdFactura]),
    CONSTRAINT [FK_FacturaLinea_Modelo] FOREIGN KEY ([IdModelo]) REFERENCES [dbo].[ModeloEquipo] ([IdModelo])
);


GO
CREATE NONCLUSTERED INDEX [IX_FacturaLinea_Factura]
    ON [dbo].[FacturaLinea]([IdFactura] ASC);
