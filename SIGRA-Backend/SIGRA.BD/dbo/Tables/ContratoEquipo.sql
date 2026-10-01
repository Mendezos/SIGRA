CREATE TABLE [dbo].[ContratoEquipo] (
    [IdContratoEquipo] INT  IDENTITY (1, 1) NOT NULL,
    [IdContrato]       INT  NOT NULL,
    [IdEquipo]         INT  NOT NULL,
    [FechaAsignacion]  DATE CONSTRAINT [DF_ContratoEquipo_Fecha] DEFAULT (CONVERT([date],getdate())) NOT NULL,
    [FechaDevolucion]  DATE NULL,
    CONSTRAINT [PK_ContratoEquipo] PRIMARY KEY CLUSTERED ([IdContratoEquipo] ASC),
    CONSTRAINT [CK_ContratoEquipo_Fechas] CHECK ([FechaDevolucion] IS NULL OR [FechaDevolucion]>=[FechaAsignacion]),
    CONSTRAINT [FK_ContratoEquipo_Contrato] FOREIGN KEY ([IdContrato]) REFERENCES [dbo].[Contrato] ([IdContrato]),
    CONSTRAINT [FK_ContratoEquipo_Equipo] FOREIGN KEY ([IdEquipo]) REFERENCES [dbo].[Equipo] ([IdEquipo])
);


GO
-- Un mismo equipo no puede estar asignado a dos contratos activos a la vez
-- (asignacion "activa" = todavia no tiene FechaDevolucion).
CREATE UNIQUE NONCLUSTERED INDEX [UQ_ContratoEquipo_EquipoActivo]
    ON [dbo].[ContratoEquipo]([IdEquipo] ASC) WHERE ([FechaDevolucion] IS NULL);


GO
CREATE NONCLUSTERED INDEX [IX_ContratoEquipo_IdEquipo]
    ON [dbo].[ContratoEquipo]([IdEquipo] ASC);


GO
CREATE NONCLUSTERED INDEX [IX_ContratoEquipo_IdContrato]
    ON [dbo].[ContratoEquipo]([IdContrato] ASC);

