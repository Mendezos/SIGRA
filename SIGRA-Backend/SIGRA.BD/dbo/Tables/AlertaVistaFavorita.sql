CREATE TABLE [dbo].[AlertaVistaFavorita] (
    [IdVista]   INT            IDENTITY (1, 1) NOT NULL,
    [IdUsuario] INT            NOT NULL,
    [Nombre]    NVARCHAR (60)  NOT NULL,
    [Filtros]   NVARCHAR (400) NOT NULL,
    CONSTRAINT [PK_AlertaVistaFavorita] PRIMARY KEY CLUSTERED ([IdVista] ASC),
    CONSTRAINT [UQ_AlertaVistaFavorita_Nombre] UNIQUE NONCLUSTERED ([IdUsuario] ASC, [Nombre] ASC),
    CONSTRAINT [FK_AlertaVistaFavorita_Usuario] FOREIGN KEY ([IdUsuario]) REFERENCES [dbo].[Usuario] ([IdUsuario])
);
