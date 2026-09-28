CREATE TABLE [dbo].[GiraTecnico] (
    [IdGira]    INT NOT NULL,
    [IdUsuario] INT NOT NULL,
    CONSTRAINT [PK_GiraTecnico] PRIMARY KEY CLUSTERED ([IdGira] ASC, [IdUsuario] ASC),
    CONSTRAINT [FK_GiraTecnico_Gira] FOREIGN KEY ([IdGira]) REFERENCES [dbo].[Gira] ([IdGira]),
    CONSTRAINT [FK_GiraTecnico_Usuario] FOREIGN KEY ([IdUsuario]) REFERENCES [dbo].[Usuario] ([IdUsuario])
);

