-- Documentos firmados de un contrato: el original al activarlo y uno por cada renovación.
CREATE TABLE [dbo].[ContratoDocumento] (
    [IdDocumento] INT            IDENTITY (1, 1) NOT NULL,
    [IdContrato]  INT            NOT NULL,
    [Tipo]        VARCHAR (30)   NOT NULL,
    [Nombre]      VARCHAR (200)  NOT NULL,
    [Contenido]   VARBINARY (MAX) NOT NULL,
    [FechaFirma]  DATE           NOT NULL,
    [IdUsuario]   INT            NOT NULL,
    [Fecha]       DATETIME2      CONSTRAINT [DF_ContratoDocumento_Fecha] DEFAULT (SYSUTCDATETIME()) NOT NULL,
    CONSTRAINT [PK_ContratoDocumento] PRIMARY KEY CLUSTERED ([IdDocumento] ASC),
    CONSTRAINT [FK_ContratoDocumento_Contrato] FOREIGN KEY ([IdContrato]) REFERENCES [dbo].[Contrato] ([IdContrato]),
    CONSTRAINT [FK_ContratoDocumento_Usuario] FOREIGN KEY ([IdUsuario]) REFERENCES [dbo].[Usuario] ([IdUsuario])
);


GO
CREATE NONCLUSTERED INDEX [IX_ContratoDocumento_IdContrato]
    ON [dbo].[ContratoDocumento]([IdContrato] ASC);
