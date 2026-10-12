CREATE TABLE [dbo].[AccesorioModelo] (
    [IdAccesorioModelo] INT           IDENTITY (1, 1) NOT NULL,
    [IdModelo]          INT           NOT NULL,
    [Nombre]            VARCHAR (100) NOT NULL,
    [Cantidad]          INT           CONSTRAINT [DF_AccesorioModelo_Cantidad] DEFAULT ((0)) NOT NULL,
    CONSTRAINT [PK_AccesorioModelo] PRIMARY KEY CLUSTERED ([IdAccesorioModelo] ASC),
    CONSTRAINT [CK_AccesorioModelo_Cantidad] CHECK ([Cantidad]>=(0)),
    CONSTRAINT [FK_AccesorioModelo_Modelo] FOREIGN KEY ([IdModelo]) REFERENCES [dbo].[ModeloEquipo] ([IdModelo])
);

