CREATE TABLE [dbo].[GarantiaSeguimiento] (
    [IdSeguimiento] BIGINT IDENTITY NOT NULL,
    [IdGarantia] BIGINT NOT NULL,
    [IdUsuario] INT NOT NULL,
    [Fecha] DATETIME2 CONSTRAINT [DF_GarantiaSeguimiento_Fecha] DEFAULT SYSUTCDATETIME() NOT NULL,
    [Estado] NVARCHAR(50) NOT NULL,
    [Nota] NVARCHAR(1000) NOT NULL,
    CONSTRAINT [PK_GarantiaSeguimiento] PRIMARY KEY ([IdSeguimiento]),
    CONSTRAINT [CK_GarantiaSeguimiento_Estado] CHECK ([Estado] IN (N'En trámite', N'Resuelto por el proveedor', N'Rechazado por el proveedor')),
    CONSTRAINT [FK_GarantiaSeguimiento_Garantia] FOREIGN KEY ([IdGarantia]) REFERENCES [dbo].[GarantiaTicket] ([IdGarantia]),
    CONSTRAINT [FK_GarantiaSeguimiento_Usuario] FOREIGN KEY ([IdUsuario]) REFERENCES [dbo].[Usuario] ([IdUsuario])
);
