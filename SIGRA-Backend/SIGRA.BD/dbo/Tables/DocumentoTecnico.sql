CREATE TABLE [dbo].[DocumentoTecnico] (
    [IdDocumento]     INT            IDENTITY (1, 1) NOT NULL,
    [IdEquipo]        INT            NOT NULL,
    [NombreDocumento] VARCHAR (150)  NOT NULL,
    [RutaArchivo]     VARCHAR (300)  NULL,
    [TipoDocumento]   VARCHAR (30)   NULL,
    [NombreArchivo]   VARCHAR (255)  NULL,
    [TipoContenido]   VARCHAR (100)  NULL,
    [TamanoBytes]     INT            NULL,
    [Contenido]       VARBINARY (MAX) NULL,
    [FechaCarga]      DATETIME       CONSTRAINT [DF_DocumentoTecnico_FechaCarga] DEFAULT (getdate()) NOT NULL,
    [IdUsuario]       INT            NULL,
    CONSTRAINT [PK_DocumentoTecnico] PRIMARY KEY CLUSTERED ([IdDocumento] ASC),
    CONSTRAINT [FK_DocumentoTecnico_Equipo] FOREIGN KEY ([IdEquipo]) REFERENCES [dbo].[Equipo] ([IdEquipo]),
    CONSTRAINT [FK_DocumentoTecnico_Usuario] FOREIGN KEY ([IdUsuario]) REFERENCES [dbo].[Usuario] ([IdUsuario]),
    CONSTRAINT [CK_DocumentoTecnico_Tipo] CHECK ([TipoDocumento] IS NULL OR [TipoDocumento] IN ('Plano', 'Acta de instalación', 'Otro'))
);


GO
CREATE NONCLUSTERED INDEX [IX_DocumentoTecnico_IdEquipo]
    ON [dbo].[DocumentoTecnico]([IdEquipo] ASC);
