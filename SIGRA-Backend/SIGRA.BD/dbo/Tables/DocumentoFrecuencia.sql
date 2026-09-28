CREATE TABLE [dbo].[DocumentoFrecuencia] (
    [IdDocumento]     INT           IDENTITY (1, 1) NOT NULL,
    [IdSolicitud]     INT           NOT NULL,
    [NombreDocumento] VARCHAR (150) NOT NULL,
    [RutaArchivo]     VARCHAR (300) NOT NULL,
    CONSTRAINT [PK_DocumentoFrecuencia] PRIMARY KEY CLUSTERED ([IdDocumento] ASC),
    CONSTRAINT [FK_DocumentoFrecuencia_Solicitud] FOREIGN KEY ([IdSolicitud]) REFERENCES [dbo].[SolicitudFrecuencia] ([IdSolicitud])
);

