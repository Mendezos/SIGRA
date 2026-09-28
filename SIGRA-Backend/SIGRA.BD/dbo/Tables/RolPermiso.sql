CREATE TABLE [dbo].[RolPermiso] (
    [IdRol]       INT NOT NULL,
    [IdPermiso]   INT NOT NULL,
    [Lectura]     BIT CONSTRAINT [DF_RolPermiso_Lectura] DEFAULT ((0)) NOT NULL,
    [Escritura]   BIT CONSTRAINT [DF_RolPermiso_Escritura] DEFAULT ((0)) NOT NULL,
    [Edicion]     BIT CONSTRAINT [DF_RolPermiso_Edicion] DEFAULT ((0)) NOT NULL,
    [Eliminacion] BIT CONSTRAINT [DF_RolPermiso_Eliminacion] DEFAULT ((0)) NOT NULL,
    CONSTRAINT [PK_RolPermiso] PRIMARY KEY CLUSTERED ([IdRol] ASC, [IdPermiso] ASC),
    CONSTRAINT [FK_RolPermiso_Permiso] FOREIGN KEY ([IdPermiso]) REFERENCES [dbo].[Permiso] ([IdPermiso]),
    CONSTRAINT [FK_RolPermiso_Rol] FOREIGN KEY ([IdRol]) REFERENCES [dbo].[Rol] ([IdRol])
);

