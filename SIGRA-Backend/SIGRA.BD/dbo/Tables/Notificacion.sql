CREATE TABLE [dbo].[Notificacion] (
    [IdNotificacion] BIGINT IDENTITY NOT NULL,
    [IdUsuario] INT NOT NULL,
    [IdModulo] INT NOT NULL,
    [Titulo] NVARCHAR(200) NOT NULL,
    [Mensaje] NVARCHAR(MAX) NOT NULL,
    [Entidad] NVARCHAR(100) NULL,
    [IdEntidad] INT NULL,
    [Fecha] DATETIME2 CONSTRAINT [DF_Notificacion_Fecha] DEFAULT SYSUTCDATETIME() NOT NULL,
    [FechaLectura] DATETIME2 NULL,
    CONSTRAINT [PK_Notificacion] PRIMARY KEY ([IdNotificacion]),
    CONSTRAINT [FK_Notificacion_Usuario] FOREIGN KEY ([IdUsuario]) REFERENCES [dbo].[Usuario] ([IdUsuario]),
    CONSTRAINT [FK_Notificacion_Modulo] FOREIGN KEY ([IdModulo]) REFERENCES [dbo].[Modulo] ([IdModulo])
);
GO
CREATE INDEX [IX_Notificacion_Usuario] ON [dbo].[Notificacion] ([IdUsuario], [FechaLectura], [Fecha]);
