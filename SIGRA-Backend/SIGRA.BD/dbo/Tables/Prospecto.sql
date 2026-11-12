CREATE TABLE [dbo].[Prospecto] (
    [IdProspecto]            INT           IDENTITY (1, 1) NOT NULL,
    [Empresa]                VARCHAR (150) NOT NULL,
    [Contacto]               VARCHAR (150) NULL,
    [Correo]                 VARCHAR (150) NULL,
    [Telefono]               VARCHAR (20)  NULL,
    [Estado]                 VARCHAR (30)  CONSTRAINT [DF_Prospecto_Estado] DEFAULT ('Nuevo') NOT NULL,
    [Sector]                 VARCHAR (100) NULL,
    [Direccion]              VARCHAR (300) NULL,
    [TamanoFlota]            INT           NULL,
    [Fuente]                 VARCHAR (100) NULL,
    [IdVendedor]             INT           NULL,
    [FechaIngreso]           DATE          CONSTRAINT [DF_Prospecto_FechaIngreso] DEFAULT (CONVERT([date],getdate())) NOT NULL,
    [JustificacionDuplicado] VARCHAR (300) NULL,
    [MotivoDescarte]         VARCHAR (100) NULL,
    [ObservacionDescarte]    VARCHAR (500) NULL,
    [FechaDescarte]          DATETIME2 (0) NULL,
    [IdCliente]              INT           NULL,
    [FechaConversion]        DATETIME2 (0) NULL,
    [FechaCreacion]          DATETIME2 (0) CONSTRAINT [DF_Prospecto_FechaCreacion] DEFAULT (sysutcdatetime()) NOT NULL,
    [IdUsuarioCrea]          INT           NULL,
    [FechaActualizacion]     DATETIME2 (0) NULL,
    CONSTRAINT [PK_Prospecto] PRIMARY KEY CLUSTERED ([IdProspecto] ASC),
    CONSTRAINT [CK_Prospecto_Estado] CHECK ([Estado] IN ('Nuevo', 'Cotización enviada', 'En negociación', 'Convertido', 'Descartado')),
    CONSTRAINT [CK_Prospecto_TamanoFlota] CHECK ([TamanoFlota] IS NULL OR [TamanoFlota] >= 0),
    CONSTRAINT [FK_Prospecto_Vendedor] FOREIGN KEY ([IdVendedor]) REFERENCES [dbo].[Usuario] ([IdUsuario]),
    CONSTRAINT [FK_Prospecto_Cliente] FOREIGN KEY ([IdCliente]) REFERENCES [dbo].[Cliente] ([IdCliente]),
    CONSTRAINT [FK_Prospecto_UsuarioCrea] FOREIGN KEY ([IdUsuarioCrea]) REFERENCES [dbo].[Usuario] ([IdUsuario])
);


GO
CREATE NONCLUSTERED INDEX [IX_Prospecto_Estado]
    ON [dbo].[Prospecto]([Estado] ASC, [IdVendedor] ASC);


GO
CREATE NONCLUSTERED INDEX [IX_Prospecto_Empresa]
    ON [dbo].[Prospecto]([Empresa] ASC);
