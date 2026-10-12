CREATE TABLE [dbo].[RenovacionContrato] (
    [IdRenovacion]          INT           IDENTITY (1, 1) NOT NULL,
    [IdContrato]            INT           NOT NULL,
    [FechaRenovacion]       DATE          CONSTRAINT [DF_RenovacionContrato_Fecha] DEFAULT (CONVERT([date],getdate())) NOT NULL,
    [NuevaFechaVencimiento] DATE          NOT NULL,
    [Observacion]           VARCHAR (MAX) NULL,
    [IdUsuario]             INT           NULL,
    [FechaVencimientoAnterior] DATE       NULL,
    [MontoMensual]          DECIMAL (12, 2) NULL,
    CONSTRAINT [PK_RenovacionContrato] PRIMARY KEY CLUSTERED ([IdRenovacion] ASC),
    CONSTRAINT [CK_RenovacionContrato_Fechas] CHECK ([NuevaFechaVencimiento]>[FechaRenovacion]),
    CONSTRAINT [FK_RenovacionContrato_Usuario] FOREIGN KEY ([IdUsuario]) REFERENCES [dbo].[Usuario] ([IdUsuario]),
    CONSTRAINT [FK_RenovacionContrato_Contrato] FOREIGN KEY ([IdContrato]) REFERENCES [dbo].[Contrato] ([IdContrato])
);

