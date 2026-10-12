CREATE TABLE [dbo].[ContactoInicial] (
    [IdContacto]        INT           IDENTITY (1, 1) NOT NULL,
    [Empresa]           VARCHAR (150) NOT NULL,
    [Contacto]          VARCHAR (150) NULL,
    [MedioContacto]     VARCHAR (20)  NOT NULL,
    [DatoContacto]      VARCHAR (150) NOT NULL,
    [Motivo]            VARCHAR (500) NULL,
    [IdVendedor]        INT           NULL,
    [Estado]            VARCHAR (20)  CONSTRAINT [DF_ContactoInicial_Estado] DEFAULT ('Asignado') NOT NULL,
    [FechaRegistro]     DATETIME      CONSTRAINT [DF_ContactoInicial_Fecha] DEFAULT (getdate()) NOT NULL,
    [IdUsuarioRegistra] INT           NOT NULL,
    CONSTRAINT [PK_ContactoInicial] PRIMARY KEY CLUSTERED ([IdContacto] ASC),
    CONSTRAINT [CK_ContactoInicial_Medio] CHECK ([MedioContacto] IN ('Teléfono', 'Correo')),
    CONSTRAINT [CK_ContactoInicial_Estado] CHECK ([Estado] IN ('Asignado', 'En espera')),
    CONSTRAINT [FK_ContactoInicial_Vendedor] FOREIGN KEY ([IdVendedor]) REFERENCES [dbo].[Usuario] ([IdUsuario]),
    CONSTRAINT [FK_ContactoInicial_UsuarioRegistra] FOREIGN KEY ([IdUsuarioRegistra]) REFERENCES [dbo].[Usuario] ([IdUsuario])
);


GO
CREATE NONCLUSTERED INDEX [IX_ContactoInicial_Empresa]
    ON [dbo].[ContactoInicial]([Empresa] ASC, [FechaRegistro] DESC);
