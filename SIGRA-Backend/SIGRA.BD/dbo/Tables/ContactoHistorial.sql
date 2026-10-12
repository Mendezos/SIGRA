CREATE TABLE [dbo].[ContactoHistorial] (
    [IdHistorial]         INT           IDENTITY (1, 1) NOT NULL,
    [IdContacto]          INT           NOT NULL,
    [IdUsuario]           INT           NOT NULL,
    [Fecha]               DATETIME      CONSTRAINT [DF_ContactoHistorial_Fecha] DEFAULT (getdate()) NOT NULL,
    [IdVendedorAnterior]  INT           NULL,
    [IdVendedorNuevo]     INT           NOT NULL,
    [Motivo]              VARCHAR (300) NOT NULL,
    CONSTRAINT [PK_ContactoHistorial] PRIMARY KEY CLUSTERED ([IdHistorial] ASC),
    CONSTRAINT [FK_ContactoHistorial_Contacto] FOREIGN KEY ([IdContacto]) REFERENCES [dbo].[ContactoInicial] ([IdContacto]),
    CONSTRAINT [FK_ContactoHistorial_Usuario] FOREIGN KEY ([IdUsuario]) REFERENCES [dbo].[Usuario] ([IdUsuario]),
    CONSTRAINT [FK_ContactoHistorial_VendedorAnterior] FOREIGN KEY ([IdVendedorAnterior]) REFERENCES [dbo].[Usuario] ([IdUsuario]),
    CONSTRAINT [FK_ContactoHistorial_VendedorNuevo] FOREIGN KEY ([IdVendedorNuevo]) REFERENCES [dbo].[Usuario] ([IdUsuario])
);


GO
CREATE NONCLUSTERED INDEX [IX_ContactoHistorial_IdContacto]
    ON [dbo].[ContactoHistorial]([IdContacto] ASC);
