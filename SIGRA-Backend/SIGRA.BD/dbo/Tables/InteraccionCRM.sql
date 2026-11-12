CREATE TABLE [dbo].[InteraccionCRM] (
    [IdInteraccion]     INT            IDENTITY (1, 1) NOT NULL,
    [IdProspecto]       INT            NULL,
    [IdUsuario]         INT            NOT NULL,
    [Fecha]             DATETIME       CONSTRAINT [DF_InteraccionCRM_Fecha] DEFAULT (getdate()) NOT NULL,
    [Tipo]              VARCHAR (50)   NOT NULL,
    [Detalle]           VARCHAR (MAX)  NULL,
    [IdCliente]         INT            NULL,
    [IdContactoEmpresa] INT            NULL,
    [Resultado]         VARCHAR (500)  NULL,
    [ProximoPaso]       VARCHAR (500)  NULL,
    [IdCotizacion]      INT            NULL,
    [FechaRegistro]     DATETIME2 (0)  CONSTRAINT [DF_InteraccionCRM_FechaRegistro] DEFAULT (sysutcdatetime()) NOT NULL,
    CONSTRAINT [PK_InteraccionCRM] PRIMARY KEY CLUSTERED ([IdInteraccion] ASC),
    CONSTRAINT [CK_InteraccionCRM_Tipo] CHECK ([Tipo] IN ('Llamada', 'Correo', 'Visita', 'Reunión', 'WhatsApp', 'Acuerdo', 'Otro')),
    CONSTRAINT [CK_InteraccionCRM_Empresa] CHECK (([IdProspecto] IS NOT NULL AND [IdCliente] IS NULL) OR ([IdProspecto] IS NULL AND [IdCliente] IS NOT NULL)),
    CONSTRAINT [FK_InteraccionCRM_Prospecto] FOREIGN KEY ([IdProspecto]) REFERENCES [dbo].[Prospecto] ([IdProspecto]),
    CONSTRAINT [FK_InteraccionCRM_Usuario] FOREIGN KEY ([IdUsuario]) REFERENCES [dbo].[Usuario] ([IdUsuario]),
    CONSTRAINT [FK_InteraccionCRM_Cliente] FOREIGN KEY ([IdCliente]) REFERENCES [dbo].[Cliente] ([IdCliente]),
    CONSTRAINT [FK_InteraccionCRM_Contacto] FOREIGN KEY ([IdContactoEmpresa]) REFERENCES [dbo].[ContactoEmpresa] ([IdContactoEmpresa]),
    CONSTRAINT [FK_InteraccionCRM_Cotizacion] FOREIGN KEY ([IdCotizacion]) REFERENCES [dbo].[Cotizacion] ([IdCotizacion])
);


GO
CREATE NONCLUSTERED INDEX [IX_InteraccionCRM_IdProspecto]
    ON [dbo].[InteraccionCRM]([IdProspecto] ASC);

