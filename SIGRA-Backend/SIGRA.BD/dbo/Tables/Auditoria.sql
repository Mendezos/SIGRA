CREATE TABLE [dbo].[Auditoria] (
    [IdAuditoria] BIGINT        IDENTITY (1, 1) NOT NULL,
    [IdUsuario]   INT           NULL,
    [Modulo]      VARCHAR (50)  NOT NULL,
    [Entidad]     VARCHAR (100) NOT NULL,
    [IdEntidad]   INT           NULL,
    [Accion]      VARCHAR (50)  NOT NULL,
    [Fecha]       DATETIME      CONSTRAINT [DF_Auditoria_Fecha] DEFAULT (getutcdate()) NOT NULL,
    [Detalle]     VARCHAR (MAX) NULL,
    CONSTRAINT [PK_Auditoria] PRIMARY KEY CLUSTERED ([IdAuditoria] ASC),
    CONSTRAINT [FK_Auditoria_Usuario] FOREIGN KEY ([IdUsuario]) REFERENCES [dbo].[Usuario] ([IdUsuario])
);


GO
CREATE NONCLUSTERED INDEX [IX_Auditoria_Entidad]
    ON [dbo].[Auditoria]([Entidad] ASC, [IdEntidad] ASC);


GO
CREATE NONCLUSTERED INDEX [IX_Auditoria_IdUsuario]
    ON [dbo].[Auditoria]([IdUsuario] ASC);
