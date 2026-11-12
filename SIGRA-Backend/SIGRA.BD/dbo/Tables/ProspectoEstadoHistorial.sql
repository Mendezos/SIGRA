CREATE TABLE [dbo].[ProspectoEstadoHistorial] (
    [IdHistorial]    INT           IDENTITY (1, 1) NOT NULL,
    [IdProspecto]    INT           NOT NULL,
    [EstadoAnterior] VARCHAR (30)  NULL,
    [EstadoNuevo]    VARCHAR (30)  NOT NULL,
    [Motivo]         VARCHAR (100) NULL,
    [Observacion]    VARCHAR (500) NULL,
    [IdUsuario]      INT           NULL,
    [Fecha]          DATETIME2 (0) CONSTRAINT [DF_ProspectoEstadoHistorial_Fecha] DEFAULT (sysutcdatetime()) NOT NULL,
    CONSTRAINT [PK_ProspectoEstadoHistorial] PRIMARY KEY CLUSTERED ([IdHistorial] ASC),
    CONSTRAINT [FK_ProspectoEstadoHistorial_Prospecto] FOREIGN KEY ([IdProspecto]) REFERENCES [dbo].[Prospecto] ([IdProspecto]),
    CONSTRAINT [FK_ProspectoEstadoHistorial_Usuario] FOREIGN KEY ([IdUsuario]) REFERENCES [dbo].[Usuario] ([IdUsuario])
);


GO
CREATE NONCLUSTERED INDEX [IX_ProspectoEstadoHistorial_Prospecto]
    ON [dbo].[ProspectoEstadoHistorial]([IdProspecto] ASC, [Fecha] DESC);
