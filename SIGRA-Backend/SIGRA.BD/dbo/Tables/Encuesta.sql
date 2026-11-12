CREATE TABLE [dbo].[Encuesta] (
    [IdEncuesta]         INT              IDENTITY (1, 1) NOT NULL,
    [IdFactura]          INT              NOT NULL,
    [IdCliente]          INT              NOT NULL,
    [IdContactoEmpresa]  INT              NULL,
    [TokenHash]          VARBINARY (32)    NOT NULL,
    [CorreoDestino]      VARCHAR (150)    NULL,
    [Estado]             VARCHAR (15)     CONSTRAINT [DF_Encuesta_Estado] DEFAULT ('Pendiente') NOT NULL,
    [FechaEnvio]         DATETIME2 (0)    NULL,
    [FechaExpiracion]    DATETIME2 (0)    NULL,
    [FechaRespuesta]     DATETIME2 (0)    NULL,
    [CalificacionGeneral] TINYINT         NULL,
    [Comentario]         VARCHAR (1000)   NULL,
    [FechaCreacion]      DATETIME2 (0)    CONSTRAINT [DF_Encuesta_Creacion] DEFAULT (sysutcdatetime()) NOT NULL,
    CONSTRAINT [PK_Encuesta] PRIMARY KEY CLUSTERED ([IdEncuesta] ASC),
    CONSTRAINT [UQ_Encuesta_TokenHash] UNIQUE NONCLUSTERED ([TokenHash] ASC),
    CONSTRAINT [CK_Encuesta_Estado] CHECK ([Estado] IN ('Pendiente', 'Enviada', 'Respondida', 'Expirada')),
    CONSTRAINT [CK_Encuesta_Calificacion] CHECK ([CalificacionGeneral] IS NULL OR [CalificacionGeneral] BETWEEN 1 AND 5),
    CONSTRAINT [FK_Encuesta_Factura] FOREIGN KEY ([IdFactura]) REFERENCES [dbo].[Factura] ([IdFactura]),
    CONSTRAINT [FK_Encuesta_Cliente] FOREIGN KEY ([IdCliente]) REFERENCES [dbo].[Cliente] ([IdCliente]),
    CONSTRAINT [FK_Encuesta_Contacto] FOREIGN KEY ([IdContactoEmpresa]) REFERENCES [dbo].[ContactoEmpresa] ([IdContactoEmpresa])
);


GO
CREATE NONCLUSTERED INDEX [IX_Encuesta_Factura]
    ON [dbo].[Encuesta]([IdFactura] ASC);


GO
CREATE NONCLUSTERED INDEX [IX_Encuesta_Cliente]
    ON [dbo].[Encuesta]([IdCliente] ASC, [Estado] ASC);
