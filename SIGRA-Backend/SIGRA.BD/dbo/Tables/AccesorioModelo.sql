CREATE TABLE [dbo].[AccesorioModelo] (
    [IdAccesorioModelo] INT           IDENTITY (1, 1) NOT NULL,
    [IdModelo]          INT           NOT NULL,
    [Nombre]            VARCHAR (100) NOT NULL,
    CONSTRAINT [PK_AccesorioModelo] PRIMARY KEY CLUSTERED ([IdAccesorioModelo] ASC),
    CONSTRAINT [FK_AccesorioModelo_Modelo] FOREIGN KEY ([IdModelo]) REFERENCES [dbo].[ModeloEquipo] ([IdModelo])
);

