CREATE TABLE [dbo].[CotizacionLinea] (
    [IdLinea]        INT             IDENTITY (1, 1) NOT NULL,
    [IdCotizacion]   INT             NOT NULL,
    [Descripcion]    VARCHAR (300)   NOT NULL,
    [IdModelo]       INT             NULL,
    [Cantidad]       DECIMAL (12, 2) NOT NULL,
    [PrecioUnitario] DECIMAL (14, 2) NOT NULL,
    CONSTRAINT [PK_CotizacionLinea] PRIMARY KEY CLUSTERED ([IdLinea] ASC),
    CONSTRAINT [CK_CotizacionLinea_Cantidad] CHECK ([Cantidad] > 0),
    CONSTRAINT [CK_CotizacionLinea_Precio] CHECK ([PrecioUnitario] >= 0),
    CONSTRAINT [FK_CotizacionLinea_Cotizacion] FOREIGN KEY ([IdCotizacion]) REFERENCES [dbo].[Cotizacion] ([IdCotizacion]),
    CONSTRAINT [FK_CotizacionLinea_Modelo] FOREIGN KEY ([IdModelo]) REFERENCES [dbo].[ModeloEquipo] ([IdModelo])
);


GO
CREATE NONCLUSTERED INDEX [IX_CotizacionLinea_Cotizacion]
    ON [dbo].[CotizacionLinea]([IdCotizacion] ASC);
