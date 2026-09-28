CREATE TABLE [dbo].[SesionUsuario] (
    [IdSesion]        BIGINT       IDENTITY (1, 1) NOT NULL,
    [IdUsuario]       INT          NOT NULL,
    [TokenId]         VARCHAR (64) NOT NULL,
    [FechaInicio]     DATETIME     CONSTRAINT [DF_SesionUsuario_FechaInicio] DEFAULT (getutcdate()) NOT NULL,
    [FechaExpiracion] DATETIME     NOT NULL,
    [UltimaActividad] DATETIME     CONSTRAINT [DF_SesionUsuario_UltimaActividad] DEFAULT (getutcdate()) NOT NULL,
    [FechaCierre]     DATETIME     NULL,
    [Activa]          BIT          CONSTRAINT [DF_SesionUsuario_Activa] DEFAULT ((1)) NOT NULL,
    CONSTRAINT [PK_SesionUsuario] PRIMARY KEY CLUSTERED ([IdSesion] ASC),
    CONSTRAINT [FK_SesionUsuario_Usuario] FOREIGN KEY ([IdUsuario]) REFERENCES [dbo].[Usuario] ([IdUsuario]),
    CONSTRAINT [UQ_SesionUsuario_TokenId] UNIQUE NONCLUSTERED ([TokenId] ASC)
);


GO
CREATE NONCLUSTERED INDEX [IX_SesionUsuario_IdUsuario]
    ON [dbo].[SesionUsuario]([IdUsuario] ASC);
