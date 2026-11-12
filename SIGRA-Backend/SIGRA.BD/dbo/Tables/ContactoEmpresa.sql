CREATE TABLE [dbo].[ContactoEmpresa] (
    [IdContactoEmpresa]   INT           IDENTITY (1, 1) NOT NULL,
    [IdProspecto]         INT           NULL,
    [IdCliente]           INT           NULL,
    [Nombre]              VARCHAR (150) NOT NULL,
    [Cargo]               VARCHAR (100) NULL,
    [Telefono]            VARCHAR (20)  NULL,
    [Correo]              VARCHAR (150) NULL,
    [FechaCumpleanos]     DATE          NULL,
    [PreferenciaContacto] VARCHAR (20)  CONSTRAINT [DF_ContactoEmpresa_Preferencia] DEFAULT ('Cualquiera') NOT NULL,
    [EsPrincipal]         BIT           CONSTRAINT [DF_ContactoEmpresa_Principal] DEFAULT ((0)) NOT NULL,
    [Activo]              BIT           CONSTRAINT [DF_ContactoEmpresa_Activo] DEFAULT ((1)) NOT NULL,
    [MotivoDesactivacion] VARCHAR (300) NULL,
    [FechaDesactivacion]  DATETIME2 (0) NULL,
    [IdUsuarioDesactiva]  INT           NULL,
    [FechaCreacion]       DATETIME2 (0) CONSTRAINT [DF_ContactoEmpresa_Creacion] DEFAULT (sysutcdatetime()) NOT NULL,
    [IdUsuarioCrea]       INT           NULL,
    [FechaActualizacion]  DATETIME2 (0) NULL,
    CONSTRAINT [PK_ContactoEmpresa] PRIMARY KEY CLUSTERED ([IdContactoEmpresa] ASC),
    CONSTRAINT [CK_ContactoEmpresa_Empresa] CHECK (([IdProspecto] IS NOT NULL AND [IdCliente] IS NULL) OR ([IdProspecto] IS NULL AND [IdCliente] IS NOT NULL)),
    CONSTRAINT [CK_ContactoEmpresa_Medio] CHECK ([Telefono] IS NOT NULL OR [Correo] IS NOT NULL),
    CONSTRAINT [CK_ContactoEmpresa_Preferencia] CHECK ([PreferenciaContacto] IN ('Teléfono', 'Correo', 'Cualquiera')),
    CONSTRAINT [FK_ContactoEmpresa_Prospecto] FOREIGN KEY ([IdProspecto]) REFERENCES [dbo].[Prospecto] ([IdProspecto]),
    CONSTRAINT [FK_ContactoEmpresa_Cliente] FOREIGN KEY ([IdCliente]) REFERENCES [dbo].[Cliente] ([IdCliente]),
    CONSTRAINT [FK_ContactoEmpresa_UsuarioCrea] FOREIGN KEY ([IdUsuarioCrea]) REFERENCES [dbo].[Usuario] ([IdUsuario]),
    CONSTRAINT [FK_ContactoEmpresa_UsuarioDesactiva] FOREIGN KEY ([IdUsuarioDesactiva]) REFERENCES [dbo].[Usuario] ([IdUsuario])
);


GO
CREATE NONCLUSTERED INDEX [IX_ContactoEmpresa_Prospecto]
    ON [dbo].[ContactoEmpresa]([IdProspecto] ASC) WHERE [IdProspecto] IS NOT NULL;


GO
CREATE NONCLUSTERED INDEX [IX_ContactoEmpresa_Cliente]
    ON [dbo].[ContactoEmpresa]([IdCliente] ASC) WHERE [IdCliente] IS NOT NULL;


GO
CREATE UNIQUE NONCLUSTERED INDEX [UX_ContactoEmpresa_PrincipalProspecto]
    ON [dbo].[ContactoEmpresa]([IdProspecto] ASC) WHERE [IdProspecto] IS NOT NULL AND [EsPrincipal] = 1 AND [Activo] = 1;


GO
CREATE UNIQUE NONCLUSTERED INDEX [UX_ContactoEmpresa_PrincipalCliente]
    ON [dbo].[ContactoEmpresa]([IdCliente] ASC) WHERE [IdCliente] IS NOT NULL AND [EsPrincipal] = 1 AND [Activo] = 1;
