CREATE TABLE [dbo].[CorreoPendiente] (
    [IdCorreo] BIGINT IDENTITY NOT NULL,
    [IdNotificacion] BIGINT NULL,
    [Destinatario] NVARCHAR(150) NOT NULL,
    [Nombre] NVARCHAR(150) NOT NULL,
    [Asunto] NVARCHAR(200) NOT NULL,
    [Cuerpo] NVARCHAR(MAX) NOT NULL,
    [AdjuntosJson] NVARCHAR(MAX) CONSTRAINT [DF_CorreoPendiente_Adjuntos] DEFAULT (N'[]') NOT NULL,
    [Estado] VARCHAR(20) CONSTRAINT [DF_CorreoPendiente_Estado] DEFAULT ('Pendiente') NOT NULL,
    [Intentos] INT CONSTRAINT [DF_CorreoPendiente_Intentos] DEFAULT (0) NOT NULL,
    [ProximoIntento] DATETIME2 CONSTRAINT [DF_CorreoPendiente_Proximo] DEFAULT SYSUTCDATETIME() NOT NULL,
    [BloqueadoHasta] DATETIME2 NULL,
    [FechaEnvio] DATETIME2 NULL,
    [UltimoError] NVARCHAR(500) NULL,
    CONSTRAINT [PK_CorreoPendiente] PRIMARY KEY ([IdCorreo]),
    CONSTRAINT [CK_CorreoPendiente_Adjuntos] CHECK (ISJSON([AdjuntosJson]) = 1),
    CONSTRAINT [CK_CorreoPendiente_Estado] CHECK ([Estado] IN ('Pendiente', 'Procesando', 'Enviado', 'Fallido')),
    CONSTRAINT [FK_CorreoPendiente_Notificacion] FOREIGN KEY ([IdNotificacion]) REFERENCES [dbo].[Notificacion] ([IdNotificacion])
);
