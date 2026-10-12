CREATE TABLE [dbo].[ContratoAccesorio] (
    [IdContratoAccesorio] INT IDENTITY (1, 1) NOT NULL,
    [IdContrato]          INT NOT NULL,
    [IdAccesorioModelo]   INT NOT NULL,
    [Cantidad]            INT NOT NULL,
    CONSTRAINT [PK_ContratoAccesorio] PRIMARY KEY CLUSTERED ([IdContratoAccesorio] ASC),
    CONSTRAINT [CK_ContratoAccesorio_Cantidad] CHECK ([Cantidad]>(0)),
    CONSTRAINT [FK_ContratoAccesorio_Contrato] FOREIGN KEY ([IdContrato]) REFERENCES [dbo].[Contrato] ([IdContrato]),
    CONSTRAINT [FK_ContratoAccesorio_Accesorio] FOREIGN KEY ([IdAccesorioModelo]) REFERENCES [dbo].[AccesorioModelo] ([IdAccesorioModelo]),
    CONSTRAINT [UQ_ContratoAccesorio] UNIQUE NONCLUSTERED ([IdContrato] ASC, [IdAccesorioModelo] ASC)
);
