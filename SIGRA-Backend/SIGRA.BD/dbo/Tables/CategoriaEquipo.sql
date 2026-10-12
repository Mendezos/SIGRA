CREATE TABLE [dbo].[CategoriaEquipo] (
    [IdCategoria] INT           IDENTITY (1, 1) NOT NULL,
    [Nombre]      VARCHAR (100) NOT NULL,
    [ManejaCantidad] BIT        CONSTRAINT [DF_CategoriaEquipo_ManejaCantidad] DEFAULT ((0)) NOT NULL,
    CONSTRAINT [PK_CategoriaEquipo] PRIMARY KEY CLUSTERED ([IdCategoria] ASC),
    CONSTRAINT [UQ_CategoriaEquipo_Nombre] UNIQUE NONCLUSTERED ([Nombre] ASC)
);

