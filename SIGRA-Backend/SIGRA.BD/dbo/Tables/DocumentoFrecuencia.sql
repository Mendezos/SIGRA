CREATE TABLE [dbo].[DocumentoFrecuencia] (
    [IdDocumento]     INT             IDENTITY (1, 1) NOT NULL,
    [IdSolicitud]     INT             NOT NULL,
    [NombreDocumento] VARCHAR (150)   NOT NULL,
    [RutaArchivo]     VARCHAR (300)   NULL,
    [TipoDocumento]   VARCHAR (30)    NULL,
    [NombreArchivo]   VARCHAR (255)   NULL,
    [TipoContenido]   VARCHAR (100)   NULL,
    [TamanoBytes]     INT             NULL,
    [Contenido]       VARBINARY (MAX) NULL,
    [FechaCarga]      DATETIME        CONSTRAINT [DF_DocumentoFrecuencia_FechaCarga] DEFAULT (getdate()) NOT NULL,
    [IdUsuario]       INT             NULL,
    CONSTRAINT [PK_DocumentoFrecuencia] PRIMARY KEY CLUSTERED ([IdDocumento] ASC),
    CONSTRAINT [FK_DocumentoFrecuencia_Solicitud] FOREIGN KEY ([IdSolicitud]) REFERENCES [dbo].[SolicitudFrecuencia] ([IdSolicitud]),
    CONSTRAINT [FK_DocumentoFrecuencia_Usuario] FOREIGN KEY ([IdUsuario]) REFERENCES [dbo].[Usuario] ([IdUsuario]),
    CONSTRAINT [CK_DocumentoFrecuencia_Tipo] CHECK ([TipoDocumento] IS NULL OR [TipoDocumento] IN ('Formulario presentado', 'Acuse de recibo', 'Otro'))
);


GO
CREATE NONCLUSTERED INDEX [IX_DocumentoFrecuencia_IdSolicitud]
    ON [dbo].[DocumentoFrecuencia]([IdSolicitud] ASC);
