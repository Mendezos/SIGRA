CREATE TABLE [dbo].[Usuario] (
    [IdUsuario]        INT           IDENTITY (1, 1) NOT NULL,
    [IdRol]            INT           NOT NULL,
    [IdCliente]        INT           NULL,
    [Nombre]           VARCHAR (150) NOT NULL,
    [Correo]           VARCHAR (150) NOT NULL,
    [Telefono]         VARCHAR (20)  NULL,
    [PasswordHash]     VARCHAR (255) NOT NULL,
    [Foto]             VARCHAR (300) NULL,
    [Activo]           BIT           CONSTRAINT [DF_Usuario_Activo] DEFAULT ((1)) NOT NULL,
    [IntentosFallidos] INT           CONSTRAINT [DF_Usuario_IntentosFallidos] DEFAULT ((0)) NOT NULL,
    [BloqueadoHasta]   DATETIME      NULL,
    [FechaBloqueo]     DATETIME      NULL,
    CONSTRAINT [PK_Usuario] PRIMARY KEY CLUSTERED ([IdUsuario] ASC),
    CONSTRAINT [CK_Usuario_IntentosFallidos] CHECK ([IntentosFallidos]>=(0)),
    CONSTRAINT [FK_Usuario_Cliente] FOREIGN KEY ([IdCliente]) REFERENCES [dbo].[Cliente] ([IdCliente]),
    CONSTRAINT [FK_Usuario_Rol] FOREIGN KEY ([IdRol]) REFERENCES [dbo].[Rol] ([IdRol]),
    CONSTRAINT [UQ_Usuario_Correo] UNIQUE NONCLUSTERED ([Correo] ASC)
);


GO
CREATE NONCLUSTERED INDEX [IX_Usuario_IdRol]
    ON [dbo].[Usuario]([IdRol] ASC);

