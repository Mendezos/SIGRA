CREATE TABLE [dbo].[NotaCRM] (
    [IdNota]       INT            IDENTITY (1, 1) NOT NULL,
    [IdProspecto]  INT            NULL,
    [IdCliente]    INT            NULL,
    [Categoria]    VARCHAR (30)   NOT NULL,
    [Texto]        VARCHAR (2000) NOT NULL,
    [Visibilidad]  VARCHAR (20)   CONSTRAINT [DF_NotaCRM_Visibilidad] DEFAULT ('Equipo') NOT NULL,
    [IdUsuario]    INT            NOT NULL,
    [Fecha]        DATETIME2 (0)  CONSTRAINT [DF_NotaCRM_Fecha] DEFAULT (sysutcdatetime()) NOT NULL,
    CONSTRAINT [PK_NotaCRM] PRIMARY KEY CLUSTERED ([IdNota] ASC),
    CONSTRAINT [CK_NotaCRM_Empresa] CHECK (([IdProspecto] IS NOT NULL AND [IdCliente] IS NULL) OR ([IdProspecto] IS NULL AND [IdCliente] IS NOT NULL)),
    CONSTRAINT [CK_NotaCRM_Categoria] CHECK ([Categoria] IN ('General', 'Comercial', 'Técnica', 'Facturación', 'Otra')),
    CONSTRAINT [CK_NotaCRM_Visibilidad] CHECK ([Visibilidad] IN ('Privada', 'Equipo', 'General')),
    CONSTRAINT [FK_NotaCRM_Prospecto] FOREIGN KEY ([IdProspecto]) REFERENCES [dbo].[Prospecto] ([IdProspecto]),
    CONSTRAINT [FK_NotaCRM_Cliente] FOREIGN KEY ([IdCliente]) REFERENCES [dbo].[Cliente] ([IdCliente]),
    CONSTRAINT [FK_NotaCRM_Usuario] FOREIGN KEY ([IdUsuario]) REFERENCES [dbo].[Usuario] ([IdUsuario])
);


GO
CREATE NONCLUSTERED INDEX [IX_NotaCRM_Prospecto]
    ON [dbo].[NotaCRM]([IdProspecto] ASC, [Fecha] DESC) WHERE [IdProspecto] IS NOT NULL;


GO
CREATE NONCLUSTERED INDEX [IX_NotaCRM_Cliente]
    ON [dbo].[NotaCRM]([IdCliente] ASC, [Fecha] DESC) WHERE [IdCliente] IS NOT NULL;
