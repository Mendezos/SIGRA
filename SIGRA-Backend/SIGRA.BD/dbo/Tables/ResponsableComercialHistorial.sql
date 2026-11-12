-- Cada asignación o reasignación del vendedor responsable de un prospecto o de un cliente (CRMGPSC-020).
CREATE TABLE [dbo].[ResponsableComercialHistorial] (
    [IdCambio]           INT           IDENTITY (1, 1) NOT NULL,
    [IdProspecto]        INT           NULL,
    [IdCliente]          INT           NULL,
    [IdVendedorAnterior] INT           NULL,
    [IdVendedorNuevo]    INT           NOT NULL,
    [Motivo]             VARCHAR (300) NULL,
    [SeguimientosMovidos] INT          CONSTRAINT [DF_ResponsableComercialHistorial_Movidos] DEFAULT ((0)) NOT NULL,
    [IdUsuario]          INT           NOT NULL,
    [Fecha]              DATETIME2 (0) CONSTRAINT [DF_ResponsableComercialHistorial_Fecha] DEFAULT (sysutcdatetime()) NOT NULL,
    CONSTRAINT [PK_ResponsableComercialHistorial] PRIMARY KEY CLUSTERED ([IdCambio] ASC),
    CONSTRAINT [CK_ResponsableComercialHistorial_Empresa] CHECK (([IdProspecto] IS NOT NULL AND [IdCliente] IS NULL) OR ([IdProspecto] IS NULL AND [IdCliente] IS NOT NULL)),
    CONSTRAINT [FK_ResponsableComercialHistorial_Prospecto] FOREIGN KEY ([IdProspecto]) REFERENCES [dbo].[Prospecto] ([IdProspecto]),
    CONSTRAINT [FK_ResponsableComercialHistorial_Cliente] FOREIGN KEY ([IdCliente]) REFERENCES [dbo].[Cliente] ([IdCliente]),
    CONSTRAINT [FK_ResponsableComercialHistorial_Anterior] FOREIGN KEY ([IdVendedorAnterior]) REFERENCES [dbo].[Usuario] ([IdUsuario]),
    CONSTRAINT [FK_ResponsableComercialHistorial_Nuevo] FOREIGN KEY ([IdVendedorNuevo]) REFERENCES [dbo].[Usuario] ([IdUsuario]),
    CONSTRAINT [FK_ResponsableComercialHistorial_Usuario] FOREIGN KEY ([IdUsuario]) REFERENCES [dbo].[Usuario] ([IdUsuario])
);


GO
CREATE NONCLUSTERED INDEX [IX_ResponsableComercialHistorial_Prospecto] ON [dbo].[ResponsableComercialHistorial]([IdProspecto] ASC) WHERE [IdProspecto] IS NOT NULL;


GO
CREATE NONCLUSTERED INDEX [IX_ResponsableComercialHistorial_Cliente] ON [dbo].[ResponsableComercialHistorial]([IdCliente] ASC) WHERE [IdCliente] IS NOT NULL;
