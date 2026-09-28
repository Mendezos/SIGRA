CREATE TABLE [dbo].[StockMinimoCategoria] (
    [IdCategoria]    INT NOT NULL,
    [CantidadMinima] INT CONSTRAINT [DF_StockMinimoCategoria_Cantidad] DEFAULT ((0)) NOT NULL,
    CONSTRAINT [PK_StockMinimoCategoria] PRIMARY KEY CLUSTERED ([IdCategoria] ASC),
    CONSTRAINT [CK_StockMinimoCategoria_Cantidad] CHECK ([CantidadMinima]>=(0)),
    CONSTRAINT [FK_StockMinimoCategoria_Categoria] FOREIGN KEY ([IdCategoria]) REFERENCES [dbo].[CategoriaEquipo] ([IdCategoria])
);

