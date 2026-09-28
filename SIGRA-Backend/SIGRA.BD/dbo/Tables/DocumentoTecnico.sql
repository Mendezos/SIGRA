CREATE TABLE [dbo].[DocumentoTecnico] (
    [IdDocumento]     INT           IDENTITY (1, 1) NOT NULL,
    [IdEquipo]        INT           NOT NULL,
    [NombreDocumento] VARCHAR (150) NOT NULL,
    [RutaArchivo]     VARCHAR (300) NOT NULL,
    CONSTRAINT [PK_DocumentoTecnico] PRIMARY KEY CLUSTERED ([IdDocumento] ASC),
    CONSTRAINT [FK_DocumentoTecnico_Equipo] FOREIGN KEY ([IdEquipo]) REFERENCES [dbo].[Equipo] ([IdEquipo])
);

