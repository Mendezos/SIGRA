CREATE TABLE [dbo].[UsuarioEspecialidad] (
    [IdUsuario] INT NOT NULL,
    [Especialidad] NVARCHAR(30) NOT NULL,
    CONSTRAINT [PK_UsuarioEspecialidad] PRIMARY KEY ([IdUsuario], [Especialidad]),
    CONSTRAINT [CK_UsuarioEspecialidad_Nombre] CHECK ([Especialidad] IN (N'Radios', N'Repetidoras')),
    CONSTRAINT [FK_UsuarioEspecialidad_Usuario] FOREIGN KEY ([IdUsuario]) REFERENCES [dbo].[Usuario] ([IdUsuario])
);
