CREATE TABLE [dbo].[InteraccionCRM] (
    [IdInteraccion] INT           IDENTITY (1, 1) NOT NULL,
    [IdProspecto]   INT           NOT NULL,
    [IdUsuario]     INT           NOT NULL,
    [Fecha]         DATETIME      CONSTRAINT [DF_InteraccionCRM_Fecha] DEFAULT (getdate()) NOT NULL,
    [Tipo]          VARCHAR (50)  NOT NULL,
    [Detalle]       VARCHAR (MAX) NULL,
    CONSTRAINT [PK_InteraccionCRM] PRIMARY KEY CLUSTERED ([IdInteraccion] ASC),
    CONSTRAINT [FK_InteraccionCRM_Prospecto] FOREIGN KEY ([IdProspecto]) REFERENCES [dbo].[Prospecto] ([IdProspecto]),
    CONSTRAINT [FK_InteraccionCRM_Usuario] FOREIGN KEY ([IdUsuario]) REFERENCES [dbo].[Usuario] ([IdUsuario])
);


GO
CREATE NONCLUSTERED INDEX [IX_InteraccionCRM_IdProspecto]
    ON [dbo].[InteraccionCRM]([IdProspecto] ASC);

