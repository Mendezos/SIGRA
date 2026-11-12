CREATE TABLE [dbo].[NotaCredito] (
    [IdNotaCredito]     INT             IDENTITY (1, 1) NOT NULL,
    [NumeroNota]        VARCHAR (30)    NOT NULL,
    [IdFactura]         INT             NOT NULL,
    [Fecha]             DATE            CONSTRAINT [DF_NotaCredito_Fecha] DEFAULT (CONVERT([date],getdate())) NOT NULL,
    [Monto]             DECIMAL (14, 2) NOT NULL,
    [Motivo]            VARCHAR (500)   NOT NULL,
    [Estado]            VARCHAR (15)    CONSTRAINT [DF_NotaCredito_Estado] DEFAULT ('Emitida') NOT NULL,
    [IdUsuarioRegistra] INT             NULL,
    [FechaRegistro]     DATETIME2 (0)   CONSTRAINT [DF_NotaCredito_FechaRegistro] DEFAULT (sysutcdatetime()) NOT NULL,
    CONSTRAINT [PK_NotaCredito] PRIMARY KEY CLUSTERED ([IdNotaCredito] ASC),
    CONSTRAINT [UQ_NotaCredito_Numero] UNIQUE NONCLUSTERED ([NumeroNota] ASC),
    CONSTRAINT [CK_NotaCredito_Monto] CHECK ([Monto] > 0),
    CONSTRAINT [CK_NotaCredito_Estado] CHECK ([Estado] IN ('Emitida', 'Anulada')),
    CONSTRAINT [FK_NotaCredito_Factura] FOREIGN KEY ([IdFactura]) REFERENCES [dbo].[Factura] ([IdFactura]),
    CONSTRAINT [FK_NotaCredito_Usuario] FOREIGN KEY ([IdUsuarioRegistra]) REFERENCES [dbo].[Usuario] ([IdUsuario])
);


GO
CREATE NONCLUSTERED INDEX [IX_NotaCredito_Factura]
    ON [dbo].[NotaCredito]([IdFactura] ASC);
