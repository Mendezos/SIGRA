CREATE TABLE [dbo].[ContratoEquipo] (
    [IdContratoEquipo] INT  IDENTITY (1, 1) NOT NULL,
    [IdContrato]       INT  NOT NULL,
    [IdEquipo]         INT  NOT NULL,
    [FechaAsignacion]  DATE CONSTRAINT [DF_ContratoEquipo_Fecha] DEFAULT (CONVERT([date],getdate())) NOT NULL,
    CONSTRAINT [PK_ContratoEquipo] PRIMARY KEY CLUSTERED ([IdContratoEquipo] ASC),
    CONSTRAINT [FK_ContratoEquipo_Contrato] FOREIGN KEY ([IdContrato]) REFERENCES [dbo].[Contrato] ([IdContrato]),
    CONSTRAINT [FK_ContratoEquipo_Equipo] FOREIGN KEY ([IdEquipo]) REFERENCES [dbo].[Equipo] ([IdEquipo])
);


GO
CREATE NONCLUSTERED INDEX [IX_ContratoEquipo_IdEquipo]
    ON [dbo].[ContratoEquipo]([IdEquipo] ASC);


GO
CREATE NONCLUSTERED INDEX [IX_ContratoEquipo_IdContrato]
    ON [dbo].[ContratoEquipo]([IdContrato] ASC);

