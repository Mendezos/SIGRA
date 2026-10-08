CREATE TABLE [dbo].[AlertaContrato] (
    [IdAlerta]   INT          IDENTITY (1, 1) NOT NULL,
    [IdContrato] INT          NOT NULL,
    [Tipo]       VARCHAR (20) NOT NULL,
    [Fecha]      DATETIME     CONSTRAINT [DF_AlertaContrato_Fecha] DEFAULT (getdate()) NOT NULL,
    CONSTRAINT [PK_AlertaContrato] PRIMARY KEY CLUSTERED ([IdAlerta] ASC),
    CONSTRAINT [CK_AlertaContrato_Tipo] CHECK ([Tipo] IN ('90 dias', '30 dias', '3 anios')),
    CONSTRAINT [FK_AlertaContrato_Contrato] FOREIGN KEY ([IdContrato]) REFERENCES [dbo].[Contrato] ([IdContrato]),
    CONSTRAINT [UQ_AlertaContrato_Tipo] UNIQUE NONCLUSTERED ([IdContrato] ASC, [Tipo] ASC)
);
