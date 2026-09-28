CREATE TABLE [dbo].[ModeloEquipo] (
    [IdModelo]           INT           IDENTITY (1, 1) NOT NULL,
    [IdCategoria]        INT           NOT NULL,
    [Marca]              VARCHAR (100) NOT NULL,
    [Modelo]             VARCHAR (100) NOT NULL,
    [DescripcionTecnica] VARCHAR (MAX) NULL,
    [Foto]               VARCHAR (300) NULL,
    CONSTRAINT [PK_ModeloEquipo] PRIMARY KEY CLUSTERED ([IdModelo] ASC),
    CONSTRAINT [FK_ModeloEquipo_Categoria] FOREIGN KEY ([IdCategoria]) REFERENCES [dbo].[CategoriaEquipo] ([IdCategoria])
);


GO
CREATE NONCLUSTERED INDEX [IX_ModeloEquipo_IdCategoria]
    ON [dbo].[ModeloEquipo]([IdCategoria] ASC);

