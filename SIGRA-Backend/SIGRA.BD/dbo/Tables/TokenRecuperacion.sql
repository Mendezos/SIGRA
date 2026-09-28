CREATE TABLE [dbo].[TokenRecuperacion] (
    [IdToken]   INT           IDENTITY (1, 1) NOT NULL,
    [IdUsuario] INT           NOT NULL,
    [Token]     VARCHAR (255) NOT NULL,
    [Expira]    DATETIME      NOT NULL,
    [Usado]     BIT           CONSTRAINT [DF_TokenRecuperacion_Usado] DEFAULT ((0)) NOT NULL,
    CONSTRAINT [PK_TokenRecuperacion] PRIMARY KEY CLUSTERED ([IdToken] ASC),
    CONSTRAINT [FK_TokenRecuperacion_Usuario] FOREIGN KEY ([IdUsuario]) REFERENCES [dbo].[Usuario] ([IdUsuario]),
    CONSTRAINT [UQ_TokenRecuperacion_Token] UNIQUE NONCLUSTERED ([Token] ASC)
);

